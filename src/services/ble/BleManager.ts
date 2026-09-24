/**
 * AgriMonitor BLE Manager
 * Central Bluetooth Low Energy manager for ESP32 agriculture telemetry.
 * Adapted from Healthiva BLE state machine with React Native Android BLE compatibility.
 */

import {
  AGRIMONITOR_BLE_CONFIG,
  AGRIMONITOR_SERVICE_UUID,
  AGRIMONITOR_DATA_CHAR_UUID,
  AGRIMONITOR_CONTROL_CHAR_UUID,
} from './bleConfig';
import { SensorParser } from './SensorParser';
import { requestAndroidBlePermissions } from './blePermissions';
import {
  AgricultureSensorData,
  BleConnectionStatus,
  BleDeviceDescriptor,
} from '../../types/telemetry';

export type SensorDataCallback = (data: AgricultureSensorData) => void;
export type ConnectionStateCallback = (
  status: BleConnectionStatus,
  deviceName: string | null,
  lastReceivedTime: string | null,
  error?: string
) => void;

// Safe Base64 decode helper for React Native
function decodeBase64(base64: string): string {
  try {
    if (typeof atob === 'function') {
      return atob(base64);
    }
    // Simple polyfill fallback
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let str = '';
    let i = 0;
    const clean = base64.replace(/[^A-Za-z0-9\+\/\=]/g, '');
    while (i < clean.length) {
      const enc1 = chars.indexOf(clean.charAt(i++));
      const enc2 = chars.indexOf(clean.charAt(i++));
      const enc3 = chars.indexOf(clean.charAt(i++));
      const enc4 = chars.indexOf(clean.charAt(i++));
      const chr1 = (enc1 << 2) | (enc2 >> 4);
      const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      const chr3 = ((enc3 & 3) << 6) | enc4;
      str += String.fromCharCode(chr1);
      if (enc3 !== 64 && chr2 !== 0) str += String.fromCharCode(chr2);
      if (enc4 !== 64 && chr3 !== 0) str += String.fromCharCode(chr3);
    }
    return str;
  } catch (e) {
    return '';
  }
}

export class BleManager {
  private static instance: BleManager | null = null;

  private blePlxManager: any = null;
  private connectedDevice: any = null;
  private activeSubscription: any = null;

  private connectionStatus: BleConnectionStatus = 'DISCONNECTED';
  private connectedDeviceName: string | null = null;
  private lastReceivedTimestamp: string | null = null;
  private reconnectAttempts = 0;
  private isUserInitiatedDisconnect = false;
  private currentManualPh = 6.5;

  private sensorDataListeners: Set<SensorDataCallback> = new Set();
  private connectionStateListeners: Set<ConnectionStateCallback> = new Set();

  private simulationInterval: any = null;

  // Last known sensor readings
  private lastData: AgricultureSensorData = {
    temperature: 26.5,
    humidity: 60.0,
    soilMoisture: 45.0,
    tds: 520,
    ph: 6.5,
    battery: 90,
    timestamp: new Date().toISOString(),
  };

  private constructor() {
    this.initBleClient();
  }

  public static getInstance(): BleManager {
    if (!BleManager.instance) {
      BleManager.instance = new BleManager();
    }
    return BleManager.instance;
  }

  private initBleClient() {
    try {
      // Lazy load react-native-ble-plx if available in native runtime
      const { BleManager: BlePlx } = require('react-native-ble-plx');
      this.blePlxManager = new BlePlx();
    } catch (e) {
      console.log('[BleManager] Native BLE module not found or running in web/Expo Go mode. Simulation ready.');
    }
  }

  public setManualPh(ph: number) {
    this.currentManualPh = ph;
    this.lastData.ph = ph;
  }

  public getManualPh(): number {
    return this.currentManualPh;
  }

  public getConnectionStatus(): BleConnectionStatus {
    return this.connectionStatus;
  }

  public getLastData(): AgricultureSensorData {
    return this.lastData;
  }

  public getConnectedDeviceName(): string | null {
    return this.connectedDeviceName;
  }

  public subscribeSensorData(cb: SensorDataCallback): () => void {
    this.sensorDataListeners.add(cb);
    return () => this.sensorDataListeners.delete(cb);
  }

  public subscribeConnectionState(cb: ConnectionStateCallback): () => void {
    this.connectionStateListeners.add(cb);
    cb(this.connectionStatus, this.connectedDeviceName, this.lastReceivedTimestamp);
    return () => this.connectionStateListeners.delete(cb);
  }

  private notifyConnectionState(status: BleConnectionStatus, name: string | null, error?: string) {
    this.connectionStatus = status;
    this.connectedDeviceName = name;
    this.connectionStateListeners.forEach((cb) =>
      cb(status, name, this.lastReceivedTimestamp, error)
    );
  }

  private notifySensorData(data: AgricultureSensorData) {
    this.lastData = data;
    this.lastReceivedTimestamp = data.timestamp;
    this.sensorDataListeners.forEach((cb) => cb(data));
    this.connectionStateListeners.forEach((cb) =>
      cb(this.connectionStatus, this.connectedDeviceName, this.lastReceivedTimestamp)
    );
  }

  /**
   * Scan and Connect to AgriMonitor ESP32 Hardware
   */
  public async connect(targetDeviceId?: string): Promise<boolean> {
    const hasPermissions = await requestAndroidBlePermissions();
    if (!hasPermissions) {
      this.notifyConnectionState('ERROR', null, 'Required Bluetooth and Location permissions were denied.');
      return false;
    }

    this.isUserInitiatedDisconnect = false;
    this.notifyConnectionState('CONNECTING', this.connectedDeviceName || AGRIMONITOR_BLE_CONFIG.DEFAULT_DEVICE_NAME);

    // If native BleManager is available, scan & connect
    if (this.blePlxManager) {
      try {
        if (targetDeviceId) {
          return await this.connectToDeviceId(targetDeviceId);
        }

        return await new Promise<boolean>((resolve) => {
          let timeoutTimer: any = null;

          const finish = (success: boolean) => {
            if (timeoutTimer) clearTimeout(timeoutTimer);
            this.blePlxManager.stopDeviceScan();
            resolve(success);
          };

          timeoutTimer = setTimeout(() => {
            console.warn('[BleManager] Scan timed out without discovering device.');
            this.notifyConnectionState('ERROR', null, 'ESP32 device not found. Ensure device is powered on.');
            finish(false);
          }, AGRIMONITOR_BLE_CONFIG.SCAN_TIMEOUT_MS);

          this.blePlxManager.startDeviceScan(
            [AGRIMONITOR_SERVICE_UUID],
            null,
            async (error: any, device: any) => {
              if (error) {
                console.error('[BleManager] Scan error:', error);
                this.notifyConnectionState('ERROR', null, error.message);
                finish(false);
                return;
              }

              if (device && (device.name?.includes('AgriMonitor') || device.name?.includes('ESP32'))) {
                this.blePlxManager.stopDeviceScan();
                if (timeoutTimer) clearTimeout(timeoutTimer);
                const connected = await this.connectToDeviceId(device.id, device.name);
                resolve(connected);
              }
            }
          );
        });
      } catch (err: any) {
        console.error('[BleManager] Connection failure:', err);
        this.notifyConnectionState('ERROR', null, err.message || 'Connection failed');
        return false;
      }
    } else {
      // Simulation mode fallback
      this.startSimulatedTelemetry();
      this.notifyConnectionState('CONNECTED', 'AgriMonitor Simulated ESP32');
      return true;
    }
  }

  private async connectToDeviceId(deviceId: string, deviceName?: string): Promise<boolean> {
    try {
      const device = await this.blePlxManager.connectToDevice(deviceId, { autoConnect: true });
      this.connectedDevice = device;
      this.connectedDeviceName = deviceName || device.name || AGRIMONITOR_BLE_CONFIG.DEFAULT_DEVICE_NAME;

      await device.discoverAllServicesAndCharacteristics();

      // Monitor disconnected event
      device.onDisconnected((error: any, disconnectedDevice: any) => {
        this.handleDisconnected(error);
      });

      // Subscribe to DATA characteristic notifications
      this.activeSubscription = device.monitorCharacteristicForService(
        AGRIMONITOR_SERVICE_UUID,
        AGRIMONITOR_DATA_CHAR_UUID,
        (error: any, characteristic: any) => {
          if (error) {
            console.warn('[BleManager] Characteristic monitor error:', error);
            return;
          }
          if (characteristic?.value) {
            const rawString = decodeBase64(characteristic.value);
            const parsed = SensorParser.parseJsonPayload(rawString, this.currentManualPh);
            if (parsed) {
              this.notifySensorData(parsed);
            }
          }
        }
      );

      this.reconnectAttempts = 0;
      this.notifyConnectionState('CONNECTED', this.connectedDeviceName);
      return true;
    } catch (e: any) {
      console.error('[BleManager] Device connection error:', e);
      this.notifyConnectionState('ERROR', null, e.message);
      return false;
    }
  }

  public async disconnect(): Promise<void> {
    this.isUserInitiatedDisconnect = true;
    this.stopSimulatedTelemetry();

    if (this.activeSubscription) {
      this.activeSubscription.remove();
      this.activeSubscription = null;
    }

    if (this.connectedDevice) {
      try {
        await this.connectedDevice.cancelConnection();
      } catch (e) {
        console.warn('[BleManager] Error during disconnect:', e);
      }
      this.connectedDevice = null;
    }

    this.notifyConnectionState('DISCONNECTED', null);
  }

  private handleDisconnected(error?: any) {
    this.connectedDevice = null;
    this.activeSubscription = null;

    if (!this.isUserInitiatedDisconnect && this.reconnectAttempts < AGRIMONITOR_BLE_CONFIG.RECONNECT_ATTEMPTS) {
      this.reconnectAttempts++;
      this.notifyConnectionState('RECONNECTING', this.connectedDeviceName);
      setTimeout(() => {
        if (this.connectionStatus === 'RECONNECTING') {
          this.connect();
        }
      }, AGRIMONITOR_BLE_CONFIG.RECONNECT_INTERVAL_MS);
    } else {
      this.notifyConnectionState('DISCONNECTED', null, error?.message);
    }
  }

  /**
   * Simulated Telemetry for testing and verification without physical ESP32
   */
  public startSimulatedTelemetry() {
    this.stopSimulatedTelemetry();
    this.notifyConnectionState('CONNECTED', 'AgriMonitor ESP32 (Simulation)');

    this.simulationInterval = setInterval(() => {
      // Natural sensor jitter
      const t = Number((25.0 + Math.sin(Date.now() / 15000) * 3.5).toFixed(1));
      const h = Number((62.0 + Math.cos(Date.now() / 12000) * 8.0).toFixed(1));
      const sm = Number((42.0 + Math.sin(Date.now() / 20000) * 6.0).toFixed(1));
      const tds = Math.round(520 + Math.cos(Date.now() / 18000) * 45);

      const packet: AgricultureSensorData = {
        temperature: t,
        humidity: h,
        soilMoisture: sm,
        tds: tds,
        ph: this.currentManualPh,
        battery: 88,
        timestamp: new Date().toISOString(),
      };

      this.notifySensorData(packet);
    }, 2500);
  }

  public stopSimulatedTelemetry() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
  }

  public injectTestData(data: Partial<AgricultureSensorData>) {
    const packet: AgricultureSensorData = {
      temperature: data.temperature ?? this.lastData.temperature,
      humidity: data.humidity ?? this.lastData.humidity,
      soilMoisture: data.soilMoisture ?? this.lastData.soilMoisture,
      tds: data.tds ?? this.lastData.tds,
      ph: data.ph ?? this.currentManualPh,
      battery: data.battery ?? this.lastData.battery,
      timestamp: new Date().toISOString(),
    };
    this.notifySensorData(packet);
  }
}
