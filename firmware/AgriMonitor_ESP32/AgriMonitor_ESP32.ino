/*
 * ============================================================================
 * AGRIMONITOR ESP32 BLE FIRMWARE (Phase 2 — Real Sensors + Live Telemetry)
 * ============================================================================
 * Target Board: ESP32 DevKit V1
 * Architecture: ESP32 (DHT11 + Soil Moisture + TDS) -> BLE GATT -> Android App
 *
 * ----------------------------------------------------------------------------
 * HARDWARE PIN ASSIGNMENTS & WIRING (CONFIGURABLE SECTION)
 * ----------------------------------------------------------------------------
 * 1. DHT11 (Ambient Temperature & Relative Humidity Sensor)
 *    - DATA Pin -> GPIO 4
 *    - VCC      -> 3.3V
 *    - GND      -> GND
 *    - (Note: 10k pull-up resistor between DATA and VCC recommended if bare sensor)
 *
 * 2. Soil Moisture Sensor (Analog / Capacitive or Resistive)
 *    - AOUT Pin -> GPIO 34 (ADC1_CH6, input only)
 *    - VCC      -> 3.3V
 *    - GND      -> GND
 *
 * 3. Analog TDS Meter Sensor (Total Dissolved Solids / Mineral Conductivity)
 *    - AOUT Pin -> GPIO 35 (ADC1_CH7, input only)
 *    - VCC      -> 3.3V
 *    - GND      -> GND
 *
 * 4. Status Indicator LED
 *    - Anode    -> GPIO 2 (ESP32 Built-in Blue LED)
 * ----------------------------------------------------------------------------
 *
 * BLE GATT SERVER SPECIFICATION:
 * ----------------------------------------------------------------------------
 * Advertised Name: AgriMonitor-ESP32
 * Service UUID:    189a0001-e200-4424-9b55-d142d7c50a12
 * Data Char UUID:   189a0002-e200-4424-9b55-d142d7c50a12 (READ | NOTIFY)
 * Control Char UUID: 189a0003-e200-4424-9b55-d142d7c50a12 (WRITE)
 * ============================================================================
 */

#include <Wire.h>
#include <DHT.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// ============================================================================
// HARDWARE PIN DEFINITIONS
// ============================================================================
#define DHT_PIN 4
#define DHT_TYPE DHT11

#define SOIL_MOISTURE_PIN 34
#define TDS_SENSOR_PIN 35
#define STATUS_LED_PIN 2

// ============================================================================
// BLE GATT UUID DEFINITIONS
// ============================================================================
#define BLE_DEVICE_NAME "AgriMonitor-ESP32"
#define SERVICE_UUID "189a0001-e200-4424-9b55-d142d7c50a12"
#define DATA_CHARACTERISTIC_UUID "189a0002-e200-4424-9b55-d142d7c50a12"
#define CONTROL_CHARACTERISTIC_UUID "189a0003-e200-4424-9b55-d142d7c50a12"

// ============================================================================
// SENSOR CALIBRATION & TIMING PARAMETERS
// ============================================================================
const unsigned long SAMPLING_INTERVAL_MS = 2000;
const float VREF = 3.3; // ESP32 ADC reference voltage

// Soil Moisture ADC Calibration constants:
// In dry air / dry soil: High ADC value (~3200)
// In water / saturated soil: Low ADC value (~1400)
// NOTE: Adjust based on your specific capacitive/resistive probe.
const int SOIL_DRY_ADC = 3200;
const int SOIL_WET_ADC = 1400;

// Initialize DHT11
DHT dhtSensor(DHT_PIN, DHT_TYPE);

// BLE Server Objects
BLEServer* pServer = nullptr;
BLECharacteristic* pDataCharacteristic = nullptr;
BLECharacteristic* pControlCharacteristic = nullptr;
bool deviceConnected = false;
bool oldDeviceConnected = false;

// Telemetry State (Initialized with baseline valid readings)
float currentTemperature = 25.0;
float currentHumidity = 60.0;
float currentSoilMoisture = 50.0;
int currentTds = 500;
unsigned long lastSampleTime = 0;

// ============================================================================
// BLE SERVER CALLBACKS
// ============================================================================
class AgriServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    deviceConnected = true;
    digitalWrite(STATUS_LED_PIN, HIGH);
    Serial.println("\n[AgriMonitor BLE] >>> Android client connected!");
  }

  void onDisconnect(BLEServer* pServer) {
    deviceConnected = false;
    digitalWrite(STATUS_LED_PIN, LOW);
    Serial.println("\n[AgriMonitor BLE] <<< Android client disconnected. Advertising restarted.");
  }
};

class AgriControlCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* pCharacteristic) {
    String rxValue = pCharacteristic->getValue().c_str();
    if (rxValue.length() > 0) {
      Serial.print("[AgriMonitor Control RX]: ");
      Serial.println(rxValue);
    }
  }
};

// ============================================================================
// SENSOR READING & CALIBRATION FUNCTIONS
// ============================================================================

/**
 * Read DHT11 Temperature and Humidity with error handling
 */
void readDhtSensor() {
  float t = dhtSensor.readTemperature();
  float h = dhtSensor.readHumidity();

  if (isnan(t) || isnan(h)) {
    Serial.println("[DHT11 WARNING]: Sensor read failure. Retaining last known valid reading.");
  } else {
    // Validate reasonable environmental bounds (-40 to 80°C, 0 to 100%)
    if (t >= -40.0 && t <= 80.0) currentTemperature = t;
    if (h >= 0.0 && h <= 100.0) currentHumidity = h;
  }
}

/**
 * Read Soil Moisture sensor (Analog) and map calibrated 0-100%
 */
float readSoilMoistureSensor() {
  int rawAdc = analogRead(SOIL_MOISTURE_PIN);
  
  // Constrain within calibration bounds
  int constrainedAdc = constrain(rawAdc, SOIL_WET_ADC, SOIL_DRY_ADC);
  
  // Inverse mapping: Dry ADC -> 0%, Wet ADC -> 100%
  float percentage = map(constrainedAdc, SOIL_DRY_ADC, SOIL_WET_ADC, 0, 100);
  
  // Clamp 0% <= soilMoisture <= 100%
  if (percentage < 0.0) percentage = 0.0;
  if (percentage > 100.0) percentage = 100.0;

  Serial.printf("[Soil] Raw ADC: %d | Moisture: %.1f %%\n", rawAdc, percentage);
  return percentage;
}

/**
 * Read Analog TDS Sensor with temperature compensation
 *
 * NOTE ON LIMITATION:
 * Atmospheric temperature from DHT11 is used here as an approximation
 * for the solution temperature compensation. Atmospheric temp is not
 * identical to liquid temp, but provides reasonable baseline compensation.
 */
int readTdsSensor(float tempC) {
  int rawAdc = analogRead(TDS_SENSOR_PIN);
  float voltage = (rawAdc / 4095.0) * VREF;

  // Temperature compensation formula (standard 2% per °C above/below 25°C)
  float tempCoefficient = 1.0 + 0.02 * (tempC - 25.0);
  if (tempCoefficient <= 0.1) tempCoefficient = 0.1;
  float compensationVoltage = voltage / tempCoefficient;

  // Standard analog TDS meter conversion polynomial
  float tdsValue = (133.42 * pow(compensationVoltage, 3) 
                  - 255.86 * pow(compensationVoltage, 2) 
                  + 857.39 * compensationVoltage) * 0.5;

  // Clamp 0 to 5000 ppm
  int clampedTds = constrain((int)tdsValue, 0, 5000);

  Serial.printf("[TDS] Raw ADC: %d | Voltage: %.2f V | Comp. TDS: %d ppm\n", rawAdc, voltage, clampedTds);
  return clampedTds;
}

/**
 * Construct and transmit validated JSON telemetry packet over BLE
 */
void sendBleTelemetry() {
  if (!deviceConnected || pDataCharacteristic == nullptr) {
    return;
  }

  // Construct compact JSON payload
  String jsonPayload = "{";
  jsonPayload += "\"temperature\":" + String(currentTemperature, 1) + ",";
  jsonPayload += "\"humidity\":" + String(currentHumidity, 1) + ",";
  jsonPayload += "\"soilMoisture\":" + String(currentSoilMoisture, 1) + ",";
  jsonPayload += "\"tds\":" + String(currentTds);
  jsonPayload += "}";

  pDataCharacteristic->setValue(jsonPayload.c_str());
  pDataCharacteristic->notify();

  Serial.print("[BLE NOTIFY TX]: ");
  Serial.println(jsonPayload);
}

// ============================================================================
// ARDUINO SETUP
// ============================================================================
void setup() {
  Serial.begin(115200);
  delay(500);

  pinMode(STATUS_LED_PIN, OUTPUT);
  digitalWrite(STATUS_LED_PIN, LOW);

  // Set ADC resolution to 12-bit (0 - 4095)
  analogReadResolution(12);

  // Initialize DHT11 sensor
  dhtSensor.begin();

  Serial.println("\n========================================================");
  Serial.println("  AGRIMONITOR ESP32 AGRICULTURE NODE — STARTUP");
  Serial.println("========================================================");
  Serial.println("Pin Assignments:");
  Serial.printf("  - DHT11 Data Pin:       GPIO %d\n", DHT_PIN);
  Serial.printf("  - Soil Moisture Pin:    GPIO %d\n", SOIL_MOISTURE_PIN);
  Serial.printf("  - TDS Sensor Pin:       GPIO %d\n", TDS_SENSOR_PIN);
  Serial.printf("  - Status LED Pin:       GPIO %d\n", STATUS_LED_PIN);
  Serial.println("--------------------------------------------------------");

  // Initialize BLE Device
  BLEDevice::init(BLE_DEVICE_NAME);
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new AgriServerCallbacks());

  // Create Primary GATT Service
  BLEService* pService = pServer->createService(SERVICE_UUID);

  // Create Data Telemetry Characteristic
  pDataCharacteristic = pService->createCharacteristic(
    DATA_CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
  );
  pDataCharacteristic->addDescriptor(new BLE2902());

  // Create Control Characteristic
  pControlCharacteristic = pService->createCharacteristic(
    CONTROL_CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_WRITE
  );
  pControlCharacteristic->setCallbacks(new AgriControlCallbacks());

  pService->start();

  // Start BLE Advertising
  BLEAdvertising* pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();

  Serial.println("[AgriMonitor BLE] BLE GATT Server active & advertising.");
  Serial.println("[AgriMonitor BLE] Advertised Device Name: " BLE_DEVICE_NAME);
  Serial.println("[AgriMonitor BLE] Waiting for Android Mobile App connection...\n");
}

// ============================================================================
// MAIN LOOP (NON-BLOCKING SAMPLING)
// ============================================================================
void loop() {
  unsigned long now = millis();

  if (now - lastSampleTime >= SAMPLING_INTERVAL_MS) {
    lastSampleTime = now;

    // 1. Read DHT11
    readDhtSensor();

    // 2. Read Soil Moisture (Analog)
    currentSoilMoisture = readSoilMoistureSensor();

    // 3. Read TDS Sensor (Analog with temperature compensation)
    currentTds = readTdsSensor(currentTemperature);

    // 4. Print structured Serial debugging log
    Serial.printf("[SENSORS] Temp: %.1f °C | Humidity: %.1f %% | Soil: %.1f %% | TDS: %d ppm\n",
                  currentTemperature, currentHumidity, currentSoilMoisture, currentTds);

    // 5. Transmit telemetry if BLE client connected
    if (deviceConnected) {
      sendBleTelemetry();
    }
  }

  // Handle re-advertising on disconnect
  if (!deviceConnected && oldDeviceConnected) {
    delay(500);
    pServer->startAdvertising();
    Serial.println("[AgriMonitor BLE] Re-started advertising after disconnect.");
    oldDeviceConnected = deviceConnected;
  }
  if (deviceConnected && !oldDeviceConnected) {
    oldDeviceConnected = deviceConnected;
  }
}
