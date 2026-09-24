# AgriMonitor — Technical Reuse & Adaptation Analysis

**Document Version:** 1.0  
**Reference Project:** `Healthiva/`  
**Target Project:** `AgriMonitor/` (Android IoT + BLE + ESP32 Agriculture Monitoring)  

---

## 1. Executive Summary

This report analyzes the reference codebase (`Healthiva`) and outlines the migration and adaptation strategy for **AgriMonitor**, an Android-exclusive, BLE-connected smart agriculture platform. 

AgriMonitor monitors:
- **Temperature (°C)**
- **Humidity (%)**
- **Soil Moisture (%)**
- **TDS (ppm / Total Dissolved Solids)**
- *Manual Soil pH Input (Prototype mode)*

Data flows directly from an **ESP32** microcontroller over **Bluetooth Low Energy (BLE)** to the **Android Application**, which performs local rule evaluation, deterministic agronomic insight generation, local persistence, fertilizer calculation, and AI-assisted agricultural advisory via an Express API proxy backed by Groq.

---

## 2. Component Categorization Matrix

### 2.1 Direct Technical Reusability (Proven Patterns)

| Component | Healthiva Source File | Adaptation in AgriMonitor | Technical Details |
|---|---|---|---|
| **BLE Connection State Machine** | `Healthiva/src/core/bleService.ts` | `AgriMonitor/src/services/ble/BleManager.ts` | 5-state lifecycle (`DISCONNECTED`, `CONNECTING`, `CONNECTED`, `RECONNECTING`, `ERROR`), 3-attempt reconnection with exponential/fixed backoff, listener subscriptions (`Set<SensorDataCallback>`). |
| **GATT Service & Characteristic Architecture** | `Healthiva/src/core/bleConfig.ts` | `AgriMonitor/src/services/ble/bleConfig.ts` | 128-bit custom Service UUID (`0000ff00-...`), Data Characteristic UUID (`0000ff01...`), Control Characteristic UUID (`0000ff02...`). |
| **Telemetry Packet Parsing Pattern** | `Healthiva/src/core/bleService.ts` (`handleCustomSensorData`) | `AgriMonitor/src/services/ble/SensorParser.ts` | Robust JSON text payload parsing with boundary validation (`{ ... }`) + fallback binary buffer unpacker (`DataView`). |
| **ESP32 BLE GATT Server Skeleton** | `Healthiva/firmware/Healthiva_ESP32_BLE/` | `AgriMonitor/firmware/AgriMonitor_ESP32/` | ESP32 Arduino BLE Server stack (`BLEDevice`, `BLEServer`, `BLEService`, `BLECharacteristic`, `BLE2902`), non-blocking timer loops, notify callbacks. |
| **AI Express Proxy Pattern** | `Healthiva/server.ts` (`handleChatRequest`, `handleInsightRequest`) | `AgriMonitor/server/server.ts` | Express server proxy pattern preventing API key exposure on mobile clients, telemetry context injection, system instruction templating, robust fallback responses on API outage. |
| **Multi-Tier Severity Evaluation Architecture** | `Healthiva/src/lib/healthRuleEngine.ts` | `AgriMonitor/src/lib/agricultureRules.ts` | Structured evaluation objects returning `{ status, severity, shortMessage, valueDisplay, badgeColorClass }` for decoupled UI consumption. |

---

### 2.2 Adaptable Components (Domain Transformation Required)

| Healthiva Component | AgriMonitor Target Component | Key Transformations |
|---|---|---|
| **Patient Vitals Model** (`heartRate`, `spo2`, `temperature`, `motion`, `fallDetected`) | **Agriculture Telemetry Model** (`temperature`, `humidity`, `soilMoisture`, `tds`, `ph`) | Replaced physiological metrics with environmental/crop metrics. Added TDS (ppm) and soil moisture calibration mappings. |
| **Health Rule Engine** (Arrhythmia, Fall, Hyperthermia rules) | **Agriculture Rule Engine** (`agricultureRules.ts`) | Configurable thresholds for Soil Moisture (drought/waterlogging), Temperature (frost/heat stress), Humidity (fungal risk), TDS (mineral salinity/conductivity awareness). Explicitly disclaim that TDS is not a sole nutrient assay. |
| **Medical Prompts & Gemini Integration** | **Agriculture Prompts & Groq Integration** (`server/server.ts` & `src/services/ai/`) | Switched to Groq API (e.g. `llama-3.3-70b-versatile` / `llama-3.1-8b-instant`). Rewrote system instructions for agronomic advisory, irrigation practices, NPK/fertilizer guidance, and standard non-diagnostic agricultural disclaimers. |
| **Web Bluetooth Browser Stack** (`navigator.bluetooth`) | **Native Android BLE Stack** (`react-native-ble-plx` / Expo BLE Plugin) | Replaced Web Bluetooth with Android Native BLE, added Android 12+ permissions (`BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`, `ACCESS_FINE_LOCATION`) in Expo config plugins. |
| **SQLite/Firestore Remote Storage** | **Local Android Storage** (`@react-native-async-storage/async-storage`) | Replaced multi-user cloud DB with 100% offline-first local storage for sensor logs, alerts history, manual pH settings, and fertilizer preferences. |
| **Medical Diagnostic UI** | **Agriculture Dashboard** (`src/screens/Dashboard/`) | Mobile-first cards displaying Soil Moisture gauge, Temp/Humidity environmental cards, TDS mineral reading, BLE link status, active alerts, and agronomic insights. |

---

### 2.3 Do NOT Reuse (Strictly Prohibited & Excluded)

| Healthiva Item / Feature | Reason for Exclusion |
|---|---|
| **Firebase / Firestore / Supabase / SQLite DB** | AgriMonitor operates with **no cloud database** and stores all sensor history locally on the Android device. |
| **Authentication / JWT / User Roles** | No login, signup, patient/caretaker/admin role splitting. AgriMonitor is an open, direct tool. |
| **Caretaker Functionality & Patient Tracking** | Strictly medical/human caretaking domain; irrelevant to agricultural monitoring. |
| **Fall Detection State Machine & MPU6500 IMU logic** | Agriculture ESP32 does not monitor human fall physics. |
| **MAX30102 PPG Heart Rate / SpO2 sensors** | Irrelevant for soil and environmental monitoring. |
| **Gemini AI `@google/genai` dependency** | AgriMonitor uses Groq API with open-source models via the Node.js proxy. |
| **TailwindCSS Web layout (`@tailwindcss/vite`)** | AgriMonitor is built with React Native / Expo Native styling & design system. |

---

## 3. BLE Architecture & Data Flow

```text
[ Soil Sensor / TDS / DHT11 ]
              │
              ▼
    [ ESP32 Microcontroller ]
              │ (BLE Notify - Custom GATT UUIDs)
              ▼
  [ Android BLE Service / Native ]
              │
              ▼
   [ AgriMonitor BleManager ]
              │
              ▼
     [ SensorParser.ts ] ──► Validates JSON / Decodes Binary
              │
              ├──► [ Application State / Context ]
              ├──► [ Local Storage (AsyncStorage) ]
              ├──► [ Agriculture Rule Engine ] ──► [ Alert Manager ]
              └──► [ Agriculture Insights ] ──► [ Dashboard UI ]
```

---

## 4. Minimum File Set to Reuse / Adapt

1. `Healthiva/src/core/bleConfig.ts` ➔ Adapt to `AgriMonitor/src/services/ble/bleConfig.ts`
2. `Healthiva/src/core/bleService.ts` ➔ Adapt lifecycle, state machine, reconnect logic into `AgriMonitor/src/services/ble/BleManager.ts` & `SensorParser.ts`
3. `Healthiva/src/lib/healthRuleEngine.ts` ➔ Adapt architectural pattern into `AgriMonitor/src/lib/agricultureRules.ts`
4. `Healthiva/server.ts` (AI proxy portion) ➔ Adapt into `AgriMonitor/server/server.ts` with Groq client
5. `Healthiva/firmware/Healthiva_ESP32_BLE/` ➔ Adapt BLE GATT Server setup into `AgriMonitor/firmware/AgriMonitor_ESP32/AgriMonitor_ESP32.ino`

---

## 5. Next Execution Steps

1. Initialize clean Expo/React Native TypeScript project in `AgriMonitor/`.
2. Configure `app.json` with Android BLE permissions and native build settings.
3. Establish directory structure according to specification.
4. Set up package dependencies (`react-native-ble-plx`, `@react-native-async-storage/async-storage`, etc.).
5. Build the modular BLE service foundation (`bleConfig.ts`, `BleManager.ts`, `SensorParser.ts`, `blePermissions.ts`).
