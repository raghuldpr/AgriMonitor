/**
 * AgriMonitor Sensor Data Parser
 * Decouples raw BLE packets (JSON UTF-8 or Binary) from domain models.
 */

import { AgricultureSensorData } from '../../types/telemetry';

export class SensorParser {
  /**
   * Parse UTF-8 JSON text packet transmitted by ESP32
   */
  public static parseJsonPayload(rawText: string, currentPh = 6.5): AgricultureSensorData | null {
    if (!rawText || typeof rawText !== 'string') return null;

    try {
      const trimmed = rawText.trim();
      if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
        return null;
      }

      const parsed = JSON.parse(trimmed);

      // Support canonical names and short aliases from firmware
      const temp = Number(parsed.temperature ?? parsed.temp ?? parsed.t ?? 0);
      const hum = Number(parsed.humidity ?? parsed.hum ?? parsed.h ?? 0);
      const soil = Number(parsed.soilMoisture ?? parsed.soil ?? parsed.sm ?? 0);
      const tds = Number(parsed.tds ?? parsed.ec ?? parsed.ppm ?? 0);
      const ph = parsed.ph !== undefined ? Number(parsed.ph) : currentPh;
      const batt = parsed.battery !== undefined ? Number(parsed.battery) : undefined;

      return {
        temperature: isNaN(temp) ? 0 : Number(temp.toFixed(1)),
        humidity: isNaN(hum) ? 0 : Number(hum.toFixed(1)),
        soilMoisture: isNaN(soil) ? 0 : Math.max(0, Math.min(100, Number(soil.toFixed(1)))),
        tds: isNaN(tds) ? 0 : Math.max(0, Math.round(tds)),
        ph: isNaN(ph) ? currentPh : Number(ph.toFixed(2)),
        battery: batt !== undefined && !isNaN(batt) ? Math.max(0, Math.min(100, Math.round(batt))) : undefined,
        timestamp: new Date().toISOString()
      };
    } catch (e) {
      console.warn('[SensorParser] Failed to parse JSON packet:', e);
      return null;
    }
  }

  /**
   * Parse binary byte buffer fallback:
   * Format:
   * [0..1]: int16 temperature * 100
   * [2..3]: int16 humidity * 100
   * [4..5]: int16 soilMoisture * 100
   * [6..7]: uint16 tds (ppm)
   * [8]:    uint8 battery (optional)
   */
  public static parseBinaryBuffer(buffer: Uint8Array, currentPh = 6.5): AgricultureSensorData | null {
    if (!buffer || buffer.byteLength < 8) return null;

    try {
      const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
      const temp = view.getInt16(0, true) / 100;
      const hum = view.getInt16(2, true) / 100;
      const soil = view.getInt16(4, true) / 100;
      const tds = view.getUint16(6, true);
      const batt = buffer.byteLength >= 9 ? view.getUint8(8) : undefined;

      return {
        temperature: Number(temp.toFixed(1)),
        humidity: Number(hum.toFixed(1)),
        soilMoisture: Math.max(0, Math.min(100, Number(soil.toFixed(1)))),
        tds: Math.max(0, tds),
        ph: currentPh,
        battery: batt,
        timestamp: new Date().toISOString()
      };
    } catch (e) {
      console.warn('[SensorParser] Failed to parse binary packet:', e);
      return null;
    }
  }
}
