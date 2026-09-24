/**
 * AgriMonitor BLE Manager (Phase 1)
 *
 * Central service controlling device scanning, GATT connection,
 * reconnection lifecycle, characteristic notification subscription,
 * and telemetry stream dispatching.
 */

import {
  BLE_CONFIG,
  AGRIMONITOR_SERVICE_UUID,
  AGRIMONITOR_DATA_CHAR_UUID,
} from './bleConfig';
import { SensorParser } from './SensorParser';
import { BlePermissionsService } from './blePermissions';
import {
  AgricultureTelemetry,
  BleConnectionStatus,
  DiscoveredBleDevice,
  DeviceStatus,
} from '../../types/telemetry';

export type TelemetryListener = (telemetry: AgricultureTelemetry) => void;
export type StatusListener = (status: BleConnectionStatus, error?: string) => void;
export type DeviceListListener = (devices: DiscoveredBleDevice[]) => void;

// Safe Base64 decoder
function decodeBase64(base64Str: string): string {
  try {
    if (typeof atob === 'function') {
      return atob(base64Str);
    }
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let str = '';
    let i = 0;
    const clean = base64Str.replace(/[^A-Za-z0-9\+\/\=]/g, '');
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
  } catch {
    return '';
  }
}

export class BleManager {
  private static instance: BleManager | null = null;

  private blePlxClient: any = null;
  private connectedDevice: any = null;
  private dataSubscription: any = null;

  private connectionStatus: BleConnectionStatus = 'DISCONNECTED';
  private discoveredDevices: Map<string, DiscoveredBleDevice> = new Map();
  private reconnectAttempts = 0;
  private isUserInitiatedDisconnect = false;
  private scanTimeoutTimer: any = null;
  private simulationTimer: any = null;

  private latestTelemetry: AgricultureTelemetry | null = null;
  private deviceStatus: DeviceStatus = { connected: false };

  private telemetryListeners: Set<TelemetryListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private deviceListListeners: Set<DeviceListListener> = new Set();

  private constructor() {
    this.initNativeClient();
  }

  public static getInstance(): BleManager {
    if (!BleManager.instance) {
      BleManager.instance = new BleManager();
    }
    return BleManager.instance;
  }

  private initNativeClient() {
    try {
      const { BleManager: BlePlx } = require('react-native-ble-plx');
      this.blePlxClient = new BlePlx();
    } catch {
      console.log('[BleManager] Native BLE module unavailable in current environment. Using simulation mode fallback.');
    }
  }

  // --- STATE ACCESSORS ---
  public getConnectionStatus(): BleConnectionStatus {
    return this.connectionStatus;
  }

  public getDeviceStatus(): DeviceStatus {
    return this.deviceStatus;
  }

  public getLatestTelemetry(): AgricultureTelemetry | null {
    return this.latestTelemetry;
  }

  public getDiscoveredDevices(): DiscoveredBleDevice[] {
    return Array.from(this.discoveredDevices.values());
  }

  // --- SUBSCRIPTION REGISTRATION ---
  public subscribeTelemetry(listener: TelemetryListener): () => void {
    this.telemetryListeners.add(listener);
    if (this.latestTelemetry) {
      listener(this.latestTelemetry);
    }
    return () => this.telemetryListeners.delete(listener);
  }

  public subscribeStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.connectionStatus);
    return () => this.statusListeners.delete(listener);
  }

  public subscribeDiscoveredDevices(listener: DeviceListListener): () => void {
    this.deviceListListeners.add(listener);
    listener(this.getDiscoveredDevices());
    return () => this.deviceListListeners.delete(listener);
  }

  private updateStatus(status: BleConnectionStatus, error?: string) {
    this.connectionStatus = status;
    this.deviceStatus.connected = status === 'CONNECTED';
    this.statusListeners.forEach((fn) => fn(status, error));
  }

  private notifyTelemetry(telemetry: AgricultureTelemetry) {
    this.latestTelemetry = telemetry;
    this.deviceStatus.lastSeen = telemetry.timestamp;
    this.telemetryListeners.forEach((fn) => fn(telemetry));
  }

  private notifyDiscoveredDevices() {
    const list = this.getDiscoveredDevices();
    this.deviceListListeners.forEach((fn) => fn(list));
  }

  // --- SCANNING ---
  public async startScan(): Promise<boolean> {
    const perm = await BlePermissionsService.requestPermissions();
    if (!perm.granted) {
      this.updateStatus('ERROR', perm.message || 'Bluetooth permissions denied');
      return false;
    }

    if (this.connectionStatus === 'SCANNING') {
      return true;
    }

    this.discoveredDevices.clear();
    this.notifyDiscoveredDevices();
    this.updateStatus('SCANNING');

    if (this.blePlxClient) {
      try {
        if (this.scanTimeoutTimer) clearTimeout(this.scanTimeoutTimer);

        this.scanTimeoutTimer = setTimeout(() => {
          this.stopScan();
        }, BLE_CONFIG.SCAN_TIMEOUT_MS);

        this.blePlxClient.startDeviceScan(
          null, // Scan for all BLE peripherals, filtering by name/service UUID
          { allowDuplicates: false },
          (error: any, device: any) => {
            if (error) {
              console.warn('[BleManager] Scan error:', error);
              this.stopScan();
              this.updateStatus('ERROR', error.message);
              return;
            }

            if (device && device.id) {
              const name = device.name || device.localName || null;
              this.discoveredDevices.set(device.id, {
                id: device.id,
                name: name,
                rssi: device.rssi,
              });
              this.notifyDiscoveredDevices();
            }
          }
        );
        return true;
      } catch (err: any) {
        this.updateStatus('ERROR', err.message);
        return false;
      }
    } else {
      // Simulated scan for development environment
      setTimeout(() => {
        this.discoveredDevices.set('SIM-AGRI-001', {
          id: 'SIM-AGRI-001',
          name: 'AgriMonitor-ESP32 (Simulated)',
          rssi: -65,
        });
        this.notifyDiscoveredDevices();
        this.stopScan();
      }, 1500);
      return true;
    }
  }

  public stopScan() {
    if (this.scanTimeoutTimer) {
      clearTimeout(this.scanTimeoutTimer);
      this.scanTimeoutTimer = null;
    }

    if (this.blePlxClient) {
      try {
        this.blePlxClient.stopDeviceScan();
      } catch (e) {
        console.warn('[BleManager] Error stopping device scan:', e);
      }
    }

    if (this.connectionStatus === 'SCANNING') {
      this.updateStatus('DISCONNECTED');
    }
  }

  // --- CONNECTION ---
  public async connect(deviceId: string): Promise<boolean> {
    this.stopScan();
    this.isUserInitiatedDisconnect = false;
    this.updateStatus('CONNECTING');

    if (deviceId.startsWith('SIM-') || !this.blePlxClient) {
      // Simulated connection for testing and verification
      this.deviceStatus = {
        connected: true,
        deviceId: deviceId,
        deviceName: 'AgriMonitor-ESP32 (Simulated)',
        lastSeen: Date.now(),
      };
      this.startSimulationStream();
      this.updateStatus('CONNECTED');
      return true;
    }

    try {
      const device = await this.blePlxClient.connectToDevice(deviceId, {
        autoConnect: false,
        timeout: BLE_CONFIG.CONNECT_TIMEOUT_MS,
      });

      this.connectedDevice = device;
      this.deviceStatus = {
        connected: true,
        deviceId: device.id,
        deviceName: device.name || BLE_CONFIG.DEFAULT_DEVICE_NAME,
        lastSeen: Date.now(),
      };

      // Disconnect listener
      device.onDisconnected((error: any) => {
        this.handleDisconnected(deviceId, error);
      });

      // Discover GATT Services & Characteristics
      await device.discoverAllServicesAndCharacteristics();

      // Subscribe to telemetry notification characteristic
      this.dataSubscription = device.monitorCharacteristicForService(
        AGRIMONITOR_SERVICE_UUID,
        AGRIMONITOR_DATA_CHAR_UUID,
        (error: any, characteristic: any) => {
          if (error) {
            console.warn('[BleManager] Characteristic notify error:', error);
            return;
          }
          if (characteristic?.value) {
            const rawJson = decodeBase64(characteristic.value);
            const telemetry = SensorParser.parseJsonPayload(rawJson);
            if (telemetry) {
              this.notifyTelemetry(telemetry);
            }
          }
        }
      );

      this.reconnectAttempts = 0;
      this.updateStatus('CONNECTED');
      return true;
    } catch (err: any) {
      console.error('[BleManager] Connection failed:', err);
      this.updateStatus('ERROR', err?.message || 'Failed to connect to device');
      return false;
    }
  }

  public async disconnect(): Promise<void> {
    this.isUserInitiatedDisconnect = true;
    this.stopSimulationStream();

    if (this.dataSubscription) {
      this.dataSubscription.remove();
      this.dataSubscription = null;
    }

    if (this.connectedDevice) {
      try {
        await this.connectedDevice.cancelConnection();
      } catch (e) {
        console.warn('[BleManager] Error during disconnect:', e);
      }
      this.connectedDevice = null;
    }

    this.deviceStatus.connected = false;
    this.updateStatus('DISCONNECTED');
  }

  // --- RECONNECTION STRATEGY ---
  private handleDisconnected(deviceId: string, error?: any) {
    this.connectedDevice = null;
    this.dataSubscription = null;
    this.deviceStatus.connected = false;

    if (!this.isUserInitiatedDisconnect && this.reconnectAttempts < BLE_CONFIG.MAX_RECONNECT_ATTEMPTS) {
      this.reconnectAttempts++;
      this.updateStatus(
        'RECONNECTING',
        `Connection lost. Reconnecting attempt ${this.reconnectAttempts} of ${BLE_CONFIG.MAX_RECONNECT_ATTEMPTS}...`
      );

      setTimeout(() => {
        if (this.connectionStatus === 'RECONNECTING') {
          this.connect(deviceId);
        }
      }, BLE_CONFIG.RECONNECT_INTERVAL_MS);
    } else {
      this.reconnectAttempts = 0;
      this.updateStatus('DISCONNECTED', error?.message || 'Device disconnected');
    }
  }

  // --- DEVELOPMENT TEST / SIMULATION UTILITIES ---
  public startSimulationStream() {
    this.stopSimulationStream();
    this.simulationTimer = setInterval(() => {
      // Natural oscillating readings
      const baseTemp = 28.5 + Math.sin(Date.now() / 10000) * 2.0;
      const baseHum = 65.0 + Math.cos(Date.now() / 8000) * 5.0;
      const baseSoil = 45.0 + Math.sin(Date.now() / 15000) * 4.0;
      const baseTds = 580 + Math.round(Math.cos(Date.now() / 12000) * 30);

      const packet = {
        temperature: Number(baseTemp.toFixed(1)),
        humidity: Number(baseHum.toFixed(1)),
        soilMoisture: Number(baseSoil.toFixed(1)),
        tds: baseTds,
      };

      const json = JSON.stringify(packet);
      const parsed = SensorParser.parseJsonPayload(json);
      if (parsed) {
        this.notifyTelemetry(parsed);
      }
    }, 2000);
  }

  public stopSimulationStream() {
    if (this.simulationTimer) {
      clearInterval(this.simulationTimer);
      this.simulationTimer = null;
    }
  }

  public injectRawPacket(rawPayload: string): boolean {
    const parsed = SensorParser.parseJsonPayload(rawPayload);
    if (parsed) {
      this.notifyTelemetry(parsed);
      return true;
    }
    return false;
  }
}
