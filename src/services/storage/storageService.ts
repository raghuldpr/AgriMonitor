/**
 * AgriMonitor Local Storage Service (Phase 1 Skeleton)
 *
 * Prepared for offline local persistence using AsyncStorage:
 * - Sensor historical readings
 * - Alert history
 * - User settings & thresholds
 * - Manual pH input
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AgricultureTelemetry } from '../../types/telemetry';

const STORAGE_KEYS = {
  SETTINGS: '@agrimonitor_settings',
  MANUAL_PH: '@agrimonitor_manual_ph',
  RECENT_TELEMETRY: '@agrimonitor_recent_telemetry',
  ALERT_HISTORY: '@agrimonitor_alert_history',
};

export class StorageService {
  /**
   * Save manual pH value
   */
  public static async saveManualPh(ph: number): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.MANUAL_PH, ph.toString());
    } catch (e) {
      console.warn('[StorageService] Error saving manual pH:', e);
    }
  }

  /**
   * Load manual pH value
   */
  public static async getManualPh(defaultValue = 6.5): Promise<number> {
    try {
      const val = await AsyncStorage.getItem(STORAGE_KEYS.MANUAL_PH);
      return val ? parseFloat(val) : defaultValue;
    } catch (e) {
      console.warn('[StorageService] Error getting manual pH:', e);
      return defaultValue;
    }
  }

  /**
   * Placeholder for appending sensor telemetry reading to local history
   */
  public static async appendTelemetry(telemetry: AgricultureTelemetry): Promise<void> {
    // Phase 1 skeleton - full history storage to be implemented in Phase 2
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.RECENT_TELEMETRY, JSON.stringify(telemetry));
    } catch (e) {
      console.warn('[StorageService] Error saving telemetry:', e);
    }
  }
}
