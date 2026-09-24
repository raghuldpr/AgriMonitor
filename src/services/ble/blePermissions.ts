/**
 * AgriMonitor BLE Permissions Service (Phase 1)
 *
 * Checks and requests necessary Android Bluetooth Low Energy permissions:
 * - Android 12+ (API 31+): BLUETOOTH_SCAN, BLUETOOTH_CONNECT, ACCESS_FINE_LOCATION
 * - Android < 12: ACCESS_FINE_LOCATION
 */

import { PermissionsAndroid, Platform } from 'react-native';

export interface PermissionResult {
  granted: boolean;
  message?: string;
}

export class BlePermissionsService {
  /**
   * Check if BLE permissions are currently granted without prompting
   */
  public static async checkPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }

    const apiLevel = Platform.Version;

    try {
      if (typeof apiLevel === 'number' && apiLevel >= 31) {
        const scan = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN);
        const connect = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
        const location = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        return scan && connect && location;
      } else {
        return await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
      }
    } catch (err) {
      console.warn('[BlePermissions] Error checking permissions:', err);
      return false;
    }
  }

  /**
   * Request required BLE permissions from the user
   */
  public static async requestPermissions(): Promise<PermissionResult> {
    if (Platform.OS !== 'android') {
      return { granted: true };
    }

    const apiLevel = Platform.Version;

    try {
      if (typeof apiLevel === 'number' && apiLevel >= 31) {
        const statuses = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        const scanGranted = statuses[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED;
        const connectGranted = statuses[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED;
        const locationGranted = statuses[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;

        if (scanGranted && connectGranted && locationGranted) {
          return { granted: true };
        }

        const deniedList: string[] = [];
        if (!scanGranted) deniedList.push('Nearby Devices (Scan)');
        if (!connectGranted) deniedList.push('Nearby Devices (Connect)');
        if (!locationGranted) deniedList.push('Location Access');

        return {
          granted: false,
          message: `Permissions denied: ${deniedList.join(', ')}. Please enable them in Android Settings.`,
        };
      } else {
        // Legacy Android (< API 31)
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission for Bluetooth',
            message: 'AgriMonitor requires location access to detect nearby ESP32 BLE agriculture sensors.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          }
        );

        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          return { granted: true };
        }

        return {
          granted: false,
          message: 'Location permission was denied. BLE scanning cannot proceed on this Android version.',
        };
      }
    } catch (err: any) {
      return {
        granted: false,
        message: err?.message || 'Unexpected error while requesting Bluetooth permissions.',
      };
    }
  }
}
