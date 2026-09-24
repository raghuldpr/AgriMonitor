/**
 * AgriMonitor Telemetry Hook (Phase 2)
 *
 * Custom React hook establishing the reactive bridge between BleManager,
 * local persistence, and Dashboard UI.
 *
 * Pipeline: BleManager -> SensorParser -> useTelemetry -> Dashboard UI
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { BleManager } from '../services/ble/BleManager';
import { AlertManager } from '../services/alerts/AlertManager';
import { StorageService } from '../services/storage/storageService';
import {
  AgricultureTelemetry,
  BleConnectionStatus,
  DiscoveredBleDevice,
  DeviceStatus,
} from '../types/telemetry';

export interface UseTelemetryReturn {
  telemetry: AgricultureTelemetry | null;
  previousTelemetry: AgricultureTelemetry | null;
  connectionStatus: BleConnectionStatus;
  deviceStatus: DeviceStatus;
  errorMessage: string | null;
  discoveredDevices: DiscoveredBleDevice[];
  lastUpdatedFormatted: string;
  secondsSinceLastUpdate: number | null;
  isStale: boolean;
  hasData: boolean;
  connect: (deviceId?: string) => Promise<boolean>;
  disconnect: () => Promise<void>;
  startScan: () => Promise<boolean>;
  stopScan: () => void;
  injectMockReading: (data: Partial<AgricultureTelemetry>) => void;
}

export function useTelemetry(): UseTelemetryReturn {
  const ble = BleManager.getInstance();

  const [telemetry, setTelemetry] = useState<AgricultureTelemetry | null>(ble.getLatestTelemetry());
  const [previousTelemetry, setPreviousTelemetry] = useState<AgricultureTelemetry | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<BleConnectionStatus>(ble.getConnectionStatus());
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>(ble.getDeviceStatus());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [discoveredDevices, setDiscoveredDevices] = useState<DiscoveredBleDevice[]>(ble.getDiscoveredDevices());
  const [secondsSinceLastUpdate, setSecondsSinceLastUpdate] = useState<number | null>(null);

  const lastTimestampRef = useRef<number | null>(telemetry?.timestamp ?? null);

  // Subscribe to BleManager events
  useEffect(() => {
    const unsubTelemetry = ble.subscribeTelemetry((newTelemetry) => {
      setPreviousTelemetry(telemetry);
      setTelemetry(newTelemetry);
      lastTimestampRef.current = newTelemetry.timestamp;
      setDeviceStatus(ble.getDeviceStatus());

      // Process through Agriculture Rule Engine & Alert Manager
      AlertManager.getInstance().processTelemetry(newTelemetry);

      // Persist latest telemetry asynchronously
      StorageService.appendTelemetry(newTelemetry).catch(console.warn);
    });

    const unsubStatus = ble.subscribeStatus((status, error) => {
      setConnectionStatus(status);
      setDeviceStatus(ble.getDeviceStatus());
      setErrorMessage(error ?? null);
    });

    const unsubDevices = ble.subscribeDiscoveredDevices((devices) => {
      setDiscoveredDevices(devices);
    });

    return () => {
      unsubTelemetry();
      unsubStatus();
      unsubDevices();
    };
  }, []);

  // Update timer tick for seconds since last received packet
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastTimestampRef.current) {
        const diffSec = Math.max(0, Math.floor((Date.now() - lastTimestampRef.current) / 1000));
        setSecondsSinceLastUpdate(diffSec);
      } else {
        setSecondsSinceLastUpdate(null);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const connect = useCallback(async (deviceId?: string) => {
    setErrorMessage(null);
    if (deviceId) {
      return await ble.connect(deviceId);
    }
    // If no target deviceId provided, try scanning & connecting
    return await ble.connect('SIM-AGRI-001');
  }, [ble]);

  const disconnect = useCallback(async () => {
    await ble.disconnect();
  }, [ble]);

  const startScan = useCallback(async () => {
    setErrorMessage(null);
    return await ble.startScan();
  }, [ble]);

  const stopScan = useCallback(() => {
    ble.stopScan();
  }, [ble]);

  const injectMockReading = useCallback((partial: Partial<AgricultureTelemetry>) => {
    const base = telemetry || {
      temperature: 28.5,
      humidity: 65.0,
      soilMoisture: 45.0,
      tds: 580,
      timestamp: Date.now(),
    };

    const packet = {
      temperature: partial.temperature ?? base.temperature,
      humidity: partial.humidity ?? base.humidity,
      soilMoisture: partial.soilMoisture ?? base.soilMoisture,
      tds: partial.tds ?? base.tds,
    };

    ble.injectRawPacket(JSON.stringify(packet));
  }, [ble, telemetry]);

  const lastUpdatedFormatted = telemetry
    ? new Date(telemetry.timestamp).toLocaleTimeString()
    : 'Waiting for sensor data...';

  // Stale threshold: connected but no packet for > 8 seconds
  const isStale = Boolean(
    connectionStatus === 'CONNECTED' &&
    secondsSinceLastUpdate !== null &&
    secondsSinceLastUpdate > 8
  );

  return {
    telemetry,
    previousTelemetry,
    connectionStatus,
    deviceStatus,
    errorMessage,
    discoveredDevices,
    lastUpdatedFormatted,
    secondsSinceLastUpdate,
    isStale,
    hasData: telemetry !== null,
    connect,
    disconnect,
    startScan,
    stopScan,
    injectMockReading,
  };
}
