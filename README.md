# AgriMonitor

**AgriMonitor** is an Android-only IoT agricultural monitoring platform connected to an **ESP32** microcontroller over Bluetooth Low Energy (BLE).

---

## 1. System Pipeline & Phase 4 Architecture

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
          ┌────────────┴───────────────────────────┐
          ▼                                        ▼
  [ Agriculture Rule Engine ]            [ Fertilizer Calculator ]
  (Deduplicated Alerts & Insights)       (Deterministic Acreage & Bags)
          │                                        │
          └────────────────────┬───────────────────┘
                               │
                               ▼
                [ Live Mobile Dashboard ]
                [ Alert & Event History ]
                [ Fertilizer Estimation Engine ]
```

---

## 2. Fertilizer Calculator Engine & Specifications

### A. Mathematical Formula
1. **Total Required Fertilizer (kg):**
   $$\text{Total Required (kg)} = \text{Land Area (acres)} \times \text{Application Rate (kg/acre)}$$
2. **Bags Required (Rounded Up):**
   $$\text{Bags Required} = \left\lceil \frac{\text{Total Required (kg)}}{\text{Bag Size (kg)}} \right\rceil$$
3. **Total Purchased Fertilizer (kg):**
   $$\text{Total Purchased (kg)} = \text{Bags Required} \times \text{Bag Size (kg)}$$
4. **Excess / Remaining Balance (kg):**
   $$\text{Remaining (kg)} = \text{Total Purchased (kg)} - \text{Total Required (kg)}$$

### B. Supported Prototype Catalogs:
* **Crops:** Rice (Paddy), Maize (Corn), Tomato, Groundnut (Peanut), Cotton, Chilli.
* **Fertilizer Products:**
  * Urea (46% N, default 45 kg bag)
  * DAP (18-46-0, default 50 kg bag)
  * MOP (0-0-60, default 50 kg bag)
  * NPK 10-26-26 (Complex, default 50 kg bag)
  * NPK 20-20-20 (All-purpose, default 25 kg bag)

### C. Agronomic & Sensor Limitations Notice:
> ⚠️ **IMPORTANT AGRONOMIC NOTICE:**
> - Fertilizer rates and presets provided in AgriMonitor are **prototype reference values** and **NOT universal agronomic prescriptions**.
> - Exact application should follow certified soil-test results, crop growth stages, product labels, and local agricultural extension guidance.
> - **TDS & pH Context:** Live field TDS is displayed for monitoring only. TDS measures electrical conductivity across all dissolved ions and is **not** used to automatically infer specific N, P, or K fertilizer dosages.

### D. Local History Persistence:
* Saved under `@agrimonitor_fertilizer_history` in `AsyncStorage`.
* Capped at the latest **50 calculations** (newest first).
* Allows clearing history without affecting alert logs.

---

## 3. Deterministic Agriculture Rule Engine & Prototype Thresholds

| Parameter | Range | Status | Severity | Agronomic Context |
|---|---|---|---|---|
| **Soil Moisture** | `< 20%` | `VERY_LOW` | **CRITICAL** | Severe drought stress; immediate irrigation check |
| | `20% – 30%` | `LOW` | **WARNING** | Low moisture; check irrigation scheduling |
| | `30% – 70%` | `NORMAL` | **INFO** | Configured optimal band for common field crops |
| | `70% – 85%` | `HIGH` | **INFO** | High moisture; adequate for high-demand stages |
| | `> 85%` | `SATURATED` | **WARNING** | Waterlogging risk; root zone aeration restricted |
| **Temperature** | `< 5.0°C` | `VERY_LOW` | **CRITICAL** | Frost hazard |
| | `5.0°C – 15.0°C` | `LOW` | **WARNING** | Cool weather; slowed metabolic uptake |
| | `15.0°C – 35.0°C` | `NORMAL` | **INFO** | Typical vegetative thermal range |
| | `35.0°C – 40.0°C` | `HIGH` | **WARNING** | Thermal stress / increased evapotranspiration |
| | `> 40.0°C` | `VERY_HIGH` | **CRITICAL** | Severe heat stress risk |
| **TDS (Solids)** | `< 200 ppm` | `LOW` | **WARNING** | Low dissolved mineral conductivity |
| | `200 – 1200 ppm` | `NORMAL` | **INFO** | Balanced conductivity baseline |
| | `1200 – 2000 ppm` | `HIGH` | **WARNING** | Elevated mineral salts / salinity |
| | `> 2000 ppm` | `VERY_HIGH` | **CRITICAL** | High salinity risk; check irrigation water |
| **Humidity** | `< 30%` | `LOW` | **INFO** | Low humidity; high transpiration |
| | `30% – 80%` | `NORMAL` | **INFO** | Typical canopy humidity |
| | `> 80%` | `HIGH` | **INFO** | High humidity; monitor canopy ventilation |

---

## 4. Hardware Pin Mapping & Firmware

```cpp
#define DHT_PIN 4            // Digital Data Pin (DHT11)
#define DHT_TYPE DHT11

#define SOIL_MOISTURE_PIN 34 // Analog ADC1_CH6 (Soil Moisture Sensor)
#define TDS_SENSOR_PIN 35    // Analog ADC1_CH7 (TDS Meter Sensor)
#define STATUS_LED_PIN 2     // Digital Output (Built-in Connection LED)
```

---

## 5. Development & Testing Commands

### Run Complete Verification Test Suite
```bash
npx tsc --noEmit
npx tsx src/tests/sensor_parser_test.ts
npx tsx src/tests/telemetry_state_test.ts
npx tsx src/tests/rule_engine_test.ts
npx tsx src/tests/alert_deduplication_test.ts
npx tsx src/tests/fertilizer_calculator_test.ts
```

### Start Express Backend
```bash
npm run server
```

### Start Expo Android App
```bash
npx expo start
```
