# AgriMonitor

**AgriMonitor** is an Android IoT agricultural monitoring platform connected to an **ESP32** microcontroller over Bluetooth Low Energy (BLE).

---

## System Overview

```text
[ Soil Moisture + TDS + DHT11 ]
              │
              ▼
    [ ESP32 Microcontroller ]
              │ (BLE Notifications - 128-bit Custom GATT UUIDs)
              ▼
    [ Android React Native App ]
              │
    ┌─────────┼────────────────────────┬────────────────┐
    ▼         ▼                        ▼                ▼
[Dashboard] [Rule Engine & Alerts] [Fertilizer Calc] [AI Advisor (Groq)]
```

---

## Monitored Parameters

* **Temperature (°C)**: Ambient temperature via DHT11/DHT22.
* **Humidity (%)**: Relative air humidity.
* **Soil Moisture (%)**: Calibrated volumetric moisture percentage (0-100%).
* **TDS (ppm)**: Total Dissolved Solids / mineral conductivity index.
* **Soil pH (Manual Input)**: Prototype mode with extensible manual input for pH calculation.

---

## Directory Structure

```text
AgriMonitor/
├── src/
│   ├── components/                 # Reusable UI components
│   ├── screens/
│   │   ├── Dashboard/              # Live telemetry gauges & cards
│   │   ├── Assistant/              # Groq AI Agriculture Assistant
│   │   ├── Nearby/                 # Nearby seed/fertilizer shop locator
│   │   ├── Fertilizer/             # Fertilizer & acreage bag calculator
│   │   └── Alerts/                 # Rule engine alerts & log
│   ├── navigation/                 # App navigation
│   ├── services/
│   │   ├── ble/                    # BLE Manager, parser, config, permissions
│   │   ├── ai/                     # AI proxy client
│   │   ├── maps/                   # Location & map services
│   │   └── storage/                # AsyncStorage local persistence
│   ├── lib/
│   │   ├── agricultureRules.ts     # Deterministic agriculture rule engine
│   │   ├── insights.ts             # Deterministic agronomic insights
│   │   └── fertilizerCalculator.ts # Dosage & bag quantity formulas
│   ├── types/                      # TypeScript definitions
│   └── constants/                  # Theme, colors, thresholds
├── server/
│   └── server.ts                   # Express API gateway with Groq SDK
├── firmware/
│   └── AgriMonitor_ESP32/          # ESP32 Arduino BLE firmware
├── app.json                        # Expo & Android BLE configuration
├── package.json
└── tsconfig.json
```

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Express AI Gateway
```bash
npm run server
```

### 3. Start Expo Android Dev Server
```bash
npm start
```
