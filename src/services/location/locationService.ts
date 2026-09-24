/**
 * AgriMonitor Location Service (Phase 6)
 *
 * Encapsulates Expo Location requests, permission handling, and GPS coordinate retrieval.
 */

import * as Location from 'expo-location';
import { UserLocation } from '../../types/nearby';

export class LocationService {
  /**
   * Check if location permission has already been granted
   */
  public static async checkPermission(): Promise<boolean> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      return status === 'granted';
    } catch (e) {
      console.warn('[LocationService] Failed to check permissions:', e);
      return false;
    }
  }

  /**
   * Request foreground location permission
   */
  public static async requestPermission(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (e) {
      console.warn('[LocationService] Failed to request permissions:', e);
      return false;
    }
  }

  /**
   * Check if device location services (GPS) are enabled
   */
  public static async isLocationEnabled(): Promise<boolean> {
    try {
      return await Location.hasServicesEnabledAsync();
    } catch (e) {
      console.warn('[LocationService] Failed to check if location services are enabled:', e);
      return false;
    }
  }

  /**
   * Get current device GPS location with timeout protection
   */
  public static async getCurrentLocation(): Promise<UserLocation | null> {
    try {
      const hasPermission = await this.checkPermission();
      if (!hasPermission) {
        const granted = await this.requestPermission();
        if (!granted) {
          return null;
        }
      }

      // Fast location retrieval with balanced accuracy
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy ?? undefined,
        timestamp: location.timestamp,
      };
    } catch (e) {
      console.warn('[LocationService] Failed to get current position, attempting last known:', e);
      try {
        const lastKnown = await Location.getLastKnownPositionAsync({});
        if (lastKnown) {
          return {
            latitude: lastKnown.coords.latitude,
            longitude: lastKnown.coords.longitude,
            accuracy: lastKnown.coords.accuracy ?? undefined,
            timestamp: lastKnown.timestamp,
          };
        }
      } catch (err) {
        console.warn('[LocationService] Failed to get last known location:', err);
      }
      return null;
    }
  }
}
