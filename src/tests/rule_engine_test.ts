/**
 * AgriMonitor Agriculture Rule Engine Unit Test Suite (Phase 3)
 */

import {
  evaluateTemperature,
  evaluateSoilMoisture,
  evaluateTds,
  evaluateHumidity,
  evaluateAgricultureTelemetry,
  DEFAULT_THRESHOLDS,
} from '../lib/agricultureRules';
import { AgricultureTelemetry } from '../types/telemetry';

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
  } else {
    console.error(`[FAIL] ${testName}`);
    process.exit(1);
  }
}

console.log('=== Starting AgriMonitor Rule Engine Test Suite ===\n');

// --- 1. TEMPERATURE RULES ---
console.log('--- 1. Testing Temperature Rules & Boundaries ---');
const frost = evaluateTemperature(3.0);
assert(frost.status === 'VERY_LOW' && frost.severity === 'CRITICAL', 'Frost (<5°C) -> VERY_LOW (CRITICAL)');

const cool = evaluateTemperature(12.0);
assert(cool.status === 'LOW' && cool.severity === 'WARNING', 'Cool (12°C) -> LOW (WARNING)');

const normalTemp = evaluateTemperature(25.0);
assert(normalTemp.status === 'NORMAL' && normalTemp.severity === 'INFO' && !normalTemp.isAbnormal, 'Normal (25°C) -> NORMAL (INFO)');

const warm = evaluateTemperature(37.0);
assert(warm.status === 'HIGH' && warm.severity === 'WARNING', 'Warm (37°C) -> HIGH (WARNING)');

const heatStress = evaluateTemperature(42.0);
assert(heatStress.status === 'VERY_HIGH' && heatStress.severity === 'CRITICAL', 'Heat stress (42°C) -> VERY_HIGH (CRITICAL)');

// Boundary tests
const boundaryLow = evaluateTemperature(15.0);
assert(boundaryLow.status === 'NORMAL', 'Boundary 15.0°C is NORMAL');
const boundaryHigh = evaluateTemperature(35.0);
assert(boundaryHigh.status === 'NORMAL', 'Boundary 35.0°C is NORMAL');

// --- 2. SOIL MOISTURE RULES ---
console.log('\n--- 2. Testing Soil Moisture Rules & Boundaries ---');
const drought = evaluateSoilMoisture(15.0);
assert(drought.status === 'VERY_LOW' && drought.severity === 'CRITICAL', 'Drought (<20%) -> VERY_LOW (CRITICAL)');

const dry = evaluateSoilMoisture(25.0);
assert(dry.status === 'LOW' && dry.severity === 'WARNING', 'Dry (25%) -> LOW (WARNING)');

const optimalSoil = evaluateSoilMoisture(50.0);
assert(optimalSoil.status === 'NORMAL' && optimalSoil.severity === 'INFO' && !optimalSoil.isAbnormal, 'Optimal (50%) -> NORMAL (INFO)');

const highMoist = evaluateSoilMoisture(78.0);
assert(highMoist.status === 'HIGH' && highMoist.severity === 'INFO', 'High moisture (78%) -> HIGH (INFO)');

const saturated = evaluateSoilMoisture(92.0);
assert(saturated.status === 'SATURATED' && saturated.severity === 'WARNING', 'Saturated (92%) -> SATURATED (WARNING)');

// Boundary tests
const boundarySoilLow = evaluateSoilMoisture(30.0);
assert(boundarySoilLow.status === 'NORMAL', 'Boundary 30.0% is NORMAL');
const boundarySoilHigh = evaluateSoilMoisture(70.0);
assert(boundarySoilHigh.status === 'NORMAL', 'Boundary 70.0% is NORMAL');

// --- 3. TDS RULES ---
console.log('\n--- 3. Testing TDS Rules ---');
const lowTds = evaluateTds(150);
assert(lowTds.status === 'LOW' && lowTds.severity === 'WARNING', 'Low dissolved solids (150 ppm) -> LOW (WARNING)');

const normalTds = evaluateTds(650);
assert(normalTds.status === 'NORMAL' && normalTds.severity === 'INFO' && !normalTds.isAbnormal, 'Normal solids (650 ppm) -> NORMAL (INFO)');

const highTds = evaluateTds(1500);
assert(highTds.status === 'HIGH' && highTds.severity === 'WARNING', 'High dissolved solids (1500 ppm) -> HIGH (WARNING)');

const veryHighTds = evaluateTds(2400);
assert(veryHighTds.status === 'VERY_HIGH' && veryHighTds.severity === 'CRITICAL', 'Very high TDS (2400 ppm) -> VERY_HIGH (CRITICAL)');

// --- 4. HUMIDITY RULES ---
console.log('\n--- 4. Testing Humidity Rules ---');
const lowHum = evaluateHumidity(20.0);
assert(lowHum.status === 'LOW' && lowHum.severity === 'INFO', 'Low humidity (20%) -> LOW (INFO)');

const normalHum = evaluateHumidity(55.0);
assert(normalHum.status === 'NORMAL' && !normalHum.isAbnormal, 'Normal humidity (55%) -> NORMAL (INFO)');

const highHum = evaluateHumidity(88.0);
assert(highHum.status === 'HIGH' && highHum.severity === 'INFO', 'High humidity (88%) -> HIGH (INFO)');

// --- 5. UNIFIED TELEMETRY EVALUATION ---
console.log('\n--- 5. Testing Unified Telemetry Evaluation ---');
const optimalTelemetry: AgricultureTelemetry = {
  temperature: 26.5,
  humidity: 60.0,
  soilMoisture: 48.0,
  tds: 550,
  timestamp: Date.now(),
};
const optimalEval = evaluateAgricultureTelemetry(optimalTelemetry);
assert(optimalEval.overallStatus === 'INFO', 'Optimal telemetry overallStatus is INFO');
assert(optimalEval.activeAlerts.length === 0, 'Optimal telemetry produces 0 active alerts');
assert(optimalEval.insights.length > 0, 'Optimal telemetry produces agronomic insights');

const criticalTelemetry: AgricultureTelemetry = {
  temperature: 41.5, // CRITICAL
  humidity: 85.0,    // INFO
  soilMoisture: 16.0,// CRITICAL
  tds: 1400,         // WARNING
  timestamp: Date.now(),
};
const criticalEval = evaluateAgricultureTelemetry(criticalTelemetry);
assert(criticalEval.overallStatus === 'CRITICAL', 'Multiple abnormal metrics elevate overallStatus to CRITICAL');
assert(criticalEval.activeAlerts.length >= 3, 'Active alerts collected for temperature, soilMoisture, and TDS');

console.log('\n=== All Rule Engine Tests Passed Successfully! ===');
