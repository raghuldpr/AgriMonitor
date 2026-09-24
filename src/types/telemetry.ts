/**
 * AgriMonitor Phase 1 Data Models
 * Clean TypeScript contracts for ESP32 Sensor Telemetry, BLE States, and Device Status.
 */

export interface AgricultureTelemetry {
  temperature: number;  // °C (ambient air temperature)
  humidity: number;     // % (relative air humidity)
  soilMoisture: number; // % (volumetric soil moisture percentage, 0-100)
  tds: number;          // ppm (Total Dissolved Solids / mineral conductivity index)
  timestamp: number;    // Epoch timestamp in milliseconds
}

export type BleConnectionStatus =
  | 'DISCONNECTED'
  | 'SCANNING'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'ERROR';

export interface DeviceStatus {
  connected: boolean;
  deviceId?: string;
  deviceName?: string;
  lastSeen?: number;
}

export interface DiscoveredBleDevice {
  id: string;
  name: string | null;
  rssi?: number | null;
}
