/*
 * ============================================================================
 * AGRIMONITOR ESP32 AGRICULTURE NODE FIRMWARE (BLE + SENSORS)
 * ============================================================================
 * Target Board: ESP32 DevKit V1
 * Architecture: ESP32 (Soil Moisture, TDS, DHT11) -> BLE GATT -> Android App
 * 
 * HARDWARE PIN MAPPING:
 * ----------------------------------------------------------------------------
 * 1. DHT11 / DHT22 (Temperature & Humidity Sensor)
 *    - DATA -> GPIO 4
 *    - VCC  -> 3.3V
 *    - GND  -> GND
 * 
 * 2. Capacitive / Analog Soil Moisture Sensor
 *    - AOUT -> GPIO 34 (ADC1_CH6)
 *    - VCC  -> 3.3V
 *    - GND  -> GND
 * 
 * 3. Analog TDS Meter Sensor (Total Dissolved Solids)
 *    - AOUT -> GPIO 35 (ADC1_CH7)
 *    - VCC  -> 3.3V
 *    - GND  -> GND
 * 
 * 4. Status Indicator LED (Optional)
 *    - Anode -> GPIO 2 (Built-in LED on ESP32 DevKit)
 * 
 * BLE GATT SERVER SPECIFICATION:
 * ----------------------------------------------------------------------------
 * Advertised Device Name: AgriMonitor
 * Service UUID:             0000ff00-0000-1000-8000-00805f9b34fb
 * Data Characteristic UUID: 0000ff01-0000-1000-8000-00805f9b34fb (READ | NOTIFY)
 * Control Characteristic:   0000ff02-0000-1000-8000-00805f9b34fb (WRITE)
 * ============================================================================
 */

#include <Wire.h>
#include <DHT.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// PIN DEFINITIONS
#define DHT_PIN 4
#define DHT_TYPE DHT11

#define SOIL_MOISTURE_PIN 34
#define TDS_SENSOR_PIN 35
#define LED_PIN 2

// BLE UUIDs
#define BLE_DEVICE_NAME "AgriMonitor"
#define SERVICE_UUID "0000ff00-0000-1000-8000-00805f9b34fb"
#define DATA_CHARACTERISTIC_UUID "0000ff01-0000-1000-8000-00805f9b34fb"
#define CONTROL_CHARACTERISTIC_UUID "0000ff02-0000-1000-8000-00805f9b34fb"

// SAMPLING CALIBRATION & TIMINGS
const unsigned long SENSOR_SAMPLE_INTERVAL_MS = 2000;
const int SOIL_DRY_ADC = 3200;  // Raw ADC in dry air
const int SOIL_WET_ADC = 1400;  // Raw ADC submerged in water
const float VREF = 3.3;         // ADC reference voltage

DHT dht(DHT_PIN, DHT_TYPE);

BLEServer* pServer = nullptr;
BLECharacteristic* pDataCharacteristic = nullptr;
BLECharacteristic* pControlCharacteristic = nullptr;
bool deviceConnected = false;
bool oldDeviceConnected = false;

float currentTemperature = 25.0;
float currentHumidity = 60.0;
float currentSoilMoisture = 50.0;
int currentTds = 500;
unsigned long lastSampleTime = 0;

// SERVER CALLBACKS
class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    deviceConnected = true;
    digitalWrite(LED_PIN, HIGH);
    Serial.println("[BLE] Client connected.");
  }

  void onDisconnect(BLEServer* pServer) {
    deviceConnected = false;
    digitalWrite(LED_PIN, LOW);
    Serial.println("[BLE] Client disconnected. Restarting advertising...");
  }
};

// CONTROL CALLBACKS
class ControlCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* pCharacteristic) {
    String rxValue = pCharacteristic->getValue().c_str();
    if (rxValue.length() > 0) {
      Serial.print("[BLE CONTROL RX]: ");
      Serial.println(rxValue);
    }
  }
};

float readSoilMoisture() {
  int raw = analogRead(SOIL_MOISTURE_PIN);
  // Constrain and map to percentage 0% (dry) to 100% (saturated)
  int constrained = constrain(raw, SOIL_WET_ADC, SOIL_DRY_ADC);
  float percentage = map(constrained, SOIL_DRY_ADC, SOIL_WET_ADC, 0, 100);
  return percentage;
}

int readTdsValue(float temperature) {
  int raw = analogRead(TDS_SENSOR_PIN);
  float voltage = (raw / 4095.0) * VREF;
  
  // Temperature compensation formula for conductivity
  float compensationCoefficient = 1.0 + 0.02 * (temperature - 25.0);
  float compensationVoltage = voltage / compensationCoefficient;
  
  // Convert voltage to TDS value (ppm)
  float tdsValue = (133.42 * pow(compensationVoltage, 3) - 255.86 * pow(compensationVoltage, 2) + 857.39 * compensationVoltage) * 0.5;
  if (tdsValue < 0) tdsValue = 0;
  return (int)tdsValue;
}

void sendBleTelemetry() {
  if (!deviceConnected || pDataCharacteristic == nullptr) return;

  // JSON payload format
  String payload = "{";
  payload += "\"temperature\":" + String(currentTemperature, 1) + ",";
  payload += "\"humidity\":" + String(currentHumidity, 1) + ",";
  payload += "\"soilMoisture\":" + String(currentSoilMoisture, 1) + ",";
  payload += "\"tds\":" + String(currentTds);
  payload += "}";

  pDataCharacteristic->setValue(payload.c_str());
  pDataCharacteristic->notify();

  Serial.print("[BLE NOTIFY]: ");
  Serial.println(payload);
}

void setup() {
  Serial.begin(115200);
  delay(500);

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  analogReadResolution(12);

  dht.begin();

  Serial.println("\n====================================================");
  Serial.println("AGRIMONITOR ESP32 AGRICULTURE NODE STARTUP");
  Serial.println("====================================================");

  // Initialize BLE Device
  BLEDevice::init(BLE_DEVICE_NAME);
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new ServerCallbacks());

  // Create Service
  BLEService* pService = pServer->createService(SERVICE_UUID);

  // Create Data Characteristic
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
  pControlCharacteristic->setCallbacks(new ControlCallbacks());

  pService->start();

  // Advertising
  BLEAdvertising* pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();

  Serial.println("[BLE] Advertising started. Ready to pair with Android App.");
}

void loop() {
  unsigned long now = millis();

  if (now - lastSampleTime >= SENSOR_SAMPLE_INTERVAL_MS) {
    lastSampleTime = now;

    // Read Sensors
    float t = dht.readTemperature();
    float h = dht.readHumidity();

    if (!isnan(t)) currentTemperature = t;
    if (!isnan(h)) currentHumidity = h;

    currentSoilMoisture = readSoilMoisture();
    currentTds = readTdsValue(currentTemperature);

    Serial.printf("[SENSORS] Temp: %.1f °C | Hum: %.1f %% | Soil: %.1f %% | TDS: %d ppm\n",
                  currentTemperature, currentHumidity, currentSoilMoisture, currentTds);

    sendBleTelemetry();
  }

  // Handle re-advertising on disconnect
  if (!deviceConnected && oldDeviceConnected) {
    delay(500);
    pServer->startAdvertising();
    Serial.println("[BLE] Device disconnected. Restarted advertising.");
    oldDeviceConnected = deviceConnected;
  }
  if (deviceConnected && !oldDeviceConnected) {
    oldDeviceConnected = deviceConnected;
  }
}
