/**
 * AgriMonitor Fertilizer Calculator Unit Test Suite (Phase 4)
 */

import {
  calculateFertilizerRequirement,
  PROTOTYPE_CROPS,
  PROTOTYPE_FERTILIZERS,
  getPresetRate,
} from '../lib/fertilizerCalculator';

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
  } else {
    console.error(`[FAIL] ${testName}`);
    process.exit(1);
  }
}

console.log('=== Starting AgriMonitor Fertilizer Calculator Test Suite ===\n');

// --- 1. BASIC CALCULATION ---
console.log('--- 1. Testing Basic Calculation (Exact Division) ---');
const basicOutcome = calculateFertilizerRequirement(2, 50, 50);
assert(basicOutcome.success === true, 'Basic 2 acres @ 50 kg/acre calculation succeeded');
assert(basicOutcome.result?.totalRequiredKg === 100, 'Total required is 100 kg');
assert(basicOutcome.result?.bagsRequired === 2, 'Bags required is exactly 2 bags');
assert(basicOutcome.result?.totalPurchasedKg === 100, 'Total purchased is 100 kg');
assert(basicOutcome.result?.remainingKg === 0, 'Remaining balance is 0 kg');

// --- 2. FRACTIONAL ACREAGE & BAG ROUNDING UP ---
console.log('\n--- 2. Testing Fractional Acreage & Upward Bag Rounding ---');
const fracOutcome = calculateFertilizerRequirement(2.5, 50, 50);
assert(fracOutcome.success === true, 'Fractional 2.5 acres @ 50 kg/acre calculation succeeded');
assert(fracOutcome.result?.totalRequiredKg === 125, 'Total required is 125 kg');
assert(fracOutcome.result?.bagsRequired === 3, '125 kg / 50 kg/bag = 2.5 bags rounds up to 3 bags');
assert(fracOutcome.result?.totalPurchasedKg === 150, 'Total purchased is 150 kg');
assert(fracOutcome.result?.remainingKg === 25, 'Excess balance is 25 kg');

// --- 3. DIFFERENT BAG PACKAGING SIZES ---
console.log('\n--- 3. Testing 25 kg and 45 kg Packaging ---');
const bag25Outcome = calculateFertilizerRequirement(2, 50, 25);
assert(bag25Outcome.result?.bagsRequired === 4, '100 kg with 25 kg bags = 4 bags');

const bag45Outcome = calculateFertilizerRequirement(2.5, 45, 45);
assert(bag45Outcome.result?.totalRequiredKg === 112.5, '2.5 * 45 = 112.5 kg');
assert(bag45Outcome.result?.bagsRequired === 3, '112.5 / 45 = 2.5 -> 3 bags (45kg bag size)');
assert(bag45Outcome.result?.totalPurchasedKg === 135, '3 * 45 = 135 kg purchased');
assert(bag45Outcome.result?.remainingKg === 22.5, '135 - 112.5 = 22.5 kg remaining');

// --- 4. INVALID INPUT REJECTION ---
console.log('\n--- 4. Testing Input Validation & Error Handling ---');
assert(calculateFertilizerRequirement(0, 50, 50).success === false, '0 acres is rejected');
assert(calculateFertilizerRequirement(-2.5, 50, 50).success === false, 'Negative acres is rejected');
assert(calculateFertilizerRequirement(2.5, 0, 50).success === false, '0 rate is rejected');
assert(calculateFertilizerRequirement(2.5, -50, 50).success === false, 'Negative rate is rejected');
assert(calculateFertilizerRequirement(2.5, 50, 0).success === false, '0 bag size is rejected');
assert(calculateFertilizerRequirement(2.5, 50, -50).success === false, 'Negative bag size is rejected');
assert(calculateFertilizerRequirement('abc', 50, 50).success === false, 'Non-numeric string is rejected');
assert(calculateFertilizerRequirement('', 50, 50).success === false, 'Empty string is rejected');
assert(calculateFertilizerRequirement(NaN, 50, 50).success === false, 'NaN is rejected');
assert(calculateFertilizerRequirement(Infinity, 50, 50).success === false, 'Infinity is rejected');

// --- 5. FLOATING POINT PRECISION ---
console.log('\n--- 5. Testing Floating Point Precision ---');
const precisionOutcome = calculateFertilizerRequirement(1.33, 45.5, 50);
assert(precisionOutcome.success === true, 'Precision test succeeded');
assert(Number.isFinite(precisionOutcome.result?.totalRequiredKg), 'Required kg is a finite number');
assert(precisionOutcome.result?.totalRequiredKg === 60.52, '1.33 * 45.5 rounded to 60.52 kg');
assert(precisionOutcome.result?.bagsRequired === 2, '60.52 / 50 -> 2 bags');
assert(precisionOutcome.result?.totalPurchasedKg === 100, '2 * 50 = 100 kg');
assert(precisionOutcome.result?.remainingKg === 39.48, '100 - 60.52 = 39.48 kg');

// --- 6. PRESET DATA CATALOG ---
console.log('\n--- 6. Testing Prototype Preset Catalog ---');
assert(PROTOTYPE_CROPS.length >= 6, 'Contains at least 6 prototype crops');
assert(PROTOTYPE_FERTILIZERS.length >= 5, 'Contains at least 5 prototype fertilizers');
const riceUreaPreset = getPresetRate('crop_rice', 'fert_urea');
assert(riceUreaPreset !== null && riceUreaPreset.referenceRateKgPerAcre === 45, 'Rice Urea preset rate is 45 kg/acre');

console.log('\n=== All Fertilizer Calculator Tests Passed Successfully! ===');
