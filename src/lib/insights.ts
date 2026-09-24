/**
 * AgriMonitor Deterministic Agronomic Insights Generator (Phase 3)
 *
 * Converts parameter evaluations into actionable, educational farming advice.
 */

import { AgricultureTelemetry } from '../types/telemetry';
import { ParameterRuleResult, AgricultureInsight } from '../services/alerts/alertTypes';

export function generateAgricultureInsights(
  evaluations: ParameterRuleResult[],
  telemetry: AgricultureTelemetry
): AgricultureInsight[] {
  const insights: AgricultureInsight[] = [];
  const now = telemetry.timestamp;

  evaluations.forEach((evalResult) => {
    switch (evalResult.parameter) {
      case 'soilMoisture':
        if (evalResult.status === 'VERY_LOW' || evalResult.status === 'LOW') {
          insights.push({
            id: `insight_soil_${evalResult.status.toLowerCase()}`,
            parameter: 'soilMoisture',
            title: 'Low Soil Moisture & Irrigation Advice',
            message: `Soil moisture reading is ${telemetry.soilMoisture}%. Root zone water availability is currently restricted.`,
            recommendation:
              'Schedule irrigation during early morning or evening to minimize evaporative loss. Check soil depth moisture before deep watering.',
            timestamp: now,
          });
        } else if (evalResult.status === 'SATURATED') {
          insights.push({
            id: 'insight_soil_saturated',
            parameter: 'soilMoisture',
            title: 'Saturated Soil & Drainage Management',
            message: `Soil moisture reading is ${telemetry.soilMoisture}%. Soil pores are near full water saturation.`,
            recommendation:
              'Pause irrigation to allow root zone aeration. Check field drainage channels to prevent prolonged waterlogging.',
            timestamp: now,
          });
        } else {
          insights.push({
            id: 'insight_soil_optimal',
            parameter: 'soilMoisture',
            title: 'Optimal Soil Moisture',
            message: `Soil moisture (${telemetry.soilMoisture}%) is in the balanced 40%–70% range.`,
            recommendation:
              'Maintain current irrigation scheduling. Moisture levels support healthy root nutrient transport.',
            timestamp: now,
          });
        }
        break;

      case 'temperature':
        if (evalResult.status === 'HIGH' || evalResult.status === 'VERY_HIGH') {
          insights.push({
            id: `insight_temp_${evalResult.status.toLowerCase()}`,
            parameter: 'temperature',
            title: 'Elevated Temperature & Crop Water Need',
            message: `Ambient temperature has reached ${telemetry.temperature}°C.`,
            recommendation:
              'Elevated temperatures increase crop evapotranspiration. Ensure adequate soil hydration to prevent thermal wilt.',
            timestamp: now,
          });
        } else if (evalResult.status === 'LOW' || evalResult.status === 'VERY_LOW') {
          insights.push({
            id: `insight_temp_${evalResult.status.toLowerCase()}`,
            parameter: 'temperature',
            title: 'Cool Temperature Advisory',
            message: `Ambient temperature is ${telemetry.temperature}°C.`,
            recommendation:
              'Cooler weather slows water uptake and nutrient mobilization. Adjust irrigation frequency accordingly.',
            timestamp: now,
          });
        }
        break;

      case 'tds':
        if (evalResult.status === 'LOW') {
          insights.push({
            id: 'insight_tds_low',
            parameter: 'tds',
            title: 'TDS & Dissolved Mineral Context',
            message: `TDS reading is ${telemetry.tds} ppm, indicating lower overall dissolved mineral salts.`,
            recommendation:
              'TDS reflects total electrical conductivity and dissolved solids. Conduct periodic laboratory soil testing to assess specific N-P-K nutrient levels.',
            timestamp: now,
          });
        } else if (evalResult.status === 'HIGH' || evalResult.status === 'VERY_HIGH') {
          insights.push({
            id: 'insight_tds_high',
            parameter: 'tds',
            title: 'Elevated TDS / Salinity Warning',
            message: `TDS reading is ${telemetry.tds} ppm, indicating elevated dissolved minerals in solution.`,
            recommendation:
              'High dissolved solids may point to mineral salinity or fertilizer buildup. Monitor irrigation water quality and flush root zones if salt crusting occurs.',
            timestamp: now,
          });
        }
        break;

      case 'humidity':
        if (evalResult.status === 'HIGH') {
          insights.push({
            id: 'insight_hum_high',
            parameter: 'humidity',
            title: 'High Humidity & Canopy Aeration',
            message: `Relative humidity is ${telemetry.humidity}%. Prolonged dampness can promote foliar pathogens.`,
            recommendation:
              'Ensure adequate crop spacing and natural airflow. Avoid overhead sprinkler irrigation during high humidity periods.',
            timestamp: now,
          });
        }
        break;
    }
  });

  return insights;
}
