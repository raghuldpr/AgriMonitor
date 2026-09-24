/**
 * AgriMonitor Android BLE Permissions Handler
 * Manages runtime permission requests across Android 12+ (API 31+) and legacy versions.
 */

import { PermissionsAndroid, Platform } from 'react-native';

export async function requestAndroidBlePermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    const apiLevel = Platform.Version;

    if (typeof apiLevel === 'number' && apiLevel >= 31) {
      // Android 12+ (API 31+)
      const result = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);

      const isScanGranted = result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED;
      const isConnectGranted = result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED;
      const isLocationGranted = result[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;

      return isScanGranted && isConnectGranted && isLocationGranted;
    } else {
      // Legacy Android (API < 31)
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission for Bluetooth',
          message: 'AgriMonitor requires location access to discover nearby ESP32 sensors via BLE.',
          buttonNeutral: 'Ask Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
  } catch (err) {
    console.error('[BLE Permissions] Error requesting permissions:', err);
    return false;
  }
}
