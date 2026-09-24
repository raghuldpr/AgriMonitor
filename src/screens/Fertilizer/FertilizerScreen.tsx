import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  PROTOTYPE_CROPS,
  PROTOTYPE_FERTILIZERS,
  calculateFertilizerRequirement,
  getPresetRate,
} from '../../lib/fertilizerCalculator';
import {
  Crop,
  Fertilizer,
  FertilizerCalculationResult,
  FertilizerCalculationHistory,
} from '../../types/fertilizer';
import { StorageService } from '../../services/storage/storageService';
import { useTelemetry } from '../../hooks/useTelemetry';

export const FertilizerScreen: React.FC = () => {
  const { telemetry } = useTelemetry();

  // Inputs
  const [areaInput, setAreaInput] = useState<string>('2.5');
  const [selectedCrop, setSelectedCrop] = useState<Crop>(PROTOTYPE_CROPS[0]);
  const [selectedFertilizer, setSelectedFertilizer] = useState<Fertilizer>(PROTOTYPE_FERTILIZERS[0]);
  const [rateInput, setRateInput] = useState<string>('45');
  const [bagSizeInput, setBagSizeInput] = useState<string>('45');
  const [selectedBagPreset, setSelectedBagPreset] = useState<number | 'custom'>(45);

  // Results & History
  const [result, setResult] = useState<FertilizerCalculationResult | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [history, setHistory] = useState<FertilizerCalculationHistory[]>([]);

  // Load history on mount
  useEffect(() => {
    StorageService.getFertilizerHistory().then(setHistory).catch(console.warn);
  }, []);

  // Update default bag size and check preset when fertilizer changes
  const handleSelectFertilizer = (fert: Fertilizer) => {
    setSelectedFertilizer(fert);
    setBagSizeInput(fert.defaultBagSizeKg.toString());
    setSelectedBagPreset(fert.defaultBagSizeKg);

    const preset = getPresetRate(selectedCrop.id, fert.id);
    if (preset) {
      setRateInput(preset.referenceRateKgPerAcre.toString());
    }
  };

  // Check preset when crop changes
  const handleSelectCrop = (crop: Crop) => {
    setSelectedCrop(crop);
    const preset = getPresetRate(crop.id, selectedFertilizer.id);
    if (preset) {
      setRateInput(preset.referenceRateKgPerAcre.toString());
    }
  };

  const handleUsePreset = () => {
    const preset = getPresetRate(selectedCrop.id, selectedFertilizer.id);
    if (preset) {
      setRateInput(preset.referenceRateKgPerAcre.toString());
      setValidationError(null);
    }
  };

  const handleSelectBagSizePreset = (size: number | 'custom') => {
    setSelectedBagPreset(size);
    if (size !== 'custom') {
      setBagSizeInput(size.toString());
    }
  };

  const handleCalculate = async () => {
    setValidationError(null);

    const outcome = calculateFertilizerRequirement(areaInput, rateInput, bagSizeInput);
    if (!outcome.success || !outcome.result) {
      setValidationError(outcome.error || 'Please verify your inputs.');
      setResult(null);
      return;
    }

    const calcResult = outcome.result;
    setResult(calcResult);

    // Append to local history
    const historyEntry: FertilizerCalculationHistory = {
      id: `fert_hist_${Date.now()}`,
      timestamp: Date.now(),
      cropName: selectedCrop.name,
      fertilizerName: selectedFertilizer.name,
      areaAcres: calcResult.areaAcres,
      rateKgPerAcre: calcResult.applicationRateKgPerAcre,
      bagSizeKg: calcResult.bagSizeKg,
      result: calcResult,
    };

    const updatedHistory = [historyEntry, ...history].slice(0, 50);
    setHistory(updatedHistory);
    await StorageService.saveFertilizerHistory(updatedHistory);
  };

  const handleClearHistory = async () => {
    Alert.alert(
      'Clear Calculation History',
      'Are you sure you want to clear your saved fertilizer calculation history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await StorageService.clearFertilizerHistory();
            setHistory([]);
          },
        },
      ]
    );
  };

  const activePreset = getPresetRate(selectedCrop.id, selectedFertilizer.id);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Fertilizer Calculator</Text>
        <Text style={styles.subtitle}>Acreage Dosage & Bag Estimation Engine</Text>
      </View>

      {/* Agronomic Disclaimer */}
      <View style={styles.disclaimerCard}>
        <Text style={styles.disclaimerText}>
          ⚠️ <Text style={styles.boldText}>Agronomic Notice:</Text> Application rates are reference prototype guidelines. Actual field dosage must be tailored to soil-test results, crop growth stage, and local agricultural extension recommendations.
        </Text>
      </View>

      {/* Live Context Card */}
      <View style={styles.contextCard}>
        <View style={styles.contextRow}>
          <Text style={styles.contextLabel}>Live Field TDS:</Text>
          <Text style={styles.contextValue}>
            {telemetry ? `${telemetry.tds} ppm` : 'Node disconnected'}
          </Text>
        </View>
        <Text style={styles.contextNote}>
          * TDS is shown for field monitoring context only; fertilizer dosage is calculated from acreage and application rates.
        </Text>
      </View>

      {/* Input Form Card */}
      <View style={styles.formCard}>
        <Text style={styles.sectionHeading}>CALCULATION PARAMETERS</Text>

        {/* 1. Land Area */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Land Area (Acres):</Text>
          <TextInput
            style={styles.textInput}
            value={areaInput}
            onChangeText={(text) => {
              setAreaInput(text);
              setValidationError(null);
            }}
            keyboardType="numeric"
            placeholder="e.g. 2.5"
            placeholderTextColor="#64748B"
          />
        </View>

        {/* 2. Crop Selector */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Target Crop:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsScroll}>
            {PROTOTYPE_CROPS.map((crop) => (
              <TouchableOpacity
                key={crop.id}
                style={[
                  styles.pill,
                  selectedCrop.id === crop.id && styles.pillSelected,
                ]}
                onPress={() => handleSelectCrop(crop)}
              >
                <Text
                  style={[
                    styles.pillText,
                    selectedCrop.id === crop.id && styles.pillTextSelected,
                  ]}
                >
                  {crop.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* 3. Fertilizer Selector */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Fertilizer Product:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsScroll}>
            {PROTOTYPE_FERTILIZERS.map((fert) => (
              <TouchableOpacity
                key={fert.id}
                style={[
                  styles.pill,
                  selectedFertilizer.id === fert.id && styles.pillSelected,
                ]}
                onPress={() => handleSelectFertilizer(fert)}
              >
                <Text
                  style={[
                    styles.pillText,
                    selectedFertilizer.id === fert.id && styles.pillTextSelected,
                  ]}
                >
                  {fert.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Reference Preset Helper */}
        {activePreset && (
          <View style={styles.presetBanner}>
            <View style={styles.presetLeft}>
              <Text style={styles.presetTitle}>Reference Prototype Rate</Text>
              <Text style={styles.presetVal}>{activePreset.referenceRateKgPerAcre} kg / acre</Text>
              <Text style={styles.presetNote}>{activePreset.sourceNote}</Text>
            </View>
            <TouchableOpacity style={styles.usePresetBtn} onPress={handleUsePreset}>
              <Text style={styles.usePresetBtnText}>Use Rate</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 4. Application Rate Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Application Rate (kg / acre):</Text>
          <TextInput
            style={styles.textInput}
            value={rateInput}
            onChangeText={(text) => {
              setRateInput(text);
              setValidationError(null);
            }}
            keyboardType="numeric"
            placeholder="e.g. 50"
            placeholderTextColor="#64748B"
          />
        </View>

        {/* 5. Bag Size Presets */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Bag Size (kg):</Text>
          <View style={styles.bagPresetsRow}>
            {[45, 50, 25].map((size) => (
              <TouchableOpacity
                key={size}
                style={[
                  styles.bagPresetBtn,
                  selectedBagPreset === size && styles.bagPresetBtnActive,
                ]}
                onPress={() => handleSelectBagSizePreset(size)}
              >
                <Text
                  style={[
                    styles.bagPresetText,
                    selectedBagPreset === size && styles.bagPresetTextActive,
                  ]}
                >
                  {size} kg
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[
                styles.bagPresetBtn,
                selectedBagPreset === 'custom' && styles.bagPresetBtnActive,
              ]}
              onPress={() => handleSelectBagSizePreset('custom')}
            >
              <Text
                style={[
                  styles.bagPresetText,
                  selectedBagPreset === 'custom' && styles.bagPresetTextActive,
                ]}
              >
                Custom
              </Text>
            </TouchableOpacity>
          </View>

          {selectedBagPreset === 'custom' && (
            <TextInput
              style={[styles.textInput, { marginTop: 8 }]}
              value={bagSizeInput}
              onChangeText={(text) => {
                setBagSizeInput(text);
                setValidationError(null);
              }}
              keyboardType="numeric"
              placeholder="Enter custom bag size (kg)"
              placeholderTextColor="#64748B"
            />
          )}
        </View>

        {validationError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠ {validationError}</Text>
          </View>
        )}

        {/* Action Button */}
        <TouchableOpacity style={styles.calculateBtn} onPress={handleCalculate}>
          <Text style={styles.calculateBtnText}>Calculate Fertilizer Requirement</Text>
        </TouchableOpacity>
      </View>

      {/* Calculation Result */}
      {result && (
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultTitle}>CALCULATION RESULT</Text>
            <Text style={styles.resultBadge}>
              {selectedCrop.name} • {selectedFertilizer.name}
            </Text>
          </View>

          {/* Big Bags Required Box */}
          <View style={styles.bagsHighlightBox}>
            <Text style={styles.bagsLabel}>BAGS REQUIRED (ROUNDED UP)</Text>
            <Text style={styles.bagsValue}>{result.bagsRequired} <Text style={styles.bagsUnit}>Bags</Text></Text>
            <Text style={styles.bagsSub}>
              Based on {result.bagSizeKg} kg bag packaging
            </Text>
          </View>

          {/* Metric Breakdown Grid */}
          <View style={styles.resultGrid}>
            <View style={styles.resultItem}>
              <Text style={styles.resultItemLabel}>Land Area</Text>
              <Text style={styles.resultItemVal}>{result.areaAcres} acres</Text>
            </View>

            <View style={styles.resultItem}>
              <Text style={styles.resultItemLabel}>Application Rate</Text>
              <Text style={styles.resultItemVal}>{result.applicationRateKgPerAcre} kg/acre</Text>
            </View>

            <View style={styles.resultItem}>
              <Text style={styles.resultItemLabel}>Net Required</Text>
              <Text style={[styles.resultItemVal, { color: '#10B981' }]}>{result.totalRequiredKg} kg</Text>
            </View>

            <View style={styles.resultItem}>
              <Text style={styles.resultItemLabel}>Total Purchased</Text>
              <Text style={styles.resultItemVal}>{result.totalPurchasedKg} kg</Text>
            </View>
          </View>

          {/* Excess Balance */}
          <View style={styles.excessRow}>
            <Text style={styles.excessLabel}>Excess / Residual Fertilizer:</Text>
            <Text style={styles.excessVal}>{result.remainingKg} kg</Text>
          </View>

          {/* Transparent Formula Breakdown */}
          <View style={styles.breakdownBox}>
            <Text style={styles.breakdownTitle}>TRANSPARENT FORMULA BREAKDOWN</Text>
            <Text style={styles.breakdownText}>1. {result.formulaBreakdown.totalRequiredFormula}</Text>
            <Text style={styles.breakdownText}>2. {result.formulaBreakdown.bagsFormula}</Text>
            <Text style={styles.breakdownText}>3. {result.formulaBreakdown.remainingFormula}</Text>
          </View>
        </View>
      )}

      {/* Recent Calculations History */}
      <View style={styles.historySection}>
        <View style={styles.historyHeader}>
          <Text style={styles.sectionHeading}>RECENT CALCULATIONS ({history.length})</Text>
          {history.length > 0 && (
            <TouchableOpacity onPress={handleClearHistory}>
              <Text style={styles.clearHistoryText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        {history.length === 0 ? (
          <View style={styles.emptyHistoryCard}>
            <Text style={styles.emptyHistoryText}>
              No previous calculations recorded yet.
            </Text>
          </View>
        ) : (
          history.map((entry) => (
            <View key={entry.id} style={styles.historyCard}>
              <View style={styles.historyCardTop}>
                <Text style={styles.historyCropFert}>
                  {entry.cropName} • {entry.fertilizerName}
                </Text>
                <Text style={styles.historyBagsBadge}>
                  {entry.result.bagsRequired} Bags ({entry.result.totalPurchasedKg} kg)
                </Text>
              </View>

              <Text style={styles.historyDetails}>
                {entry.areaAcres} acres @ {entry.rateKgPerAcre} kg/acre • Required: {entry.result.totalRequiredKg} kg
              </Text>

              <Text style={styles.historyTime}>
                {new Date(entry.timestamp).toLocaleDateString()} at{' '}
                {new Date(entry.timestamp).toLocaleTimeString()}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1120',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  disclaimerCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  disclaimerText: {
    fontSize: 11,
    color: '#CBD5E1',
    lineHeight: 16,
  },
  boldText: {
    fontWeight: '700',
    color: '#F59E0B',
  },
  contextCard: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  contextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contextLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  contextValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38BDF8',
  },
  contextNote: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 4,
    fontStyle: 'italic',
  },
  formCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionHeading: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#CBD5E1',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    color: '#F8FAFC',
    padding: 10,
    fontSize: 14,
    fontWeight: '600',
  },
  pillsScroll: {
    flexDirection: 'row',
  },
  pill: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  pillSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: '#10B981',
  },
  pillText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  pillTextSelected: {
    color: '#10B981',
    fontWeight: '700',
  },
  presetBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  presetLeft: {
    flex: 1,
    marginRight: 8,
  },
  presetTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#38BDF8',
    letterSpacing: 0.5,
  },
  presetVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 1,
  },
  presetNote: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  usePresetBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  usePresetBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bagPresetsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  bagPresetBtn: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  bagPresetBtnActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: '#10B981',
  },
  bagPresetText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  bagPresetTextActive: {
    color: '#10B981',
    fontWeight: '700',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 6,
    padding: 8,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '600',
  },
  calculateBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  calculateBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  resultCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#10B981',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  resultBadge: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  bagsHighlightBox: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  bagsLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  bagsValue: {
    fontSize: 34,
    fontWeight: '900',
    color: '#10B981',
    marginVertical: 4,
  },
  bagsUnit: {
    fontSize: 18,
    fontWeight: '700',
    color: '#94A3B8',
  },
  bagsSub: {
    fontSize: 11,
    color: '#64748B',
  },
  resultGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  resultItem: {
    width: '48%',
    backgroundColor: '#0F172A',
    borderRadius: 6,
    padding: 8,
  },
  resultItemLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
  },
  resultItemVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
    marginTop: 2,
  },
  excessRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    padding: 10,
    borderRadius: 6,
    marginBottom: 12,
  },
  excessLabel: {
    fontSize: 11,
    color: '#94A3B8',
  },
  excessVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38BDF8',
  },
  breakdownBox: {
    backgroundColor: '#0F172A',
    borderRadius: 6,
    padding: 10,
  },
  breakdownTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  breakdownText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#CBD5E1',
    marginBottom: 2,
  },
  historySection: {
    marginBottom: 16,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  clearHistoryText: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '600',
  },
  emptyHistoryCard: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  emptyHistoryText: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
  },
  historyCard: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  historyCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  historyCropFert: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  historyBagsBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  historyDetails: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 4,
  },
  historyTime: {
    fontSize: 10,
    color: '#64748B',
  },
});
