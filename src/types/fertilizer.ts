/**
 * AgriMonitor Fertilizer Calculator Domain Models (Phase 4)
 */

export interface Crop {
  id: string;
  name: string;
}

export interface Fertilizer {
  id: string;
  name: string;
  type: string;
  defaultBagSizeKg: number;
  description?: string;
}

export interface FertilizerPreset {
  cropId: string;
  fertilizerId: string;
  referenceRateKgPerAcre: number;
  sourceNote: string;
}

export interface FertilizerCalculationResult {
  areaAcres: number;
  applicationRateKgPerAcre: number;
  totalRequiredKg: number;
  bagSizeKg: number;
  bagsRequired: number;
  totalPurchasedKg: number;
  remainingKg: number;
  formulaBreakdown: {
    totalRequiredFormula: string;
    bagsFormula: string;
    remainingFormula: string;
  };
}

export interface FertilizerCalculationHistory {
  id: string;
  timestamp: number;
  cropName: string;
  fertilizerName: string;
  areaAcres: number;
  rateKgPerAcre: number;
  bagSizeKg: number;
  result: FertilizerCalculationResult;
}
