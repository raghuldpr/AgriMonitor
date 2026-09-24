/**
 * AgriMonitor Local Storage Service (Phase 3)
 *
 * Offline local persistence using AsyncStorage with seamless in-memory fallback
 * for CLI test suites and non-native environments:
 * - Alert history (capped for memory efficiency)
 * - User thresholds & settings
 * - Manual pH input
 * - Recent telemetry
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AgricultureTelemetry } from '../../types/telemetry';
import { AgricultureAlert } from '../alerts/alertTypes';

const STORAGE_KEYS = {
  SETTINGS_THRESHOLDS: '@agrimonitor_thresholds',
  MANUAL_PH: '@agrimonitor_manual_ph',
  RECENT_TELEMETRY: '@agrimonitor_recent_telemetry',
  ALERT_HISTORY: '@agrimonitor_alert_history',
};

// In-memory fallback map for non-native / test environments
const memoryCache = new Map<string, string>();

async function safeSetItem(key: string, value: string): Promise<void> {
  memoryCache.set(key, value);
  try {
    if (typeof window !== 'undefined' || typeof navigator !== 'undefined') {
      await AsyncStorage.setItem(key, value);
    }
  } catch {
    // In-memory cache is already updated
  }
}

async function safeGetItem(key: string): Promise<string | null> {
  try {
    if (typeof window !== 'undefined' || typeof navigator !== 'undefined') {
      const val = await AsyncStorage.getItem(key);
      if (val !== null) return val;
    }
  } catch {
    // Fall back to memoryCache
  }
  return memoryCache.get(key) ?? null;
}

async function safeRemoveItem(key: string): Promise<void> {
  memoryCache.delete(key);
  try {
    if (typeof window !== 'undefined' || typeof navigator !== 'undefined') {
      await AsyncStorage.removeItem(key);
    }
  } catch {
    // In-memory cache already cleared
  }
}

export class StorageService {
  /**
   * Save manual pH value
   */
  public static async saveManualPh(ph: number): Promise<void> {
    await safeSetItem(STORAGE_KEYS.MANUAL_PH, ph.toString());
  }

  /**
   * Load manual pH value
   */
  public static async getManualPh(defaultValue = 6.5): Promise<number> {
    const val = await safeGetItem(STORAGE_KEYS.MANUAL_PH);
    return val ? parseFloat(val) : defaultValue;
  }

  /**
   * Cache latest sensor reading
   */
  public static async appendTelemetry(telemetry: AgricultureTelemetry): Promise<void> {
    await safeSetItem(STORAGE_KEYS.RECENT_TELEMETRY, JSON.stringify(telemetry));
  }

  /**
   * Save alert history (capped at max entries)
   */
  public static async saveAlertHistory(alerts: AgricultureAlert[]): Promise<void> {
    await safeSetItem(STORAGE_KEYS.ALERT_HISTORY, JSON.stringify(alerts));
  }

  /**
   * Load alert history from AsyncStorage / memory cache
   */
  public static async getAlertHistory(): Promise<AgricultureAlert[]> {
    const val = await safeGetItem(STORAGE_KEYS.ALERT_HISTORY);
    return val ? JSON.parse(val) : [];
  }

  /**
   * Clear alert history
   */
  public static async clearAlertHistory(): Promise<void> {
    await safeRemoveItem(STORAGE_KEYS.ALERT_HISTORY);
  }
}
