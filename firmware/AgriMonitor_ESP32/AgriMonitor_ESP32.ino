/*
 * ============================================================================
 * AGRIMONITOR ESP32 BLE FIRMWARE (Phase 1 — GATT Server Foundation)
 * ============================================================================
 * Target: ESP32 DevKit V1
 * Purpose: Establish BLE GATT Server and transmit simulated agricultural
 * telemetry packets over BLE notifications to verify Android pipeline.
 *
 * BLE GATT SPECIFICATION:
 * ----------------------------------------------------------------------------
 * Advertised Name: AgriMonitor-ESP32
 * Service UUID:    189a0001-e200-4424-9b55-d142d7c50a12
 * Data Char UUID:   189a0002-e200-4424-9b55-d142d7c50a12 (READ | NOTIFY)
 * Control Char UUID: 189a0003-e200-4424-9b55-d142d7c50a12 (WRITE)
 * ============================================================================
 */

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

#define BLE_DEVICE_NAME "AgriMonitor-ESP32"
#define SERVICE_UUID "189a0001-e200-4424-9b55-d142d7c50a12"
#define DATA_CHARACTERISTIC_UUID "189a0002-e200-4424-9b55-d142d7c50a12"
#define CONTROL_CHARACTERISTIC_UUID "189a0003-e200-4424-9b55-d142d7c50a12"

#define STATUS_LED_PIN 2

const unsigned long NOTIFY_INTERVAL_MS = 2000;

BLEServer* pServer = nullptr;
BLECharacteristic* pDataCharacteristic = nullptr;
BLECharacteristic* pControlCharacteristic = nullptr;
bool deviceConnected = false;
bool oldDeviceConnected = false;

unsigned long lastNotifyTime = 0;

// Simulated sensor values for Phase 1 pipeline verification
float simTemperature = 28.5;
float simHumidity = 65.0;
float simSoilMoisture = 45.0;
int simTds = 580;

class AgriServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    deviceConnected = true;
    digitalWrite(STATUS_LED_PIN, HIGH);
    Serial.println("[AgriMonitor BLE] Android client connected.");
  }

  void onDisconnect(BLEServer* pServer) {
    deviceConnected = false;
    digitalWrite(STATUS_LED_PIN, LOW);
    Serial.println("[AgriMonitor BLE] Android client disconnected.");
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

void sendSimulatedTelemetry() {
  if (!deviceConnected || pDataCharacteristic == nullptr) {
    return;
  }

  // Add subtle natural variation
  float t = simTemperature + ((random(-5, 6)) / 10.0);
  float h = simHumidity + ((random(-10, 11)) / 10.0);
  float sm = simSoilMoisture + ((random(-8, 9)) / 10.0);
  int tds = simTds + random(-15, 16);

  // JSON payload format
  String payload = "{";
  payload += "\"temperature\":" + String(t, 1) + ",";
  payload += "\"humidity\":" + String(h, 1) + ",";
  payload += "\"soilMoisture\":" + String(sm, 1) + ",";
  payload += "\"tds\":" + String(tds);
  payload += "}";

  pDataCharacteristic->setValue(payload.c_str());
  pDataCharacteristic->notify();

  Serial.print("[BLE NOTIFY TX]: ");
  Serial.println(payload);
}

void setup() {
  Serial.begin(115200);
  delay(500);

  pinMode(STATUS_LED_PIN, OUTPUT);
  digitalWrite(STATUS_LED_PIN, LOW);

  Serial.println("\n==================================================");
  Serial.println("AGRIMONITOR ESP32 BLE FIRMWARE INITIALIZATION");
  Serial.println("==================================================");

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

  // Start Advertising
  BLEAdvertising* pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();

  Serial.println("[AgriMonitor BLE] Advertising started as: " BLE_DEVICE_NAME);
  Serial.println("[AgriMonitor BLE] Waiting for Android App to connect...");
}

void loop() {
  unsigned long now = millis();

  if (now - lastNotifyTime >= NOTIFY_INTERVAL_MS) {
    lastNotifyTime = now;
    sendSimulatedTelemetry();
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
