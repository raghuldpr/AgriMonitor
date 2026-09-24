# AgriMonitor

**AgriMonitor** is an Android-only IoT agricultural monitoring platform connected to an **ESP32** microcontroller over Bluetooth Low Energy (BLE).

---

## 1. System Architecture & Live Telemetry Pipeline (Phase 2)

```text
[ Hardware Sensors ]
  ├── DHT11 Sensor (GPIO 4) ──────────► Temperature (°C) + Humidity (%)
  ├── Analog Soil Probe (GPIO 34) ────► Calibrated Soil Moisture (%)
  └── Analog TDS Sensor (GPIO 35) ────► Temperature-Compensated TDS (ppm)
                    │
                    ▼
          [ ESP32 Microcontroller ]
                    │ (BLE GATT Notifications - 2000ms Interval)
                    ▼
          [ AgriMonitor BLE Service ]
                    │
                    ▼
         [ SensorParser Validator ] ──► (Strict Bounds Checking)
                    │
                    ▼
        [ useTelemetry Reactive Hook ] ──► (AsyncStorage Persistence Skeleton)
                    │
                    ▼
        [ Live Agriculture Dashboard ]
```

---

## 2. Hardware Specification & Pin Assignments

| Sensor / Component | Type / Interface | ESP32 Pin | Purpose | Calibration & Range |
|---|---|---|---|---|
| **DHT11** | Digital 1-Wire | **GPIO 4** | Ambient Air Temp & Relative Humidity | `-40°C to 80°C`, `0% to 100%` |
| **Soil Moisture Sensor** | Analog ADC (ADC1_CH6) | **GPIO 34** | Volumetric Soil Moisture | Calibrated: Dry ADC `3200` ➔ `0%`, Wet ADC `1400` ➔ `100%` |
| **Analog TDS Sensor** | Analog ADC (ADC1_CH7) | **GPIO 35** | Total Dissolved Solids / Mineral Conductivity | `0 to 5000 ppm` with temperature compensation formula |
| **Status LED** | Digital Output | **GPIO 2** | Built-in BLE Link Connection Indicator | High = Connected, Low = Disconnected |

> **Note on Soil Sensor Types:** Both capacitive (corrosion-resistant) and resistive sensors output analog voltage mapped inversely to moisture content. Adjust `SOIL_DRY_ADC` and `SOIL_WET_ADC` in `AgriMonitor_ESP32.ino` for your specific probe & soil composition.

> **Note on TDS Limitation:** Atmospheric temperature from the DHT11 sensor is used as an approximation for solution temperature compensation. Liquid solution temperature may differ from ambient air temperature. TDS indicates total dissolved mineral salts and electrical conductivity, not individual N/P/K nutrient quantities.

---

## 3. BLE GATT Specification

* **Advertised Device Name:** `AgriMonitor-ESP32`
* **Primary Service UUID:** `189a0001-e200-4424-9b55-d142d7c50a12`
* **Data Characteristic UUID (READ | NOTIFY):** `189a0002-e200-4424-9b55-d142d7c50a12`
* **Control Characteristic UUID (WRITE):** `189a0003-e200-4424-9b55-d142d7c50a12`

### Telemetry Packet Format (JSON)
```json
{
  "temperature": 27.4,
  "humidity": 62.0,
  "soilMoisture": 48.5,
  "tds": 540
}
```

---

## 4. Live Dashboard UI Features

* **Soil Moisture Gauge Card:** Real-time level progress bar with agricultural state badges (`OPTIMAL (40–70%)`, `LOW / DRY (<30%)`, `HIGH MOISTURE`, `SATURATED`).
* **Temperature & Humidity Cards:** Ambient climate indicators with technical unit formatting.
* **TDS Card:** Mineral conductivity index with agronomic context.
* **Real-Time BLE Status Ribbon:** Dynamic connection badge (`● Connected`, `○ Connecting...`, `○ Disconnected`, `⚠ Reconnecting...`) with one-tap scanner modal.
* **Stale / Disconnected Indicators:** Distinguishes live readings from last valid cached values, avoiding deceptive `0` readings.
* **Hardware Information:** Displays active node descriptors and GATT UUIDs.

---

## 5. Development & Verification Commands

### Run TypeScript Verification
```bash
npx tsc --noEmit
```

### Run Telemetry & BLE State Unit Tests
```bash
npx tsx src/tests/telemetry_state_test.ts
```

### Run Sensor Parser Unit Tests
```bash
npx tsx src/tests/sensor_parser_test.ts
```

### Start Express Backend
```bash
npm run server
```

### Start Expo App
```bash
npx expo start
```
