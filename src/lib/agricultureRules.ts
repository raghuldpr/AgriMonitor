/**
 * AgriMonitor Deterministic Agriculture Rule Engine (Phase 3)
 *
 * Evaluates raw sensor telemetry against configurable agricultural thresholds.
 *
 * NOTE ON THRESHOLDS:
 * These values are PROTOTYPE DEFAULTS and NOT universal agricultural standards.
 * Agronomic requirements vary by crop species, phenological stage, soil texture,
 * climate zone, and irrigation setup.
 */

import { AgricultureTelemetry } from '../types/telemetry';
import {
  AgricultureThresholds,
  ParameterRuleResult,
  AlertSeverity,
  AgricultureAlert,
  TelemetryEvaluation,
} from '../services/alerts/alertTypes';
import { generateAgricultureInsights } from './insights';

// Default Prototype Threshold Configuration
export const DEFAULT_THRESHOLDS: AgricultureThresholds = {
  temperature: {
    extremeLow: 5.0,  // °C
    low: 15.0,        // °C
    high: 35.0,       // °C
    extremeHigh: 40.0 // °C
  },
  soilMoisture: {
    veryLow: 20.0,    // %
    low: 30.0,        // %
    high: 70.0,       // %
    saturated: 85.0   // %
  },
  tds: {
    low: 200,         // ppm
    high: 1200,       // ppm
    extremeHigh: 2000 // ppm
  },
  humidity: {
    low: 30.0,        // %
    high: 80.0        // %
  },
};

/**
 * 1. Evaluate Temperature
 */
export function evaluateTemperature(
  temp: number,
  thresholds: AgricultureThresholds['temperature'] = DEFAULT_THRESHOLDS.temperature
): ParameterRuleResult {
  if (temp < thresholds.extremeLow) {
    return {
      parameter: 'temperature',
      status: 'VERY_LOW',
      severity: 'CRITICAL',
      value: temp,
      message: `Temperature is critically low (${temp}°C < ${thresholds.extremeLow}°C). Possible frost hazard; monitor crop shelter.`,
      isAbnormal: true,
    };
  }
  if (temp < thresholds.low) {
    return {
      parameter: 'temperature',
      status: 'LOW',
      severity: 'WARNING',
      value: temp,
      message: `Temperature is relatively low (${temp}°C < ${thresholds.low}°C). Check crop-specific thermal requirements.`,
      isAbnormal: true,
    };
  }
  if (temp > thresholds.extremeHigh) {
    return {
      parameter: 'temperature',
      status: 'VERY_HIGH',
      severity: 'CRITICAL',
      value: temp,
      message: `Temperature is critically high (${temp}°C > ${thresholds.extremeHigh}°C). Severe heat stress possible; check irrigation and shading.`,
      isAbnormal: true,
    };
  }
  if (temp > thresholds.high) {
    return {
      parameter: 'temperature',
      status: 'HIGH',
      severity: 'WARNING',
      value: temp,
      message: `Temperature is relatively high (${temp}°C > ${thresholds.high}°C). Monitor crop water requirements and potential heat stress.`,
      isAbnormal: true,
    };
  }

  return {
    parameter: 'temperature',
    status: 'NORMAL',
    severity: 'INFO',
    value: temp,
    message: `Temperature is within the configured normal range (${temp}°C).`,
    isAbnormal: false,
  };
}

/**
 * 2. Evaluate Soil Moisture
 */
export function evaluateSoilMoisture(
  soil: number,
  thresholds: AgricultureThresholds['soilMoisture'] = DEFAULT_THRESHOLDS.soilMoisture
): ParameterRuleResult {
  if (soil < thresholds.veryLow) {
    return {
      parameter: 'soilMoisture',
      status: 'VERY_LOW',
      severity: 'CRITICAL',
      value: soil,
      message: `Soil moisture is very low (${soil}% < ${thresholds.veryLow}%). Vegetative drought stress likely; check irrigation immediately.`,
      isAbnormal: true,
    };
  }
  if (soil < thresholds.low) {
    return {
      parameter: 'soilMoisture',
      status: 'LOW',
      severity: 'WARNING',
      value: soil,
      message: `Soil moisture is relatively low (${soil}% < ${thresholds.low}%). Check irrigation requirements.`,
      isAbnormal: true,
    };
  }
  if (soil > thresholds.saturated) {
    return {
      parameter: 'soilMoisture',
      status: 'SATURATED',
      severity: 'WARNING',
      value: soil,
      message: `Soil moisture indicates saturated conditions (${soil}% > ${thresholds.saturated}%). Watch for waterlogging and root aeration constraints.`,
      isAbnormal: true,
    };
  }
  if (soil > thresholds.high) {
    return {
      parameter: 'soilMoisture',
      status: 'HIGH',
      severity: 'INFO',
      value: soil,
      message: `Soil moisture is relatively high (${soil}%). Adequate for high-demand stages; avoid over-watering.`,
      isAbnormal: false,
    };
  }

  return {
    parameter: 'soilMoisture',
    status: 'NORMAL',
    severity: 'INFO',
    value: soil,
    message: `Soil moisture is within the configured optimal range (${soil}%).`,
    isAbnormal: false,
  };
}

/**
 * 3. Evaluate TDS (Total Dissolved Solids / Mineral Conductivity Index)
 *
 * NOTE: TDS indicates mineral electrical conductivity, not specific N/P/K nutrient levels.
 */
export function evaluateTds(
  tds: number,
  thresholds: AgricultureThresholds['tds'] = DEFAULT_THRESHOLDS.tds
): ParameterRuleResult {
  if (tds < thresholds.low) {
    return {
      parameter: 'tds',
      status: 'LOW',
      severity: 'WARNING',
      value: tds,
      message: `Low dissolved-solids reading (${tds} ppm < ${thresholds.low} ppm). This may indicate low mineral ion concentration in the solution. Consider soil testing.`,
      isAbnormal: true,
    };
  }
  if (tds > thresholds.extremeHigh) {
    return {
      parameter: 'tds',
      status: 'VERY_HIGH',
      severity: 'CRITICAL',
      value: tds,
      message: `Very high dissolved-solids reading (${tds} ppm > ${thresholds.extremeHigh} ppm). Elevated salinity index; potential osmotic root stress.`,
      isAbnormal: true,
    };
  }
  if (tds > thresholds.high) {
    return {
      parameter: 'tds',
      status: 'HIGH',
      severity: 'WARNING',
      value: tds,
      message: `High dissolved-solids reading (${tds} ppm > ${thresholds.high} ppm). Indicates elevated dissolved mineral concentration; check source water quality.`,
      isAbnormal: true,
    };
  }

  return {
    parameter: 'tds',
    status: 'NORMAL',
    severity: 'INFO',
    value: tds,
    message: `Dissolved-solids reading is within configured baseline range (${tds} ppm).`,
    isAbnormal: false,
  };
}

/**
 * 4. Evaluate Relative Humidity
 */
export function evaluateHumidity(
  humidity: number,
  thresholds: AgricultureThresholds['humidity'] = DEFAULT_THRESHOLDS.humidity
): ParameterRuleResult {
  if (humidity < thresholds.low) {
    return {
      parameter: 'humidity',
      status: 'LOW',
      severity: 'INFO',
      value: humidity,
      message: `Relative humidity is relatively low (${humidity}% < ${thresholds.low}%). Increased plant transpiration possible.`,
      isAbnormal: true,
    };
  }
  if (humidity > thresholds.high) {
    return {
      parameter: 'humidity',
      status: 'HIGH',
      severity: 'INFO',
      value: humidity,
      message: `Relative humidity is relatively high (${humidity}% > ${thresholds.high}%). Monitor canopy ventilation and dampness conditions.`,
      isAbnormal: true,
    };
  }

  return {
    parameter: 'humidity',
    status: 'NORMAL',
    severity: 'INFO',
    value: humidity,
    message: `Relative humidity is within typical range (${humidity}%).`,
    isAbnormal: false,
  };
}

/**
 * Unified Telemetry Evaluation
 * Pure, deterministic evaluation of all sensor streams.
 */
export function evaluateAgricultureTelemetry(
  telemetry: AgricultureTelemetry,
  thresholds: AgricultureThresholds = DEFAULT_THRESHOLDS
): TelemetryEvaluation {
  const tempEval = evaluateTemperature(telemetry.temperature, thresholds.temperature);
  const soilEval = evaluateSoilMoisture(telemetry.soilMoisture, thresholds.soilMoisture);
  const tdsEval = evaluateTds(telemetry.tds, thresholds.tds);
  const humEval = evaluateHumidity(telemetry.humidity, thresholds.humidity);

  // Compute overall status severity
  const evals = [tempEval, soilEval, tdsEval, humEval];
  let overallStatus: AlertSeverity = 'INFO';

  if (evals.some((e) => e.severity === 'CRITICAL')) {
    overallStatus = 'CRITICAL';
  } else if (evals.some((e) => e.severity === 'WARNING')) {
    overallStatus = 'WARNING';
  }

  // Active alerts for abnormal conditions
  const activeAlerts: AgricultureAlert[] = [];
  evals.forEach((e) => {
    if (e.isAbnormal && e.severity !== 'INFO') {
      activeAlerts.push({
        id: `alert_${e.parameter}_${e.status.toLowerCase()}`,
        parameter: e.parameter,
        status: e.status,
        severity: e.severity,
        value: e.value,
        message: e.message,
        timestamp: telemetry.timestamp,
        isRecovery: false,
      });
    }
  });

  // Generate actionable agronomic insights
  const insights = generateAgricultureInsights(evals, telemetry);

  return {
    temperature: tempEval,
    humidity: humEval,
    soilMoisture: soilEval,
    tds: tdsEval,
    overallStatus,
    activeAlerts,
    insights,
    timestamp: telemetry.timestamp,
  };
}
