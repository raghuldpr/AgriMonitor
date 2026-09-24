/**
 * AgriMonitor Offline Common Question Matcher (Phase 5)
 *
 * Provides instant, offline agronomic & sensor explanations for standard questions
 * without requiring backend or internet connectivity.
 */

export interface CommonAnswer {
  matched: boolean;
  reply: string;
}

export function matchCommonQuestion(query: string): CommonAnswer {
  const normalized = query.toLowerCase().trim();

  // TDS / Total Dissolved Solids / Mineral Conductivity
  if (
    normalized.includes('what is tds') ||
    normalized.includes('what does tds mean') ||
    normalized.includes('explain tds') ||
    normalized.includes('tds meaning') ||
    normalized === 'tds'
  ) {
    return {
      matched: true,
      reply:
        '🧪 **Total Dissolved Solids (TDS)** measures the combined electrical conductivity of all inorganic mineral salts and organic matter dissolved in irrigation water or soil solution.\n\n' +
        '⚠️ **Important Agronomic Rule**: TDS does **not** directly identify specific plant nutrients such as Nitrogen (N), Phosphorus (P), or Potassium (K). A high TDS reading indicates high total dissolved ions or salinity, but certified chemical soil/water analysis is needed to determine exact N-P-K concentrations.',
    };
  }

  // Soil Moisture
  if (
    normalized.includes('what is soil moisture') ||
    normalized.includes('what does soil moisture mean') ||
    normalized.includes('explain soil moisture') ||
    normalized.includes('soil moisture meaning')
  ) {
    return {
      matched: true,
      reply:
        '🌱 **Soil Moisture** is the percentage of volumetric or relative water content held in the soil pore spaces around crop root zones.\n\n' +
        '• **Optimal Hydration**: Usually between 30% and 70% for most common agricultural crops.\n' +
        '• **Below 20%**: Indicates potential water stress or approaching the temporary wilting point.\n' +
        '• **Above 80%**: May cause waterlogging, displacing oxygen and increasing fungal root rot risk.',
    };
  }

  // DHT11 Sensor
  if (
    normalized.includes('what is dht11') ||
    normalized.includes('what does dht11 measure') ||
    normalized.includes('dht11 sensor') ||
    normalized.includes('dht11')
  ) {
    return {
      matched: true,
      reply:
        '🌡 **DHT11 Sensor** is a digital sensor that measures two essential microclimate parameters:\n\n' +
        '1. **Ambient Air Temperature** (0°C to 50°C, ±2°C accuracy)\n' +
        '2. **Relative Humidity** (20% to 90% RH, ±5% accuracy)\n\n' +
        'These readings help farmers monitor canopy heat stress and VPD (Vapor Pressure Deficit) for timely irrigation and pest protection.',
    };
  }

  // Humidity
  if (
    normalized.includes('what is humidity') ||
    normalized.includes('what does humidity mean') ||
    normalized.includes('explain humidity')
  ) {
    return {
      matched: true,
      reply:
        '💧 **Relative Humidity (RH)** is the ratio of actual moisture present in the air compared to the maximum moisture the air can hold at that specific temperature.\n\n' +
        '• **Low Humidity (<40%)**: Accelerates crop transpiration and water loss.\n' +
        '• **High Humidity (>85%)**: Inhibits natural transpiration cooling and creates ideal conditions for fungal pathogens (such as powdery mildew and blight).',
    };
  }

  // PPM / Parts Per Million
  if (
    normalized.includes('what is ppm') ||
    normalized.includes('what does ppm mean') ||
    normalized.includes('explain ppm') ||
    normalized === 'ppm'
  ) {
    return {
      matched: true,
      reply:
        '📏 **ppm (Parts Per Million)** is a unit of measurement used to express very dilute concentrations of substances.\n\n' +
        'In agricultural liquid solutions:\n' +
        '**1 ppm ≈ 1 milligram of dissolved solids per liter of water (1 mg/L)**.\n' +
        'It is commonly used by AgriMonitor to express TDS and electrical conductivity readings.',
    };
  }

  // Temperature impact on crops
  if (
    normalized.includes('how does temperature affect crops') ||
    normalized.includes('effect of temperature on crops') ||
    normalized.includes('temperature effect')
  ) {
    return {
      matched: true,
      reply:
        '☀️ **Temperature & Crop Growth**:\n\n' +
        '• **Optimal Range (18°C – 30°C)**: Maximum photosynthetic efficiency and enzyme activity for most warm-season crops.\n' +
        '• **Heat Stress (>35°C)**: Increases stomatal closure, pollen sterility, and rapid soil evaporation.\n' +
        '• **Cold/Frost (<10°C)**: Slows nutrient uptake and metabolic rate.',
    };
  }

  return { matched: false, reply: '' };
}
