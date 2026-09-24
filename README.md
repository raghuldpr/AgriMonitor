# AgriMonitor

**AgriMonitor** is an Android-only IoT agricultural monitoring platform connected to an **ESP32** microcontroller over Bluetooth Low Energy (BLE), featuring real-time sensor telemetry, a deterministic agriculture rule engine, fertilizer requirement estimation, an AI Agriculture Assistant powered by Groq open-source LLMs via an Express backend proxy, and a Nearby Agricultural Services Finder powered by OpenStreetMap and Overpass API.

---

## 1. System Architecture (Phase 1–6)

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

## 2. Phase 6: Nearby Agricultural Services Finder

### A. Architecture & OpenStreetMap Integration
* **Data Provider:** OpenStreetMap (OSM) via public Overpass API endpoints (`https://overpass-api.de/api/interpreter`).
* **No Database / No Auth:** Operates completely local-first and in-memory without Supabase, Firebase, SQLite, or backend user accounts.
* **Privacy by Design:** Device GPS coordinates are used purely in real time to perform nearby bounding queries and are never logged, uploaded, or persisted.

### B. Supported Search Categories:
1. **🌱 All:** Combined agricultural POI search.
2. **🧪 Fertilizer:** Fertilizer retail shops and agricultural chemical suppliers (`shop=fertilizer`, `fertilizer=yes`).
3. **🌾 Seeds:** Certified seed stores and distributors (`shop=seeds`, `seeds=yes`).
4. **🚜 Agri Supplies:** Farm machinery, garden centres, and agricultural supply depots (`shop=agrarian`, `shop=farm`, `shop=garden_centre`).
5. **🏢 Agri Centers:** Agricultural markets, mandis, and storage warehouses (`amenity=marketplace`, `amenity=warehouse`, `building=agricultural`).
6. **🏛 Government Offices:** Krishi Bhavans, Raitha Samparka Kendras, and Department of Agriculture extension offices (`office=government`, `government=agriculture`).

### C. Search Radius & Geodesic Distance
* **Radius Options:** `2 km`, `5 km` (default), and `10 km`.
* **Haversine Distance Engine:** Calculates exact great-circle distance locally (`src/lib/distance.ts`) and sorts results ascending by proximity (nearest first).
* **Directions & Deep Linking:** Tapping **Directions** opens the native maps application (`geo:lat,lon` with fallback to Google Maps search). Tapping **Call** initiates a direct phone dialer intent when phone tags exist.

### D. Map Attribution & Notice
* **Attribution:** The map visualizer and place cards prominently display `© OpenStreetMap contributors`.
* **Coverage Notice:**
  > **Nearby locations are based on OpenStreetMap data. Coverage and accuracy may vary by location. The application does not guarantee that every agricultural shop or government center in the area is listed.**

---

## 3. Phase 5: AI Agriculture Assistant & Express Proxy

### A. Provider Isolation & Architecture
* **Frontend-Backend Decoupling:** The mobile app only communicates with `POST /api/chat`. It does not know which LLM provider or model is used.
* **Secret Protection:** The `GROQ_API_KEY` remains strictly on the Express backend and is **never** bundled into the React Native app, `.env` mobile files, `app.json`, or Git.
* **Provider Abstraction:** Implemented via `AIProvider` interface and `GroqProvider` class (`server/ai/groqProvider.ts`), managed by `AIService` (`server/ai/aiService.ts`).
* **Configurable Model:** Model name is read dynamically from `GROQ_MODEL` (default: `llama-3.3-70b-versatile`).

### B. Sensor Context Injection
Every AI chat request passes live sensor context and active alerts into the backend prompt builder (`server/ai/prompts.ts`):
```text
CURRENT AGRIMONITOR FIELD TELEMETRY:
- Ambient Temperature: 34.2 °C
- Relative Humidity: 58 %
- Soil Moisture: 18 %
- TDS (Mineral Conductivity): 620 ppm

ACTIVE RULE ENGINE ALERTS:
- [WARNING] soilMoisture: LOW (Value: 18) - Dry root zone detected...

AGRONOMIC CONTEXT GUIDELINES:
- TDS reflects dissolved mineral salts / conductivity, not isolated N, P, or K levels.
- All sensor thresholds are prototype defaults.
```

### C. Agronomic Safety & Rule Engine Independence
* **No AI Override:** The deterministic rule engine (`agricultureRules.ts`) remains the sole authority for sensor status, thresholds, and alert generation.
* **TDS vs NPK Mandate:** The AI is strictly instructed that TDS measures total dissolved mineral salts/electrical conductivity and **never** directly assays isolated Nitrogen, Phosphorus, or Potassium concentrations.
* **Fertilizer Calculator Independence:** The chatbot explains concepts and directs users to the dedicated Fertilizer Calculator rather than calculating unverified field bag requirements.

### D. Offline Common-Questions Matcher
Standard agricultural queries are answered instantly on-device without network latency:
* *What is TDS? / What does TDS mean?*
* *What is soil moisture?*
* *What does DHT11 measure?*
* *What does humidity mean?*
* *What is ppm?*
* *How does temperature affect crops?*

### E. Local Storage Isolation
* Chat history is stored locally in AsyncStorage under `@agrimonitor_chat_history` (capped at **100 messages**).
* Clearing chat history does **not** wipe alerts, telemetry cache, or fertilizer logs.

---

## 4. Backend Setup & Configuration

### A. Environment Variables
Copy `.env.example` to `server/.env`:
```bash
cp .env.example server/.env
```

Configure `server/.env`:
```env
GROQ_API_KEY=your_actual_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
PORT=3001
```

### B. Running the Express Backend Server
```bash
npm run server
```

Verify backend health:
```bash
curl http://localhost:3001/health
```

---

## 5. Mobile API Configuration & LAN Setup

Mobile endpoint configurations are centralized in `src/config/api.ts`:
* **Android Emulator:** Uses `http://10.0.2.2:3001` automatically.
* **Physical Android Device:** Set `API_CONFIG.BASE_URL` to your development computer's LAN IP (e.g., `http://192.168.1.100:3001`). Both your phone and computer must be connected to the same Wi-Fi network.

---

## 6. Fertilizer Calculator Specifications (Phase 4)

### Mathematical Formulations:
1. $\text{Total Required (kg)} = \text{Land Area (acres)} \times \text{Application Rate (kg/acre)}$
2. $\text{Bags Required} = \left\lceil \frac{\text{Total Required (kg)}}{\text{Bag Size (kg)}} \right\rceil$
3. $\text{Total Purchased (kg)} = \text{Bags Required} \times \text{Bag Size (kg)}$
4. $\text{Remaining Balance (kg)} = \text{Total Purchased (kg)} - \text{Total Required (kg)}$

### Supported Crops & Fertilizer Catalogs:
* **Crops:** Rice (Paddy), Maize (Corn), Tomato, Groundnut (Peanut), Cotton, Chilli.
* **Fertilizers:** Urea (46% N, 45 kg), DAP (18-46-0, 50 kg), MOP (0-0-60, 50 kg), NPK 10-26-26 (50 kg), NPK 20-20-20 (25 kg).

---

## 7. Deterministic Agriculture Rule Engine & Prototype Thresholds (Phase 3)

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

## 8. ESP32 Hardware Pin Mapping (Phase 2)

```cpp
#define DHT_PIN 4            // Digital Data Pin (DHT11 Temperature & Humidity)
#define DHT_TYPE DHT11

#define SOIL_MOISTURE_PIN 34 // Analog ADC1_CH6 (Capacitive Soil Moisture)
#define TDS_SENSOR_PIN 35    // Analog ADC1_CH7 (Analog TDS Sensor)
#define STATUS_LED_PIN 2     // Digital Output (Connection Status LED)
```

---

## 9. Verification & Test Suites

Run the complete 7-suite verification suite:
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
```

---

## 10. Security & AI Advisory Scope

* **API Keys:** No API keys are stored in client code, bundles, or version control.
* **Sanitization:** Backend validates message length (max 4000 chars), sanitizes numeric telemetry values, and truncates historical messages to 15 entries.
* **Agronomic Advisory Limitation:**
  > **The AI assistant provides general agricultural information and interpretation. It does not replace crop-specific agronomic advice, soil testing, product labels, or local agricultural guidance.**
