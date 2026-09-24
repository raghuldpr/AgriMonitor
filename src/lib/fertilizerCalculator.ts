/**
 * AgriMonitor Deterministic Fertilizer Calculator Engine (Phase 4)
 *
 * Provides pure, offline-capable calculation of agricultural fertilizer dosage,
 * required purchase bag count, and residual balance breakdown.
 *
 * NOTE ON PRESET RATES:
 * Preset reference rates are prototype guidelines and NOT universal agronomic
 * recommendations. Exact fertilizer scheduling requires soil-test calibration,
 * growth stage matching, and certified agricultural extension consultation.
 */

import {
  Crop,
  Fertilizer,
  FertilizerPreset,
  FertilizerCalculationResult,
} from '../types/fertilizer';

// Prototype Crops Catalog
export const PROTOTYPE_CROPS: Crop[] = [
  { id: 'crop_rice', name: 'Rice (Paddy)' },
  { id: 'crop_maize', name: 'Maize (Corn)' },
  { id: 'crop_tomato', name: 'Tomato' },
  { id: 'crop_groundnut', name: 'Groundnut (Peanut)' },
  { id: 'crop_cotton', name: 'Cotton' },
  { id: 'crop_chilli', name: 'Chilli' },
];

// Prototype Fertilizers Catalog
export const PROTOTYPE_FERTILIZERS: Fertilizer[] = [
  {
    id: 'fert_urea',
    name: 'Urea (46% N)',
    type: 'Nitrogenous',
    defaultBagSizeKg: 45,
    description: 'High-nitrogen fertilizer for vegetative growth and tillering.',
  },
  {
    id: 'fert_dap',
    name: 'DAP (18-46-0)',
    type: 'Phosphatic',
    defaultBagSizeKg: 50,
    description: 'Di-Ammonium Phosphate for strong root establishment and early vigor.',
  },
  {
    id: 'fert_mop',
    name: 'MOP (0-0-60)',
    type: 'Potassic',
    defaultBagSizeKg: 50,
    description: 'Muriate of Potash for disease resistance, grain filling, and fruit quality.',
  },
  {
    id: 'fert_npk_10_26_26',
    name: 'NPK 10-26-26',
    type: 'Complex',
    defaultBagSizeKg: 50,
    description: 'Balanced basal complex high in phosphorus and potassium.',
  },
  {
    id: 'fert_npk_20_20_20',
    name: 'NPK 20-20-20 (General)',
    type: 'Complex',
    defaultBagSizeKg: 25,
    description: 'Equal ratio all-purpose fertilizer for general nutritional maintenance.',
  },
];

// Prototype Reference Rates Catalog
export const PROTOTYPE_PRESETS: FertilizerPreset[] = [
  {
    cropId: 'crop_rice',
    fertilizerId: 'fert_urea',
    referenceRateKgPerAcre: 45.0,
    sourceNote: 'Prototype basal/split reference rate for irrigated paddy.',
  },
  {
    cropId: 'crop_rice',
    fertilizerId: 'fert_dap',
    referenceRateKgPerAcre: 50.0,
    sourceNote: 'Prototype basal application reference for rice.',
  },
  {
    cropId: 'crop_maize',
    fertilizerId: 'fert_urea',
    referenceRateKgPerAcre: 55.0,
    sourceNote: 'Prototype reference rate for hybrid maize.',
  },
  {
    cropId: 'crop_tomato',
    fertilizerId: 'fert_npk_10_26_26',
    referenceRateKgPerAcre: 40.0,
    sourceNote: 'Prototype basal dressing for solanaceous vegetables.',
  },
  {
    cropId: 'crop_groundnut',
    fertilizerId: 'fert_dap',
    referenceRateKgPerAcre: 35.0,
    sourceNote: 'Prototype legume starter phosphorus reference.',
  },
  {
    cropId: 'crop_cotton',
    fertilizerId: 'fert_urea',
    referenceRateKgPerAcre: 50.0,
    sourceNote: 'Prototype vegetative nitrogen split for cotton.',
  },
];

export interface CalculationOutcome {
  success: boolean;
  result?: FertilizerCalculationResult;
  error?: string;
}

/**
 * Pure calculation function for agricultural fertilizer requirements
 *
 * Formula:
 * 1. Total required (kg) = Land Area (acres) × Application Rate (kg/acre)
 * 2. Number of bags = ceil(Total required / Bag Size)
 * 3. Total purchased (kg) = Number of bags × Bag Size
 * 4. Remaining (kg) = Total purchased - Total required
 */
export function calculateFertilizerRequirement(
  rawArea: number | string,
  rawRate: number | string,
  rawBagSize: number | string
): CalculationOutcome {
  const area = Number(rawArea);
  const rate = Number(rawRate);
  const bagSize = Number(rawBagSize);

  // Validate numeric values and finiteness
  if (
    rawArea === '' ||
    rawRate === '' ||
    rawBagSize === '' ||
    !Number.isFinite(area) ||
    !Number.isFinite(rate) ||
    !Number.isFinite(bagSize)
  ) {
    return {
      success: false,
      error: 'Please enter valid numeric values for all input fields.',
    };
  }

  // Validate positive bounds
  if (area <= 0) {
    return {
      success: false,
      error: 'Land area must be greater than 0 acres.',
    };
  }

  if (rate <= 0) {
    return {
      success: false,
      error: 'Application rate must be greater than 0 kg/acre.',
    };
  }

  if (bagSize <= 0) {
    return {
      success: false,
      error: 'Bag size must be greater than 0 kg.',
    };
  }

  // Round intermediate values to 2 decimal places to avoid floating point precision artifacts
  const totalRequiredKg = Number((area * rate).toFixed(2));
  const rawBags = totalRequiredKg / bagSize;
  const bagsRequired = Math.ceil(rawBags);
  const totalPurchasedKg = Number((bagsRequired * bagSize).toFixed(2));
  const remainingKg = Number((totalPurchasedKg - totalRequiredKg).toFixed(2));

  const totalRequiredFormula = `${area} acres × ${rate} kg/acre = ${totalRequiredKg} kg required`;
  const bagsFormula = `${totalRequiredKg} kg ÷ ${bagSize} kg/bag = ${rawBags.toFixed(2)} bags ➔ ${bagsRequired} bags (rounded up)`;
  const remainingFormula = `${totalPurchasedKg} kg purchased - ${totalRequiredKg} kg required = ${remainingKg} kg remaining`;

  return {
    success: true,
    result: {
      areaAcres: area,
      applicationRateKgPerAcre: rate,
      totalRequiredKg,
      bagSizeKg: bagSize,
      bagsRequired,
      totalPurchasedKg,
      remainingKg,
      formulaBreakdown: {
        totalRequiredFormula,
        bagsFormula,
        remainingFormula,
      },
    },
  };
}

/**
 * Find preset reference rate for a given crop and fertilizer
 */
export function getPresetRate(cropId: string, fertilizerId: string): FertilizerPreset | null {
  return (
    PROTOTYPE_PRESETS.find(
      (p) => p.cropId === cropId && p.fertilizerId === fertilizerId
    ) ?? null
  );
}
