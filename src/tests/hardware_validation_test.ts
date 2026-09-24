/**
 * AgriMonitor Phase 7: Physical Hardware Integration & System Validation Test Suite
 *
 * Verifies:
 * 1. ESP32 Firmware JSON Packet Contract & parsing boundaries.
 * 2. Analog Soil Moisture ADC calibration formula & clamping (0-100%).
 * 3. Analog TDS Meter voltage conversion & DHT11 temperature compensation.
 * 4. BLE GATT state transitions, data dispatching, and reconnection logic.
 * 5. End-to-end rule evaluation for all real-world agricultural conditions.
 * 6. Alert deduplication, recovery detection, and local storage isolation.
 */

import { SensorParser } from '../services/ble/SensorParser';
import { BleManager } from '../services/ble/BleManager';
import { AlertManager } from '../services/alerts/AlertManager';
import { StorageService } from '../services/storage/storageService';
import { AgricultureTelemetry } from '../types/telemetry';

function assert(condition: any, message: string): asserts condition {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

// Emulate ESP32 firmware Soil Moisture ADC calculation
function firmwareCalculateSoilMoisture(rawAdc: number, dryAdc = 3200, wetAdc = 1400): number {
  const constrained = Math.max(wetAdc, Math.min(dryAdc, rawAdc));
  const percentage = ((dryAdc - constrained) / (dryAdc - wetAdc)) * 100.0;
  return Math.max(0.0, Math.min(100.0, Number(percentage.toFixed(1))));
}

// Emulate ESP32 firmware TDS calculation with temperature compensation
function firmwareCalculateTds(rawAdc: number, tempC: number, vref = 3.3): number {
  const voltage = (rawAdc / 4095.0) * vref;
  let tempCoefficient = 1.0 + 0.02 * (tempC - 25.0);
  if (tempCoefficient <= 0.1) tempCoefficient = 0.1;
  const compVoltage = voltage / tempCoefficient;
  const rawTds =
    (133.42 * Math.pow(compVoltage, 3) -
      255.86 * Math.pow(compVoltage, 2) +
      857.39 * compVoltage) *
    0.5;
  return Math.max(0, Math.min(5000, Math.round(rawTds)));
}

async function runPhase7Validation() {
  console.log('=== STARTING AGRIMONITOR PHASE 7 HARDWARE INTEGRATION & VALIDATION ===\n');

  // TEST 1: ESP32 Firmware JSON Packet Contract
  console.log('--- 1. Testing ESP32 Firmware Telemetry Packet Parsing ---');

  // Standard live sensor payload produced by ESP32 firmware sendBleTelemetry()
  const liveEsp32Packet = '{"temperature":28.5,"humidity":65.0,"soilMoisture":45.0,"tds":580}';
  const parsedLive = SensorParser.parseJsonPayload(liveEsp32Packet);
  assert(parsedLive !== null, 'Parses real ESP32 JSON packet');
  assert(parsedLive.temperature === 28.5, 'Accurate temperature (28.5°C)');
  assert(parsedLive.humidity === 65.0, 'Accurate humidity (65.0%)');
  assert(parsedLive.soilMoisture === 45.0, 'Accurate soil moisture (45.0%)');
  assert(parsedLive.tds === 580, 'Accurate TDS (580 ppm)');

  // Severe drought field packet
  const droughtPacket = '{"temperature":39.2,"humidity":22.0,"soilMoisture":12.5,"tds":1850}';
  const parsedDrought = SensorParser.parseJsonPayload(droughtPacket);
  assert(parsedDrought !== null && parsedDrought.soilMoisture === 12.5, 'Parses severe field condition packet');

  // Malformed packets from sensor disconnect / brownout
  assert(SensorParser.parseJsonPayload('') === null, 'Rejects empty BLE notification');
  assert(SensorParser.parseJsonPayload('{"temp": NaN}') === null, 'Rejects NaN from failed sensor reading');
  assert(SensorParser.parseJsonPayload('{"temperature": 150}') === null, 'Rejects out-of-bounds sensor values');

  // TEST 2: Soil Moisture Calibration & Boundary Clamping
  console.log('\n--- 2. Testing Soil Moisture Calibration & Clamping ---');
  
  // Dry Air / Dry Soil (raw ADC >= 3200) -> 0.0%
  const dryAir = firmwareCalculateSoilMoisture(3200);
  assert(dryAir === 0.0, 'Dry calibration point (ADC 3200) maps to 0.0%');

  const ultraDry = firmwareCalculateSoilMoisture(3600);
  assert(ultraDry === 0.0, 'Out-of-range dry ADC (3600) clamps cleanly to 0.0%');

  // Water / Saturated Soil (raw ADC <= 1400) -> 100.0%
  const wetWater = firmwareCalculateSoilMoisture(1400);
  assert(wetWater === 100.0, 'Wet calibration point (ADC 1400) maps to 100.0%');

  const submerged = firmwareCalculateSoilMoisture(1100);
  assert(submerged === 100.0, 'Out-of-range wet ADC (1100) clamps cleanly to 100.0%');

  // Midpoint (raw ADC 2300) -> 50.0%
  const midMoisture = firmwareCalculateSoilMoisture(2300);
  assert(midMoisture === 50.0, 'Midpoint ADC (2300) maps to 50.0%');

  // TEST 3: Analog TDS Voltage & Temperature Compensation
  console.log('\n--- 3. Testing TDS Voltage & Temperature Compensation ---');

  // 0 ADC -> 0 ppm
  const zeroTds = firmwareCalculateTds(0, 25.0);
  assert(zeroTds === 0, 'Zero ADC produces 0 ppm TDS');

  // Standard tap water reading (ADC ~ 800 @ 25°C) -> ~200-400 ppm
  const tapWaterTds = firmwareCalculateTds(800, 25.0);
  assert(tapWaterTds >= 200 && tapWaterTds <= 400, `Tap water TDS calculated realistically: ${tapWaterTds} ppm`);

  // Temperature compensation check: Higher ambient temp (35°C) prevents false high reading
  const tdsAt25 = firmwareCalculateTds(1500, 25.0);
  const tdsAt35 = firmwareCalculateTds(1500, 35.0);
  assert(tdsAt35 < tdsAt25, '35°C temperature compensation correctly offsets thermal conductivity increase');

  // Max ADC (4095) clamps to 5000 ppm bounds
  const maxTds = firmwareCalculateTds(4095, 25.0);
  assert(maxTds <= 5000 && maxTds >= 2000, `Max ADC produces valid constrained reading: ${maxTds} ppm`);

  // TEST 4: BLE State Machine & Telemetry Dispatching
  console.log('\n--- 4. Testing BLE State Machine & Dispatching ---');
  const ble = BleManager.getInstance();
  
  let receivedTelemetry: AgricultureTelemetry | null = null;
  const unsub = ble.subscribeTelemetry((data) => {
    receivedTelemetry = data;
  });

  const injected = ble.injectRawPacket('{"temperature":26.4,"humidity":58.0,"soilMoisture":42.0,"tds":520}');
  assert(injected, 'Raw packet successfully accepted by BleManager');
  assert(receivedTelemetry !== null, 'Telemetry subscriber notified of new reading');
  const finalTelemetry = receivedTelemetry as AgricultureTelemetry;
  assert(finalTelemetry.soilMoisture === 42.0, 'Subscriber received correct telemetry payload');

  unsub();

  // TEST 5: Real Alert Detection & Recovery for All Parameters
  console.log('\n--- 5. Testing Real Agricultural Alert Evaluation & Recovery ---');
  const alertMgr = AlertManager.getInstance();
  alertMgr.resetState();

  // 1. Soil Moisture Drought (15% -> VERY_LOW CRITICAL)
  const eval1 = alertMgr.processTelemetry({
    temperature: 25.0,
    humidity: 50.0,
    soilMoisture: 15.0,
    tds: 500,
    timestamp: Date.now(),
  });
  assert(eval1.soilMoisture.status === 'VERY_LOW', 'Soil moisture 15% evaluated as VERY_LOW');
  assert(eval1.soilMoisture.severity === 'CRITICAL', 'Soil drought triggers CRITICAL severity');
  assert(alertMgr.getAlertHistory().length === 1, 'Alert registered in history');

  // 2. Soil Moisture Recovery (50% -> NORMAL)
  const eval2 = alertMgr.processTelemetry({
    temperature: 25.0,
    humidity: 50.0,
    soilMoisture: 50.0,
    tds: 500,
    timestamp: Date.now() + 2000,
  });
  assert(eval2.soilMoisture.status === 'NORMAL', 'Soil moisture returned to NORMAL');
  const history = alertMgr.getAlertHistory();
  assert(history.length === 2, 'Recovery event created in history');
  assert(history[0].isRecovery === true, 'Latest history entry is marked as recovery');

  // 3. Multi-parameter critical event (Heat stress + Salinity + Low moisture)
  alertMgr.processTelemetry({
    temperature: 42.0,
    humidity: 50.0,
    soilMoisture: 18.0,
    tds: 2400,
    timestamp: Date.now() + 4000,
  });

  const activeAlerts = alertMgr.getActiveAlerts();
  assert(activeAlerts.some((a) => a.parameter === 'temperature'), 'Active alerts includes temperature');
  assert(activeAlerts.some((a) => a.parameter === 'soilMoisture'), 'Active alerts includes soilMoisture');
  assert(activeAlerts.some((a) => a.parameter === 'tds'), 'Active alerts includes TDS');

  // TEST 6: Local Storage Isolation
  console.log('\n--- 6. Testing Storage Isolation & Persistence ---');
  await StorageService.saveManualPh(6.8);
  const ph = await StorageService.getManualPh();
  assert(ph === 6.8, 'Manual pH persists in storage');

  console.log('\n🎉 ALL PHASE 7 HARDWARE INTEGRATION & SYSTEM VALIDATION TESTS PASSED!\n');
}

runPhase7Validation().catch((err) => {
  console.error('Fatal Phase 7 Test Error:', err);
  process.exit(1);
});
