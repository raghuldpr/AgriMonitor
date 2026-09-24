/**
 * SensorParser Verification Suite (Phase 1)
 */

import { SensorParser } from '../services/ble/SensorParser';

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`PASS: ${testName}`);
  } else {
    console.error(`FAIL: ${testName}`);
    process.exit(1);
  }
}

console.log('--- Running SensorParser Verification Tests ---');

// 1. Valid packet
const validPayload = JSON.stringify({
  temperature: 28.5,
  humidity: 65,
  soilMoisture: 45,
  tds: 580,
});
const parsedValid = SensorParser.parseJsonPayload(validPayload);
assert(parsedValid !== null, 'Valid packet should be successfully parsed');
assert(parsedValid?.temperature === 28.5, 'Temperature should be 28.5');
assert(parsedValid?.humidity === 65, 'Humidity should be 65');
assert(parsedValid?.soilMoisture === 45, 'Soil moisture should be 45');
assert(parsedValid?.tds === 580, 'TDS should be 580');

// 2. Missing field
const missingFieldPayload = JSON.stringify({
  temperature: 28.5,
  humidity: 65,
  tds: 580,
});
assert(SensorParser.parseJsonPayload(missingFieldPayload) === null, 'Packet missing soilMoisture must be rejected');

// 3. Non-numeric / NaN
const nanPayload = JSON.stringify({
  temperature: 'abc',
  humidity: 65,
  soilMoisture: 45,
  tds: 580,
});
assert(SensorParser.parseJsonPayload(nanPayload) === null, 'Packet with non-numeric temperature must be rejected');

// 4. Out-of-bounds checks
const highTemp = JSON.stringify({
  temperature: 150.0,
  humidity: 65,
  soilMoisture: 45,
  tds: 580,
});
assert(SensorParser.parseJsonPayload(highTemp) === null, 'Excessive temperature (150°C) must be rejected');

const negativeSoil = JSON.stringify({
  temperature: 25.0,
  humidity: 65,
  soilMoisture: -10,
  tds: 580,
});
assert(SensorParser.parseJsonPayload(negativeSoil) === null, 'Negative soil moisture must be rejected');

const excessiveTds = JSON.stringify({
  temperature: 25.0,
  humidity: 65,
  soilMoisture: 50,
  tds: 15000,
});
assert(SensorParser.parseJsonPayload(excessiveTds) === null, 'Excessive TDS (15000 ppm) must be rejected');

// 5. Malformed JSON
assert(SensorParser.parseJsonPayload('Not a JSON string') === null, 'Raw non-JSON string must be rejected safely');
assert(SensorParser.parseJsonPayload('{ temperature: 25, }') === null, 'Malformed JSON syntax must be rejected safely');

console.log('All SensorParser tests passed successfully!');
