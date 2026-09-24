/**
 * AgriMonitor Telemetry State & BLE Lifecycle Unit Test Suite (Phase 2)
 */

import { SensorParser } from '../services/ble/SensorParser';
import { BleManager } from '../services/ble/BleManager';

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
  } else {
    console.error(`[FAIL] ${testName}`);
    process.exit(1);
  }
}

console.log('=== Starting AgriMonitor Phase 2 Verification Suite ===\n');

// --- 1. SENSOR PARSER VALIDATION ---
console.log('--- 1. Testing SensorParser with Real Environmental Ranges ---');
const normalPacket = JSON.stringify({
  temperature: 27.4,
  humidity: 62.0,
  soilMoisture: 48.5,
  tds: 540,
});
const parsed = SensorParser.parseJsonPayload(normalPacket);
assert(parsed !== null, 'Normal sensor packet must parse cleanly');
assert(parsed?.temperature === 27.4, 'Temperature match: 27.4');
assert(parsed?.humidity === 62.0, 'Humidity match: 62.0');
assert(parsed?.soilMoisture === 48.5, 'Soil moisture match: 48.5');
assert(parsed?.tds === 540, 'TDS match: 540');
assert(typeof parsed?.timestamp === 'number' && parsed.timestamp > 0, 'Local reception epoch timestamp assigned');

// Extreme boundary test
const maxBoundsPacket = JSON.stringify({
  temperature: 80.0,
  humidity: 100.0,
  soilMoisture: 100.0,
  tds: 5000,
});
assert(SensorParser.parseJsonPayload(maxBoundsPacket) !== null, 'Maximum technical boundaries accepted');

const minBoundsPacket = JSON.stringify({
  temperature: -40.0,
  humidity: 0.0,
  soilMoisture: 0.0,
  tds: 0,
});
assert(SensorParser.parseJsonPayload(minBoundsPacket) !== null, 'Minimum technical boundaries accepted');

// Out of bounds tests
const outOfBoundsTemp = JSON.stringify({ temperature: 85.0, humidity: 50, soilMoisture: 50, tds: 500 });
assert(SensorParser.parseJsonPayload(outOfBoundsTemp) === null, 'Out of bounds temp (>80°C) must be rejected');

const outOfBoundsHum = JSON.stringify({ temperature: 25.0, humidity: 105.0, soilMoisture: 50, tds: 500 });
assert(SensorParser.parseJsonPayload(outOfBoundsHum) === null, 'Out of bounds humidity (>100%) must be rejected');

const outOfBoundsSoil = JSON.stringify({ temperature: 25.0, humidity: 50, soilMoisture: -5.0, tds: 500 });
assert(SensorParser.parseJsonPayload(outOfBoundsSoil) === null, 'Negative soil moisture must be rejected');

const outOfBoundsTds = JSON.stringify({ temperature: 25.0, humidity: 50, soilMoisture: 50, tds: 6000 });
assert(SensorParser.parseJsonPayload(outOfBoundsTds) === null, 'Out of bounds TDS (>5000 ppm) must be rejected');

// --- 2. BLE MANAGER STATE TRANSITIONS ---
console.log('\n--- 2. Testing BleManager Lifecycle & Dispatching ---');
const ble = BleManager.getInstance();

assert(ble.getConnectionStatus() === 'DISCONNECTED', 'Initial BLE status is DISCONNECTED');

let receivedTelemetryCount = 0;
const unsubTelemetry = ble.subscribeTelemetry((t) => {
  receivedTelemetryCount++;
  assert(t.temperature > 0, 'Dispatched telemetry contains valid temperature');
});

// Inject test packet through BleManager
const injected = ble.injectRawPacket(normalPacket);
assert(injected === true, 'Valid raw packet injection accepted');
assert(receivedTelemetryCount > 0, 'Telemetry listener notified of new sensor reading');

// Cleanup
unsubTelemetry();

console.log('\n=== All Phase 2 Telemetry & State Tests Passed Successfully! ===');
