# AgriMonitor

**AgriMonitor** is an Android-only IoT agricultural monitoring platform connected to an **ESP32** microcontroller over Bluetooth Low Energy (BLE).

---

## 1. Phase 1 Architecture: BLE Telemetry Pipeline

Phase 1 establishes the core hardware-to-mobile telemetry pipeline:

```text
[ ESP32 Simulated Firmware ]
              │
              ▼ (BLE Notifications every 2000ms)
   [ Android BLE GATT Client ]
              │
              ▼
    [ AgriMonitor BleManager ] ── (Scan / Connect / Reconnect Lifecycle)
              │
              ▼
      [ SensorParser.ts ] ─────── (Strict Bounds & Finiteness Validation)
              │
              ▼
   [ AgricultureTelemetry Model ]
              │
              ▼
     [ BLE Test Screen UI ]
```

---

## 2. BLE Specification & UUID Decision

### UUID Strategy: Option B (Dedicated AgriMonitor Identifiers)
To eliminate coupling and cross-talk with previous projects (e.g. Healthiva), AgriMonitor uses its own dedicated 128-bit GATT UUID namespace:

* **Advertised Device Name:** `AgriMonitor-ESP32`
* **Primary Service UUID:** `189a0001-e200-4424-9b55-d142d7c50a12`
* **Data Characteristic UUID (READ | NOTIFY):** `189a0002-e200-4424-9b55-d142d7c50a12`
* **Control Characteristic UUID (WRITE):** `189a0003-e200-4424-9b55-d142d7c50a12`

---

## 3. BLE Packet Format & Technical Bounds

Incoming BLE packets are JSON strings structured as follows:

```json
{
  "temperature": 28.5,
  "humidity": 65,
  "soilMoisture": 45,
  "tds": 580
}
```

### Sensor Validation Bounds:
* **Temperature:** `-40.0°C` to `+80.0°C`
* **Humidity:** `0.0%` to `100.0%`
* **Soil Moisture:** `0.0%` to `100.0%`
* **TDS (Total Dissolved Solids):** `0 ppm` to `5000 ppm`

*(Note: Soil pH is currently handled separately as a manual input in prototype mode and is not transmitted over BLE).*

---

## 4. Android BLE Permissions Configured

In [`app.json`](file:///c:/Users/raghu/Desktop/Hardware%20Projects/AgriMonitor/app.json) and [`src/services/ble/blePermissions.ts`](file:///c:/Users/raghu/Desktop/Hardware%20Projects/AgriMonitor/src/services/ble/blePermissions.ts):
* **Android 12+ (API 31+):**
  * `android.permission.BLUETOOTH_SCAN`
  * `android.permission.BLUETOOTH_CONNECT`
  * `android.permission.ACCESS_FINE_LOCATION`
* **Legacy Android (< API 31):**
  * `android.permission.BLUETOOTH`
  * `android.permission.BLUETOOTH_ADMIN`
  * `android.permission.ACCESS_FINE_LOCATION`

---

## 5. Directory Structure (Phase 1)

```text
AgriMonitor/
├── src/
│   ├── screens/
│   │   ├── BleTestScreen.tsx        # Interactive BLE scan/connect & telemetry verification
│   │   ├── Dashboard/               # Placeholder (Phase 2)
│   │   ├── Assistant/               # Placeholder (Phase 3)
│   │   ├── Nearby/                  # Placeholder (Phase 4)
│   │   ├── Fertilizer/              # Placeholder (Phase 5)
│   │   └── Alerts/                  # Placeholder (Phase 6)
│   ├── services/
│   │   ├── ble/
│   │   │   ├── BleManager.ts        # Central BLE scan, connect, reconnect state machine
│   │   │   ├── bleConfig.ts         # Service & characteristic UUIDs, retry policies
│   │   │   ├── SensorParser.ts      # Strict JSON packet parser & bounds checker
│   │   │   └── blePermissions.ts    # Android BLE permission checking & requests
│   │   └── storage/
│   │       └── storageService.ts    # AsyncStorage persistence skeleton
│   ├── types/
│   │   └── telemetry.ts             # AgricultureTelemetry & DeviceStatus contracts
│   ├── constants/
│   │   └── theme.ts                 # UI styling tokens
│   └── tests/
│       └── sensor_parser_test.ts    # Unit test suite for sensor validation
├── server/
│   └── server.ts                    # Express server with GET /health
├── firmware/
│   └── AgriMonitor_ESP32/
│       └── AgriMonitor_ESP32.ino    # ESP32 BLE GATT Server with simulated telemetry
├── App.tsx                          # App root rendering BLE Test Screen
├── app.json                         # Android Expo development build configuration
├── package.json
└── tsconfig.json
```

---

## 6. Development & Testing Commands

### Run TypeScript Verification
```bash
npx tsc --noEmit
```

### Run Parser Verification Tests
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
