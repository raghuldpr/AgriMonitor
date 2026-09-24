# AgriMonitor

**AgriMonitor** is an Android-only IoT agricultural monitoring platform connected to an **ESP32** microcontroller over Bluetooth Low Energy (BLE).

---

## 1. System Pipeline & Phase 3 Architecture

```text
[ Hardware Sensors: DHT11 + Soil Moisture + TDS ]
                       │
                       ▼ (BLE Notifications every 2000ms)
            [ Android BLE Service ]
                       │
                       ▼
             [ SensorParser.ts ] ──► (Strict Technical Bounds Validation)
                       │
                       ▼
              [ useTelemetry ] ──► (State & Persistence)
                       │
                       ▼
       [ Agriculture Rule Engine (Deterministic) ]
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
  [ AlertManager ]         [ Insights Generator ]
  (Deduplication &          (Actionable Farming
   Recovery Events)          Recommendations)
          │                         │
          └────────────┬────────────┘
                       │
                       ▼
          [ Live Mobile Dashboard ]
          [ Alert & Event History ]
```

---

## 2. Deterministic Agriculture Rule Engine & Thresholds

> **IMPORTANT DISCLAIMER ON THRESHOLDS:**
> All threshold values in AgriMonitor are **configurable prototype defaults** and **NOT universal agronomic standards**. Requirements vary depending on crop species, phenological stage, soil texture, climate zone, and irrigation system.

### Configurable Default Thresholds (`DEFAULT_THRESHOLDS`):

| Parameter | Range | Status | Severity | Agronomic Context |
|---|---|---|---|---|
| **Soil Moisture** | `< 20%` | `VERY_LOW` | **CRITICAL** | Drought stress; immediate irrigation check needed |
| | `20% – 30%` | `LOW` | **WARNING** | Soil moisture relatively low; check irrigation |
| | `30% – 70%` | `NORMAL` | **INFO** | Configured optimal range for common crops |
| | `70% – 85%` | `HIGH` | **INFO** | High moisture; adequate for high-demand stages |
| | `> 85%` | `SATURATED` | **WARNING** | Waterlogging risk; root aeration restricted |
| **Temperature** | `< 5.0°C` | `VERY_LOW` | **CRITICAL** | Frost hazard |
| | `5.0°C – 15.0°C` | `LOW` | **WARNING** | Cool weather; reduced metabolic uptake |
| | `15.0°C – 35.0°C` | `NORMAL` | **INFO** | Normal thermal range |
| | `35.0°C – 40.0°C` | `HIGH` | **WARNING** | High temperature; monitor evapotranspiration |
| | `> 40.0°C` | `VERY_HIGH` | **CRITICAL** | Severe heat stress risk |
| **TDS (Solids)** | `< 200 ppm` | `LOW` | **WARNING** | Low dissolved mineral conductivity |
| | `200 – 1200 ppm` | `NORMAL` | **INFO** | Balanced conductivity baseline |
| | `1200 – 2000 ppm` | `HIGH` | **WARNING** | Elevated mineral salts / salinity |
| | `> 2000 ppm` | `VERY_HIGH` | **CRITICAL** | High salinity risk; check source water |
| **Humidity** | `< 30%` | `LOW` | **INFO** | Low humidity; high transpiration |
| | `30% – 80%` | `NORMAL` | **INFO** | Typical canopy humidity |
| | `> 80%` | `HIGH` | **INFO** | High humidity; monitor canopy ventilation |

---

## 3. Alert Deduplication & Recovery Detection

Because the ESP32 streams telemetry every 2 seconds, the alert manager implements state debouncing:

```text
NORMAL ➔ LOW (Moisture = 18%)
  ↳ Alert 1 Created: "⚠ Soil moisture is very low"

LOW ➔ LOW (2 seconds later)
  ↳ Deduplicated (No duplicate alert created)

LOW ➔ LOW (4 seconds later)
  ↳ Deduplicated (No duplicate alert created)

LOW ➔ NORMAL (Moisture = 46%)
  ↳ Recovery Event Created: "✓ Soil moisture has returned to normal range"

NORMAL ➔ NORMAL
  ↳ Deduplicated (No duplicate recovery message)

NORMAL ➔ LOW (Moisture = 19%)
  ↳ Alert 2 Created: "⚠ Soil moisture is very low"
```

* **Persistence:** Alert history is stored locally in `AsyncStorage` and capped at the latest 200 entries to prevent unbounded memory growth.

---

## 4. Hardware Wiring & Pin Mapping

```cpp
#define DHT_PIN 4            // Digital Data Pin (DHT11)
#define DHT_TYPE DHT11

#define SOIL_MOISTURE_PIN 34 // Analog ADC1_CH6 (Soil Moisture Sensor)
#define TDS_SENSOR_PIN 35    // Analog ADC1_CH7 (TDS Meter Sensor)
#define STATUS_LED_PIN 2     // Digital Output (Built-in Connection LED)
```

### Sensor Limitations & Notes:
1. **Soil Moisture Calibration:** Raw ADC values (`SOIL_DRY_ADC = 3200`, `SOIL_WET_ADC = 1400`) should be calibrated to your specific soil composition and probe type (capacitive or resistive).
2. **TDS Compensation:** Atmospheric temperature from DHT11 is used as an approximation for solution temperature compensation. TDS reflects overall electrical conductivity, not specific individual N, P, or K nutrient ions.

---

## 5. Development & Testing Commands

### Run Complete Verification Test Suite
```bash
npx tsc --noEmit
npx tsx src/tests/sensor_parser_test.ts
npx tsx src/tests/telemetry_state_test.ts
npx tsx src/tests/rule_engine_test.ts
npx tsx src/tests/alert_deduplication_test.ts
```

### Start Express Backend (Health check / Future AI proxy)
```bash
npm run server
```

### Start Expo Android Development Server
```bash
npx expo start
```
