/**
 * AgriMonitor Alert & Rule Engine Domain Models (Phase 3)
 */

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export type AlertParameter = 'temperature' | 'humidity' | 'soilMoisture' | 'tds';

export interface AgricultureAlert {
  id: string;
  parameter: AlertParameter;
  status: string; // e.g. 'LOW', 'VERY_LOW', 'HIGH', 'SATURATED', 'RECOVERED'
  severity: AlertSeverity;
  value: number;
  message: string;
  timestamp: number;
  isRecovery?: boolean;
  acknowledged?: boolean;
}

export interface AgricultureThresholds {
  temperature: {
    extremeLow: number;  // < extremeLow -> CRITICAL
    low: number;         // < low -> WARNING
    high: number;        // > high -> WARNING
    extremeHigh: number; // > extremeHigh -> CRITICAL
  };
  soilMoisture: {
    veryLow: number;     // < veryLow -> CRITICAL
    low: number;         // < low -> WARNING
    high: number;        // > high -> INFO/WARNING
    saturated: number;   // > saturated -> WARNING
  };
  tds: {
    low: number;         // < low -> WARNING (Low dissolved solids)
    high: number;        // > high -> WARNING (High dissolved solids/salinity)
    extremeHigh: number; // > extremeHigh -> CRITICAL
  };
  humidity: {
    low: number;         // < low -> INFO
    high: number;        // > high -> INFO
  };
}

export interface ParameterRuleResult {
  parameter: AlertParameter;
  status: string;
  severity: AlertSeverity;
  value: number;
  message: string;
  isAbnormal: boolean;
}

export interface AgricultureInsight {
  id: string;
  parameter: AlertParameter | 'overall';
  title: string;
  message: string;
  recommendation: string;
  timestamp: number;
}

export interface TelemetryEvaluation {
  temperature: ParameterRuleResult;
  humidity: ParameterRuleResult;
  soilMoisture: ParameterRuleResult;
  tds: ParameterRuleResult;
  overallStatus: AlertSeverity;
  activeAlerts: AgricultureAlert[];
  insights: AgricultureInsight[];
  timestamp: number;
}
