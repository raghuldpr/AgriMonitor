/**
 * AgriMonitor Telemetry & Domain Data Models
 * Clean TypeScript contracts for ESP32 Sensor Telemetry, BLE States, and Agriculture Insights
 */

export interface AgricultureSensorData {
  temperature: number;      // °C (e.g. 26.5)
  humidity: number;         // % (e.g. 62.0)
  soilMoisture: number;     // % (e.g. 45.0)
  tds: number;              // ppm (e.g. 520 - Total Dissolved Solids / Mineral conductivity indicator)
  ph?: number;              // Soil pH (manual input or sensor fallback, e.g. 6.5)
  battery?: number;         // % (e.g. 85)
  timestamp: string;        // ISO 8601 string
}

export type BleConnectionStatus = 
  | 'DISCONNECTED' 
  | 'CONNECTING' 
  | 'CONNECTED' 
  | 'RECONNECTING' 
  | 'ERROR';

export interface BleDeviceDescriptor {
  id: string;
  name: string | null;
  rssi?: number | null;
}

export type SeverityLevel = 'OPTIMAL' | 'MODERATE' | 'WARNING' | 'CRITICAL';

export interface ParameterEvaluation {
  parameter: 'temperature' | 'humidity' | 'soilMoisture' | 'tds' | 'ph';
  status: string;
  severity: SeverityLevel;
  valueDisplay: string;
  shortMessage: string;
  description: string;
}

export interface AgricultureAlert {
  id: string;
  timestamp: string;
  parameter: 'temperature' | 'humidity' | 'soilMoisture' | 'tds' | 'ph' | 'system';
  severity: SeverityLevel;
  title: string;
  message: string;
  acknowledged: boolean;
}

export interface AgricultureInsight {
  id: string;
  timestamp: string;
  category: 'IRRIGATION' | 'CLIMATE' | 'SOIL_MINERALS' | 'GENERAL';
  title: string;
  detail: string;
  actionableRecommendation: string;
}
