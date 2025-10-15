#include <ESP8266WiFi.h>
#include <Wire.h>
#include <ESP8266HTTPClient.h>
#include <MAX3010x.h>
#include "filters.h"

// WiFi credentials
const char* ssid = "Moto G54";
const char* password = "vaibhavsingh";

// Server endpoint
const char* serverName = "https://192.168.115.172:4000/data"; // Replace with actual IP and endpoint

// Sensor
MAX30105 sensor;
const auto kSamplingRate = sensor.SAMPLING_RATE_400SPS;
const float kSamplingFrequency = 400.0;

const unsigned long kFingerThreshold = 10000;
const unsigned int kFingerCooldownMs = 500;
const float kEdgeThreshold = -2000.0;

const float kLowPassCutoff = 5.0;
const float kHighPassCutoff = 0.5;

const bool kEnableAveraging = true;
const int kAveragingSamples = 5;
const int kSampleThreshold = 5;

LowPassFilter low_pass_filter_red(kLowPassCutoff, kSamplingFrequency);
LowPassFilter low_pass_filter_ir(kLowPassCutoff, kSamplingFrequency);
HighPassFilter high_pass_filter(kHighPassCutoff, kSamplingFrequency);
Differentiator differentiator(kSamplingFrequency);
MovingAverageFilter<kAveragingSamples> averager_bpm;
MovingAverageFilter<kAveragingSamples> averager_r;
MovingAverageFilter<kAveragingSamples> averager_spo2;

MinMaxAvgStatistic stat_red;
MinMaxAvgStatistic stat_ir;

float kSpO2_A = 1.5958422;
float kSpO2_B = -34.6596622;
float kSpO2_C = 112.6898759;

long last_heartbeat = 0;
long finger_timestamp = 0;
bool finger_detected = false;

float last_diff = NAN;
bool crossed = false;
long crossed_time = 0;

bool scanI2C() {
  byte error, address;
  int deviceCount = 0;
  bool max30105Found = false;
  
  Serial.println("Scanning I2C bus...");
  
  for(address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    error = Wire.endTransmission();
    
    if (error == 0) {
      Serial.print("I2C device found at address 0x");
      if (address < 16) Serial.print("0");
      Serial.print(address, HEX);
      
      if (address == 0x57) {
        Serial.print(" (MAX30105 sensor)");
        max30105Found = true;
      }
      
      Serial.println();
      deviceCount++;
    }
  }
  
  if (deviceCount == 0) {
    Serial.println("No I2C devices found!");
  } else {
    Serial.print("Found ");
    Serial.print(deviceCount);
    Serial.println(" device(s)");
  }
  
  return max30105Found;
}

void setup() {
  Serial.begin(115200); // Higher baud rate for faster debugging
  delay(2000); // Allow time for Serial to start
  
  Serial.println();
  Serial.println("====================================");
  Serial.println("MAX30105 + NodeMCU + WiFi Starting...");
  Serial.println("====================================");
  
  // Initialize I2C on correct pins for NodeMCU
  Wire.begin(D2, D1); // D2 (GPIO4) as SDA, D1 (GPIO5) as SCL
  
  // Scan I2C bus
  bool sensorOnI2C = scanI2C();
  
  if (!sensorOnI2C) {
    Serial.println("WARNING: MAX30105 not found on I2C bus!");
    Serial.println("Check your wiring connections:");
    Serial.println("- SDA -> D2 (GPIO4)");
    Serial.println("- SCL -> D1 (GPIO5)");
    Serial.println("- VIN -> 3.3V");
    Serial.println("- GND -> GND");
  }
  
  // Connect to WiFi
  Serial.print("Connecting to WiFi SSID: ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);
  int retries = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
    retries++;
    if (retries > 15) {
      Serial.println("\n❌ Failed to connect to WiFi");
      break; // Continue with sensor init even if WiFi fails
    }
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ Connected to WiFi");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
  }
  
  // Initialize sensor with explicit parameters
  Serial.println("Initializing MAX30105 sensor...");
  
  // Try to begin with standard parameters
  bool sensor_ok = sensor.begin();
  Serial.print("sensor.begin() = ");
  Serial.println(sensor_ok ? "TRUE" : "FALSE");
  
  // Configure sensor with optimal settings
  if (sensor_ok) {
    // No need to set pulse amplitude directly - the library handles default values
    
    // Set sampling rate
    bool rate_ok = sensor.setSamplingRate(kSamplingRate);
    Serial.print("setSamplingRate() = ");
    Serial.println(rate_ok ? "TRUE" : "FALSE");
    
    // If everything is okay
    if (rate_ok) {
      Serial.println("✅ Sensor initialized successfully");
      Serial.println("Place your finger on the sensor");
      delay(2000); // Give sensor time to stabilize
    } else {
      Serial.println("⚠️ Failed to set sampling rate");
    }
  } else {
    Serial.println("❌ Sensor initialization failed");
    Serial.println("Entering mock data mode for testing");
    
    // Send mock data
    for (int i = 0; i < 5; i++) {
      int fake_bpm = random(60, 100);
      float fake_spo2 = random(9500, 9900) / 100.0;
      Serial.print("Sending mock data: BPM=");
      Serial.print(fake_bpm);
      Serial.print(", SpO2=");
      Serial.println(fake_spo2);
      sendToServer(fake_bpm, fake_spo2);
      delay(2000);
    }
    Serial.println("Mock data sent. Continuing with normal operation.");
  }
  
  Serial.println("====================================");
  Serial.println("Setup completed");
  Serial.println("====================================");
}

void loop() {
  // Check if WiFi is still connected
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi connection lost. Reconnecting...");
    WiFi.begin(ssid, password);
    delay(5000); // Wait 5 seconds before continuing
  }
  
  // Read from sensor
  auto sample = sensor.readSample(1000);
  float current_value_red = sample.red;
  float current_value_ir = sample.ir;
  
  // Finger detection
  if(current_value_red > kFingerThreshold) {
    if(!finger_detected && (millis() - finger_timestamp > kFingerCooldownMs)) {
      finger_detected = true;
      Serial.println("👆 Finger detected!");
    }
  } else {
    if(finger_detected) {
      Serial.println("👋 Finger removed");
    }
    
    // Reset all filters and stats
    differentiator.reset();
    averager_bpm.reset();
    averager_r.reset();
    averager_spo2.reset();
    low_pass_filter_red.reset();
    low_pass_filter_ir.reset();
    high_pass_filter.reset();
    stat_red.reset();
    stat_ir.reset();
    
    finger_detected = false;
    finger_timestamp = millis();
  }
  
  // Process readings if finger is detected
  if(finger_detected) {
    // Apply filters
    current_value_red = low_pass_filter_red.process(current_value_red);
    current_value_ir = low_pass_filter_ir.process(current_value_ir);
    
    // Statistics for SpO2
    stat_red.process(current_value_red);
    stat_ir.process(current_value_ir);
    
    // Heart beat detection
    float current_value = high_pass_filter.process(current_value_red);
    float current_diff = differentiator.process(current_value);
    
    if(!isnan(current_diff) && !isnan(last_diff)) {
      // Zero-crossing detection (falling edge)
      if(last_diff > 0 && current_diff < 0) {
        crossed = true;
        crossed_time = millis();
      }
      
      if(current_diff > 0) {
        crossed = false;
      }
      
      // Falling edge threshold detection for heartbeat
      if(crossed && current_diff < kEdgeThreshold) {
        if(last_heartbeat != 0 && crossed_time - last_heartbeat > 300) {
          // Calculate heart rate and SpO2
          int bpm = 60000/(crossed_time - last_heartbeat);
          
          // Calculate R value for SpO2
          float rred = (stat_red.maximum()-stat_red.minimum())/stat_red.average();
          float rir = (stat_ir.maximum()-stat_ir.minimum())/stat_ir.average();
          float r = rred/rir;
          float spo2 = kSpO2_A * r * r + kSpO2_B * r + kSpO2_C;
          
          // Validate ranges
          if(bpm > 50 && bpm < 250 && spo2 > 0) {
            Serial.print("Raw values: BPM=");
            Serial.print(bpm);
            Serial.print(" R=");
            Serial.print(r);
            Serial.print(" SpO2=");
            Serial.println(spo2);
            
            if(kEnableAveraging) {
              // Use averaging to smooth readings
              int average_bpm = averager_bpm.process(bpm);
              float average_r = averager_r.process(r);
              float average_spo2 = averager_spo2.process(spo2);
              
              if(averager_bpm.count() >= kSampleThreshold) {
                Serial.print("✅ FINAL: BPM=");
                Serial.print(average_bpm);
                Serial.print(" SpO2=");
                Serial.println(average_spo2);
                sendToServer(average_bpm, average_spo2);
              } else {
                Serial.print("⏳ Collecting samples: ");
                Serial.print(averager_bpm.count());
                Serial.print("/");
                Serial.println(kSampleThreshold);
              }
            } else {
              // Send raw values without averaging
              sendToServer(bpm, spo2);
            }
          }
          
          // Reset statistics for next heartbeat
          stat_red.reset();
          stat_ir.reset();
        }
        
        crossed = false;
        last_heartbeat = crossed_time;
      }
    }
    
    last_diff = current_diff;
  }
  
  // Small delay to prevent overwhelming the serial output
  delay(10);
}

void sendToServer(int bpm, float spo2) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    WiFiClient client;
    http.begin(client, serverName);
    http.addHeader("Content-Type", "application/json");
    
    String payload = String("{\"bpm\":") + bpm + ",\"spo2\":" + spo2 + "}";
    
    Serial.println("Preparing to send:");
    Serial.println(serverName);
    Serial.println(payload);
    
    int httpResponseCode = http.POST(payload);
    if (httpResponseCode > 0) {
      Serial.print("HTTP Response code: ");
      Serial.println(httpResponseCode);
    } else {
      Serial.print("HTTP Error: ");
      Serial.println(httpResponseCode);
    }
    
    http.end();
  } else {
    Serial.println("WiFi not connected - data not sent");
  }
}