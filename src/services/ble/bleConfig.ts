/**
 * AgriMonitor BLE Configuration (Phase 1)
 *
 * UUID Strategy: Option B (AgriMonitor-Specific Identifiers)
 * To ensure clean independence from legacy projects (Healthiva), AgriMonitor uses
 * its own dedicated 128-bit GATT Service & Characteristic UUID namespace.
 */

// AgriMonitor Custom GATT Service & Characteristics
export const AGRIMONITOR_SERVICE_UUID = '189a0001-e200-4424-9b55-d142d7c50a12';
export const AGRIMONITOR_DATA_CHAR_UUID = '189a0002-e200-4424-9b55-d142d7c50a12';
export const AGRIMONITOR_CONTROL_CHAR_UUID = '189a0003-e200-4424-9b55-d142d7c50a12';

export const BLE_CONFIG = {
  DEVICE_NAME_PREFIX: 'AgriMonitor',
  DEFAULT_DEVICE_NAME: 'AgriMonitor-ESP32',
  SERVICE_UUID: AGRIMONITOR_SERVICE_UUID,
  DATA_CHARACTERISTIC_UUID: AGRIMONITOR_DATA_CHAR_UUID,
  CONTROL_CHARACTERISTIC_UUID: AGRIMONITOR_CONTROL_CHAR_UUID,

  // Timeouts and Retry Policy
  SCAN_TIMEOUT_MS: 12000,
  CONNECT_TIMEOUT_MS: 10000,
  MAX_RECONNECT_ATTEMPTS: 3,
  RECONNECT_INTERVAL_MS: 3000,
};
