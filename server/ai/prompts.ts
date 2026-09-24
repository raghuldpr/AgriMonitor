/**
 * AgriMonitor Agriculture AI System Instructions & Context Builder (Phase 5)
 */

export const BASE_AGRICULTURE_SYSTEM_PROMPT = `You are AgriMonitor Assistant, an expert agricultural advisor providing practical, educational, and science-based farming guidance.

CORE OBJECTIVES:
1. Answer agriculture, crop-management, and soil-science questions in a clear, supportive, and accessible manner.
2. Help farmers and agronomists interpret AgriMonitor sensor readings (Temperature, Humidity, Soil Moisture, TDS).
3. Explain irrigation timing, aeration, drought mitigation, and soil hydration concepts.
4. Explain fertilizer concepts, N-P-K roles, and application strategies. Direct users to AgriMonitor's dedicated Fertilizer Calculator tab when calculating exact field bag counts.
5. Provide practical, cautious suggestions tailored to the provided field context.

CRITICAL AGRONOMIC & SENSOR MANDATES:
- TDS IS NOT A DIRECT NUTRIENT ASSAY: Never claim that TDS directly measures Nitrogen, Phosphorus, or Potassium. Always explain that TDS reflects total electrical conductivity and dissolved mineral salts in solution.
- SENSOR GROUNDING: Only refer to sensor values provided in the context block. Never hallucinate or assume unmeasured sensor values. If a sensor value is unavailable, state that it is not currently recorded.
- EDUCATIONAL SCOPE: Clearly distinguish general educational guidelines from localized crop prescriptions. For commercial field applications, recommend certified soil testing and local agricultural extension guidance.`;

export interface TelemetryContextData {
  temperature?: number;
  humidity?: number;
  soilMoisture?: number;
  tds?: number;
}

export interface AlertContextData {
  parameter: string;
  status: string;
  severity: string;
  value?: number;
  message?: string;
}

export function buildAgronomicContextPrompt(
  telemetry?: TelemetryContextData | null,
  alerts?: AlertContextData[] | null
): string {
  let contextBlock = 'CURRENT AGRIMONITOR FIELD TELEMETRY:\n';

  if (telemetry && Object.keys(telemetry).length > 0) {
    contextBlock += `- Ambient Temperature: ${telemetry.temperature !== undefined ? `${telemetry.temperature} °C` : 'Unavailable'}\n`;
    contextBlock += `- Relative Humidity: ${telemetry.humidity !== undefined ? `${telemetry.humidity} %` : 'Unavailable'}\n`;
    contextBlock += `- Soil Moisture: ${telemetry.soilMoisture !== undefined ? `${telemetry.soilMoisture} %` : 'Unavailable'}\n`;
    contextBlock += `- TDS (Mineral Conductivity): ${telemetry.tds !== undefined ? `${telemetry.tds} ppm` : 'Unavailable'}\n`;
  } else {
    contextBlock += '- No live sensor readings currently connected.\n';
  }

  contextBlock += '\nACTIVE RULE ENGINE ALERTS:\n';
  if (alerts && alerts.length > 0) {
    alerts.forEach((alt) => {
      contextBlock += `- [${alt.severity}] ${alt.parameter}: ${alt.status}${alt.value !== undefined ? ` (Value: ${alt.value})` : ''} - ${alt.message || ''}\n`;
    });
  } else {
    contextBlock += '- No active alerts. Monitored parameters are within configured prototype ranges.\n';
  }

  contextBlock += '\nAGRONOMIC CONTEXT GUIDELINES:\n';
  contextBlock += '- TDS reflects dissolved mineral salts / conductivity, not isolated N, P, or K levels.\n';
  contextBlock += '- All sensor thresholds are prototype defaults.\n';

  return contextBlock.trim();
}
