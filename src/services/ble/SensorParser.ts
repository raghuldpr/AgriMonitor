/**
 * AgriMonitor Sensor Data Parser (Phase 1)
 *
 * Independent validator and parser converting raw BLE payloads (JSON)
 * into strictly typed, verified AgricultureTelemetry objects.
 */

import { AgricultureTelemetry } from '../../types/telemetry';

export class SensorParser {
  // Plausible technical sensor bounds
  private static readonly BOUNDS = {
    TEMP_MIN: -40.0,
    TEMP_MAX: 80.0,
    HUM_MIN: 0.0,
    HUM_MAX: 100.0,
    SOIL_MIN: 0.0,
    SOIL_MAX: 100.0,
    TDS_MIN: 0,
    TDS_MAX: 5000,
  };

  /**
   * Parse and strictly validate incoming JSON string from BLE notification
   * Expected format:
   * {
   *   "temperature": 28.5,
   *   "humidity": 65,
   *   "soilMoisture": 45,
   *   "tds": 580
   * }
   */
  public static parseJsonPayload(rawText: string): AgricultureTelemetry | null {
    if (!rawText || typeof rawText !== 'string') {
      return null;
    }

    const trimmed = rawText.trim();
    if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
      return null;
    }

    let parsed: any;
    try {
      parsed = JSON.parse(trimmed);
    } catch (e) {
      console.warn('[SensorParser] Malformed JSON syntax received from BLE:', rawText);
      return null;
    }

    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }

    // Extract fields (supporting primary names and short aliases if firmware needs)
    const rawTemp = parsed.temperature ?? parsed.temp;
    const rawHum = parsed.humidity ?? parsed.hum;
    const rawSoil = parsed.soilMoisture ?? parsed.soil;
    const rawTds = parsed.tds;

    // Check existence
    if (
      rawTemp === undefined ||
      rawHum === undefined ||
      rawSoil === undefined ||
      rawTds === undefined
    ) {
      console.warn('[SensorParser] Packet missing required fields:', parsed);
      return null;
    }

    // Validate numbers and finiteness
    const temp = Number(rawTemp);
    const hum = Number(rawHum);
    const soil = Number(rawSoil);
    const tds = Number(rawTds);

    if (
      !Number.isFinite(temp) ||
      !Number.isFinite(hum) ||
      !Number.isFinite(soil) ||
      !Number.isFinite(tds)
    ) {
      console.warn('[SensorParser] Non-finite sensor values in packet:', parsed);
      return null;
    }

    // Validate technical sanity bounds
    if (temp < SensorParser.BOUNDS.TEMP_MIN || temp > SensorParser.BOUNDS.TEMP_MAX) {
      console.warn(`[SensorParser] Temperature out of bounds (${temp}°C):`, parsed);
      return null;
    }

    if (hum < SensorParser.BOUNDS.HUM_MIN || hum > SensorParser.BOUNDS.HUM_MAX) {
      console.warn(`[SensorParser] Humidity out of bounds (${hum}%):`, parsed);
      return null;
    }

    if (soil < SensorParser.BOUNDS.SOIL_MIN || soil > SensorParser.BOUNDS.SOIL_MAX) {
      console.warn(`[SensorParser] Soil moisture out of bounds (${soil}%):`, parsed);
      return null;
    }

    if (tds < SensorParser.BOUNDS.TDS_MIN || tds > SensorParser.BOUNDS.TDS_MAX) {
      console.warn(`[SensorParser] TDS out of bounds (${tds} ppm):`, parsed);
      return null;
    }

    return {
      temperature: Number(temp.toFixed(1)),
      humidity: Number(hum.toFixed(1)),
      soilMoisture: Number(soil.toFixed(1)),
      tds: Math.round(tds),
      timestamp: Date.now(),
    };
  }
}
