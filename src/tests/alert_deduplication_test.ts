/**
 * AgriMonitor Alert Deduplication & Recovery Test Suite (Phase 3)
 *
 * Explicitly verifies:
 * NORMAL -> LOW -> LOW -> LOW -> NORMAL -> LOW
 * Expected:
 * - Event 1: Alert Created (LOW)
 * - Event 2: No duplicate
 * - Event 3: No duplicate
 * - Event 4: Recovery Created (NORMAL)
 * - Event 5: Alert Created (LOW)
 */

import { AlertManager } from '../services/alerts/AlertManager';
import { AgricultureTelemetry } from '../types/telemetry';

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
  } else {
    console.error(`[FAIL] ${testName}`);
    process.exit(1);
  }
}

console.log('=== Starting Alert Deduplication & Recovery Test Suite ===\n');

const alertMgr = AlertManager.getInstance();
alertMgr.resetState();

// 1. Initial State: NORMAL
const t0: AgricultureTelemetry = {
  temperature: 25.0,
  humidity: 60.0,
  soilMoisture: 50.0, // NORMAL
  tds: 500,
  timestamp: 1000,
};
alertMgr.processTelemetry(t0);
assert(alertMgr.getAlertHistory().length === 0, 'Initial NORMAL telemetry produces 0 history alerts');

// 2. Transition 1: NORMAL -> LOW (Should generate Alert 1)
const t1: AgricultureTelemetry = {
  temperature: 25.0,
  humidity: 60.0,
  soilMoisture: 18.0, // VERY_LOW (<20%) -> Alert
  tds: 500,
  timestamp: 3000,
};
alertMgr.processTelemetry(t1);
assert(alertMgr.getAlertHistory().length === 1, 'Transition from NORMAL to LOW creates exactly 1 alert');
assert(alertMgr.getAlertHistory()[0].status === 'VERY_LOW', 'Alert 1 status is VERY_LOW');
assert(!alertMgr.getAlertHistory()[0].isRecovery, 'Alert 1 is not a recovery event');

// 3. Subsequent packet 2s later: LOW continues (Should NOT generate duplicate)
const t2: AgricultureTelemetry = {
  temperature: 25.0,
  humidity: 60.0,
  soilMoisture: 18.0, // Still VERY_LOW
  tds: 500,
  timestamp: 5000,
};
alertMgr.processTelemetry(t2);
assert(alertMgr.getAlertHistory().length === 1, 'Subsequent LOW reading #1 is deduplicated (History count stays 1)');

// 4. Subsequent packet 4s later: LOW continues (Should NOT generate duplicate)
const t3: AgricultureTelemetry = {
  temperature: 25.0,
  humidity: 60.0,
  soilMoisture: 17.5, // Still VERY_LOW
  tds: 500,
  timestamp: 7000,
};
alertMgr.processTelemetry(t3);
assert(alertMgr.getAlertHistory().length === 1, 'Subsequent LOW reading #2 is deduplicated (History count stays 1)');

// 5. Transition 2: LOW -> NORMAL (Should generate Recovery Event 1)
const t4: AgricultureTelemetry = {
  temperature: 25.0,
  humidity: 60.0,
  soilMoisture: 46.0, // Returned to NORMAL (46%)
  tds: 500,
  timestamp: 9000,
};
alertMgr.processTelemetry(t4);
assert(alertMgr.getAlertHistory().length === 2, 'Recovery back to NORMAL creates Recovery event (History count becomes 2)');
assert(alertMgr.getAlertHistory()[0].isRecovery === true, 'Latest history item is marked as recovery');
assert(alertMgr.getAlertHistory()[0].message.includes('returned to the configured normal range'), 'Recovery message contains confirmation');

// 6. Subsequent NORMAL packets (Should NOT generate duplicate recovery events)
const t5: AgricultureTelemetry = {
  temperature: 25.0,
  humidity: 60.0,
  soilMoisture: 48.0, // Still NORMAL
  tds: 500,
  timestamp: 11000,
};
alertMgr.processTelemetry(t5);
assert(alertMgr.getAlertHistory().length === 2, 'Subsequent NORMAL reading does not create duplicate recovery events (History count stays 2)');

// 7. Transition 3: NORMAL -> LOW again (Should generate Alert 2)
const t6: AgricultureTelemetry = {
  temperature: 25.0,
  humidity: 60.0,
  soilMoisture: 19.0, // VERY_LOW again
  tds: 500,
  timestamp: 13000,
};
alertMgr.processTelemetry(t6);
assert(alertMgr.getAlertHistory().length === 3, 'Second transition to LOW creates Alert 2 (History count becomes 3)');
assert(alertMgr.getAlertHistory()[0].status === 'VERY_LOW', 'Alert 2 status is VERY_LOW');

console.log('\n=== All Alert Deduplication & Recovery Tests Passed Successfully! ===');
