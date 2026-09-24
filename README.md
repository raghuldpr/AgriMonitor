# AgriMonitor

**AgriMonitor** is an Android-only IoT agricultural monitoring platform connected to an **ESP32** microcontroller over Bluetooth Low Energy (BLE), featuring real-time sensor telemetry, a deterministic agriculture rule engine, fertilizer requirement estimation, an AI Agriculture Assistant powered by Groq open-source LLMs via an Express backend proxy, and a Nearby Agricultural Services Finder powered by OpenStreetMap and Overpass API.

---

## 1. System Architecture (Phases 1–7)

```text
[ ESP32 Hardware: DHT11 + Soil Moisture + TDS ]
                       │
                       ▼ (BLE GATT Notifications every 2000ms)
            [ Android BLE Service ]
                       │
                       ▼
             [ SensorParser.ts ] ──► (Strict Technical Bounds Validation)
                       │
                       ▼
              [ useTelemetry ] ──► (State & Local Persistence)
                       │
         ┌─────────────┼─────────────────────────────┬───────────────────────────┐
         ▼             ▼                             ▼                           ▼
  [ Rule Engine ]  [ Fertilizer Calculator ]  [ AI Chatbot UI ]           [ Nearby Services ]
  (Alerts/Insight) (Deterministic Bags)       (Offline & Online)          (OSM Overpass POIs)
         │             │                             │                           │
         └─────────────┼─────────────────────────────┤                           │
                       ▼                             │                           ▼
            [ Android Mobile UI ]                    │                   [ Device GPS / OSM ]
                                                     ▼ POST /api/chat
                                        ┌───────────────────────────────┐
                                        │ Express AI Proxy Backend      │
                                        │  ├── Request Validation       │
                                        │  ├── Sensor Context Injection │
                                        │  └── Groq Provider Abstraction│
                                        └──────────────┬────────────────┘
                                                       │ Groq API (Backend-Only)
                                                       ▼
                                        [ Open-Source LLM (Llama 3.3) ]
```

---

## 2. Phase 7: Physical Hardware Integration & Validation

### A. Hardware Pinout & Wiring Specifications

| Component | Pin Function | ESP32 GPIO | Operating Voltage | Notes |
|---|---|---|---|---|
| **DHT11** | Data Out | `GPIO 4` | 3.3V / 5V | Ambient temperature & relative air humidity |
| **Capacitive/Analog Soil Moisture** | Analog Out (AOUT) | `GPIO 34` (ADC1_CH6) | 3.3V | Volumetric root-zone moisture percentage |
| **Analog TDS Meter** | Analog Out (AOUT) | `GPIO 35` (ADC1_CH7) | 3.3V | Total dissolved solids / mineral conductivity |
| **Status LED** | Anode | `GPIO 2` | 3.3V | Built-in Blue LED (Blinks advertising, Solid connected) |

### B. BLE GATT Profile Specification
* **Device Advertised Name:** `AgriMonitor-ESP32`
* **Primary Service UUID:** `189a0001-e200-4424-9b55-d142d7c50a12`
* **Data Characteristic (Notify/Read):** `189a0002-e200-4424-9b55-d142d7c50a12`
* **Control Characteristic (Write):** `189a0003-e200-4424-9b55-d142d7c50a12`

### C. Live Telemetry Packet Format
Transmitted every 2000 ms via non-blocking sampling loop:
```json
{
  "temperature": 28.5,
  "humidity": 65.0,
  "soilMoisture": 45.0,
  "tds": 580
}
```

### D. Soil Moisture Calibration & Boundary Clamping
The firmware implements constrained inverse analog mapping:
```cpp
const int SOIL_DRY_ADC = 3200; // Sensor in dry air / desiccated soil
const int SOIL_WET_ADC = 1400; // Sensor submerged in water / saturated soil

int constrainedAdc = constrain(rawAdc, SOIL_WET_ADC, SOIL_DRY_ADC);
float percentage = map(constrainedAdc, SOIL_DRY_ADC, SOIL_WET_ADC, 0, 100);
```
> **Calibration Note:** Soil sensor output varies across probe types (resistive vs capacitive) and soil mineral density. Adjust `SOIL_DRY_ADC` and `SOIL_WET_ADC` in `firmware/AgriMonitor_ESP32/AgriMonitor_ESP32.ino` for your specific field probe.

### E. TDS Measurement & Temperature Compensation
* Atmospheric temperature from DHT11 provides baseline thermal compensation:
$$\text{Compensated Voltage} = \frac{\text{Raw Voltage}}{1.0 + 0.02 \times (T_{\text{ambient}} - 25.0)}$$
* **Limitation Notice:** Atmospheric temperature is an approximation. TDS represents overall electrical conductivity across dissolved mineral salts and **does not** identify specific Nitrogen, Phosphorus, or Potassium concentrations.

---

## 3. Phase 6: Nearby Agricultural Services Finder

* **Data Provider:** OpenStreetMap via public Overpass API.
* **Supported Categories:** `All`, `Fertilizer Shops`, `Seed Stores`, `Agri Supplies`, `Agri Centers / Mandis`, `Government Offices`.
* **Search Radii:** `2 km`, `5 km`, `10 km`.
* **Haversine Distance:** Computed on-device (`src/lib/distance.ts`) and sorted ascending.
* **Directions:** Native map deep link (`geo:lat,lon`).
* **Attribution:** `© OpenStreetMap contributors`.

---

## 4. Phase 5: AI Agriculture Assistant & Express Proxy

* **Provider Isolation:** Android app connects solely to `POST /api/chat`. `GROQ_API_KEY` remains strictly backend-only.
* **Sensor Context Injection:** Live field readings and active alerts are automatically passed to system prompts.
* **Offline Matcher:** Instant offline explanations for TDS, moisture, DHT11, ppm, and temperature concepts.
* **Storage Isolation:** Chat history stored under `@agrimonitor_chat_history` (capped at 100 messages).

---

## 5. Backend Setup & Configuration

```bash
cp .env.example server/.env
npm run server
```

Verify backend health:
```bash
curl http://localhost:3001/health
```

---

## 6. Fertilizer Calculator Specifications (Phase 4)

* $\text{Total Required (kg)} = \text{Land Area (acres)} \times \text{Application Rate (kg/acre)}$
* $\text{Bags Required} = \left\lceil \frac{\text{Total Required (kg)}}{\text{Bag Size (kg)}} \right\rceil$
* $\text{Total Purchased (kg)} = \text{Bags Required} \times \text{Bag Size (kg)}$
* $\text{Remaining (kg)} = \text{Total Purchased (kg)} - \text{Total Required (kg)}$

---

## 7. Deterministic Agriculture Rule Engine (Phase 3)

| Parameter | Range | Status | Severity | Agronomic Context |
|---|---|---|---|---|
| **Soil Moisture** | `< 20%` | `VERY_LOW` | **CRITICAL** | Severe drought stress |
| | `20% – 30%` | `LOW` | **WARNING** | Low moisture |
| | `30% – 70%` | `NORMAL` | **INFO** | Optimal crop band |
| | `70% – 85%` | `HIGH` | **INFO** | High moisture |
| | `> 85%` | `SATURATED` | **WARNING** | Waterlogging risk |
| **Temperature** | `< 5.0°C` | `VERY_LOW` | **CRITICAL** | Frost hazard |
| | `5.0°C – 15.0°C` | `LOW` | **WARNING** | Cool weather |
| | `15.0°C – 35.0°C` | `NORMAL` | **INFO** | Typical vegetative range |
| | `35.0°C – 40.0°C` | `HIGH` | **WARNING** | Thermal stress |
| | `> 40.0°C` | `VERY_HIGH` | **CRITICAL** | Severe heat stress |
| **TDS (Solids)** | `< 200 ppm` | `LOW` | **WARNING** | Low mineral conductivity |
| | `200 – 1200 ppm` | `NORMAL` | **INFO** | Balanced baseline |
| | `1200 – 2000 ppm` | `HIGH` | **WARNING** | Elevated mineral salts |
| | `> 2000 ppm` | `VERY_HIGH` | **CRITICAL** | High salinity risk |
| **Humidity** | `< 30%` | `LOW` | **INFO** | Low humidity |
| | `30% – 80%` | `NORMAL` | **INFO** | Typical canopy humidity |
| | `> 80%` | `HIGH` | **INFO** | High humidity |

---

## 8. Physical Hardware Flashing & Manual Testing Guide

### A. Flashing the ESP32
1. Open `firmware/AgriMonitor_ESP32/AgriMonitor_ESP32.ino` in Arduino IDE.
2. Install required libraries: `DHT sensor library` by Adafruit, `ESP32 BLE Arduino`.
3. Select board: `ESP32 Dev Module` or `NodeMCU-32S`.
4. Connect ESP32 via USB and upload.
5. Open Serial Monitor at **115200 baud** to view live sensor readings and BLE connection events.

### B. Manual Hardware Verification Checklist
- [ ] **Power-on:** Status LED on GPIO 2 is OFF / blinking while waiting for connection.
- [ ] **BLE Discovery:** Open AgriMonitor Android App, tap "Scan & Connect". Confirm `AgriMonitor-ESP32` appears.
- [ ] **Connection:** Tap `AgriMonitor-ESP32`. Status LED on GPIO 2 turns SOLID ON.
- [ ] **Sensor Telemetry:** Dashboard displays live DHT11 temperature, humidity, soil moisture %, and TDS ppm.
- [ ] **Dry / Wet Response:** Insert soil probe into water -> soil moisture increases towards 100%. Remove to dry air -> decreases towards 0%.
- [ ] **TDS Response:** Place TDS probe in tap water -> displays ~200-400 ppm. Add mineral salt -> displays elevated TDS.
- [ ] **Alerts & Recovery:** Trigger drought (<20%) -> Warning banner appears in Alerts tab. Re-water soil -> Recovery event marked with checkmark.

---

## 9. Verification & Automated Test Suite

Run all 8 test suites:
```bash
# 1. TypeScript Static Type Check
npx tsc --noEmit

# 2. Phase 1 Sensor Packet Parser Test
npx tsx src/tests/sensor_parser_test.ts

# 3. Phase 2 Telemetry State & Environmental Bounds Test
npx tsx src/tests/telemetry_state_test.ts

# 4. Phase 3 Rule Engine & Threshold Bounds Test
npx tsx src/tests/rule_engine_test.ts

# 5. Phase 3 Alert Deduplication & Recovery Test
npx tsx src/tests/alert_deduplication_test.ts

# 6. Phase 4 Fertilizer Mathematical Engine Test
npx tsx src/tests/fertilizer_calculator_test.ts

# 7. Phase 5 AI Assistant Validation, Matcher & Persistence Test
npx tsx src/tests/ai_chat_test.ts

# 8. Phase 6 Nearby OpenStreetMap Services & Distance Test
npx tsx src/tests/nearby_test.ts

# 9. Phase 7 Physical Hardware Integration & System Validation Test
npx tsx src/tests/hardware_validation_test.ts
```

---

## 10. Security & Advisory Scope

* **API Keys:** No API keys are stored in client code, bundles, or version control.
* **Sanitization:** Backend validates message length (max 4000 chars), sanitizes numeric telemetry values, and truncates historical messages to 15 entries.
* **Agronomic Advisory Limitation:**
  > **The AI assistant provides general agricultural information and interpretation. It does not replace crop-specific agronomic advice, soil testing, product labels, or local agricultural guidance.**
