/*
 * ESP32 MQTT Relay Controller
 * Controls 4 relays for mosque lighting
 * 
 * Hardware Setup:
 * - Relay 1: GPIO 4
 * - Relay 2: GPIO 5
 * - Relay 3: GPIO 18
 * - Relay 4: GPIO 14
 * - Built-in LED: GPIO 2 (connection indicator)
 * 
 * MQTT Topics (using MAC address as prefix):
 * - Subscribe: <MAC_ADDRESS>/relay1/set
 * - Subscribe: <MAC_ADDRESS>/relay2/set
 * - Subscribe: <MAC_ADDRESS>/relay3/set
 * - Subscribe: <MAC_ADDRESS>/relay4/set
 * - Publish: <MAC_ADDRESS>/status
 * - Publish: <MAC_ADDRESS>/device/status
 * 
 * Example: If MAC is A1B2C3D4E5F6
 * - Topics: A1B2C3D4E5F6/relay1/set, A1B2C3D4E5F6/status, etc.
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ESP32Ping.h>

// Define LED_BUILTIN if not defined
#ifndef LED_BUILTIN
#define LED_BUILTIN 2
#endif

// WiFi Configuration
const char* ssid = "iPhone 15";           // Replace with your WiFi SSID
const char* password = "hopehope";    // Replace with your WiFi password

// MQTT Broker Configuration
const char* mqtt_server = "172.20.10.2";  // Replace with your MQTT broker IP
const int mqtt_port = 1883;
const char* mqtt_user = "";                       // Leave empty if no authentication
const char* mqtt_password = "";                   // Leave empty if no authentication

// Device Configuration
const char* device_name = "DEV-KIT";
const char* device_id = "esp32_01";

// MAC Address variable (will be set in setup)
String macAddress = "";
String topicPrefix = "";

// GPIO Pin Configuration
const int RELAY_1 = 4;   // GPIO 4
const int RELAY_2 = 5;   // GPIO 5
const int RELAY_3 = 18;  // GPIO 18
const int RELAY_4 = 14;  // GPIO 14

// MQTT Topics (will be set dynamically with MAC address in setup)
String topic_relay1_set = "";
String topic_relay2_set = "";
String topic_relay3_set = "";
String topic_relay4_set = "";
String topic_status = "";
String topic_device_status = "";

// Relay States
bool relay1State = false;
bool relay2State = false;
bool relay3State = false;
bool relay4State = false;

// WiFi and MQTT clients
WiFiClient espClient;
PubSubClient client(espClient);

// Reconnection timing
unsigned long lastReconnectAttempt = 0;
unsigned long lastStatusPublish = 0;
const long statusPublishInterval = 30000; // Publish status every 30 seconds

// Function declarations
void setupWiFi();
void mqttCallback(char* topic, byte* payload, unsigned int length);
bool reconnectMQTT();
void publishStatus();
void publishDeviceStatus(const char* status);
bool pingBroker();

void setup() {
  Serial.begin(115200);
  delay(100);
  
  Serial.println("\n\n=================================");
  Serial.println("ESP32 MQTT Relay Controller");
  Serial.println("=================================");
  
  // Get MAC address
  uint8_t mac[6];
  WiFi.macAddress(mac);
  macAddress = String(mac[0], HEX) + String(mac[1], HEX) + 
               String(mac[2], HEX) + String(mac[3], HEX) + 
               String(mac[4], HEX) + String(mac[5], HEX);
  macAddress.toUpperCase();
  
  Serial.print("MAC Address: ");
  Serial.println(macAddress);
  
  // Set topic prefix using MAC address
  topicPrefix = macAddress + "/";
  
  // Initialize MQTT topics with MAC address prefix
  topic_relay1_set = topicPrefix + "relay1/set";
  topic_relay2_set = topicPrefix + "relay2/set";
  topic_relay3_set = topicPrefix + "relay3/set";
  topic_relay4_set = topicPrefix + "relay4/set";
  topic_status = topicPrefix + "status";
  topic_device_status = topicPrefix + "device/status";
  
  Serial.println("\nMQTT Topics:");
  Serial.println("  Control Topics:");
  Serial.println("    - " + topic_relay1_set);
  Serial.println("    - " + topic_relay2_set);
  Serial.println("    - " + topic_relay3_set);
  Serial.println("    - " + topic_relay4_set);
  Serial.println("  Status Topics:");
  Serial.println("    - " + topic_status);
  Serial.println("    - " + topic_device_status);
  
  // Initialize GPIO pins
  pinMode(RELAY_1, OUTPUT);
  pinMode(RELAY_2, OUTPUT);
  pinMode(RELAY_3, OUTPUT);
  pinMode(RELAY_4, OUTPUT);
  pinMode(LED_BUILTIN, OUTPUT);
  
  // Set initial relay states (OFF = HIGH for active-low relays)
  digitalWrite(RELAY_1, HIGH);  // OFF
  digitalWrite(RELAY_2, HIGH);  // OFF
  digitalWrite(RELAY_3, HIGH);  // OFF
  digitalWrite(RELAY_4, HIGH);  // OFF
  digitalWrite(LED_BUILTIN, LOW);
  
  Serial.println("GPIO pins initialized");
  Serial.printf("Relay 1: GPIO %d\n", RELAY_1);
  Serial.printf("Relay 2: GPIO %d\n", RELAY_2);
  Serial.printf("Relay 3: GPIO %d\n", RELAY_3);
  Serial.printf("Relay 4: GPIO %d\n", RELAY_4);
  
  // Connect to WiFi
  setupWiFi();
  
  // Configure MQTT
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(mqttCallback);
  
  Serial.println("Setup complete!");
}

void setupWiFi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN)); // Blink LED
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
    Serial.print("Signal Strength (RSSI): ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
    digitalWrite(LED_BUILTIN, HIGH); // LED on when connected
  } else {
    Serial.println("\nFailed to connect to WiFi!");
    digitalWrite(LED_BUILTIN, LOW);
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  // Convert payload to string
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("]: ");
  Serial.println(message);
  
  // Handle relay 1
  if (strcmp(topic, topic_relay1_set.c_str()) == 0) {
    if (message == "ON" || message == "1" || message == "true") {
      relay1State = true;
      digitalWrite(RELAY_1, LOW); // Active LOW relay
      Serial.println("Relay 1 turned ON");
    } else {
      relay1State = false;
      digitalWrite(RELAY_1, HIGH);
      Serial.println("Relay 1 turned OFF");
    }
    publishStatus();
  }
  
  // Handle relay 2
  if (strcmp(topic, topic_relay2_set.c_str()) == 0) {
    if (message == "ON" || message == "1" || message == "true") {
      relay2State = true;
      digitalWrite(RELAY_2, LOW); // Active LOW relay
      Serial.println("Relay 2 turned ON");
    } else {
      relay2State = false;
      digitalWrite(RELAY_2, HIGH);
      Serial.println("Relay 2 turned OFF");
    }
    publishStatus();
  }
  
  // Handle relay 3
  if (strcmp(topic, topic_relay3_set.c_str()) == 0) {
    if (message == "ON" || message == "1" || message == "true") {
      relay3State = true;
      digitalWrite(RELAY_3, LOW); // Active LOW relay
      Serial.println("Relay 3 turned ON");
    } else {
      relay3State = false;
      digitalWrite(RELAY_3, HIGH);
      Serial.println("Relay 3 turned OFF");
    }
    publishStatus();
  }
  
  // Handle relay 4
  if (strcmp(topic, topic_relay4_set.c_str()) == 0) {
    if (message == "ON" || message == "1" || message == "true") {
      relay4State = true;
      digitalWrite(RELAY_4, LOW); // Active LOW relay
      Serial.println("Relay 4 turned ON");
    } else {
      relay4State = false;
      digitalWrite(RELAY_4, HIGH);
      Serial.println("Relay 4 turned OFF");
    }
    publishStatus();
  }
}

bool pingBroker() {
  Serial.print("Pinging MQTT broker at ");
  Serial.print(mqtt_server);
  Serial.print("...");
  
  IPAddress brokerIP;
  if (!brokerIP.fromString(mqtt_server)) {
    Serial.println(" Failed to parse IP address!");
    return false;
  }
  
  bool success = Ping.ping(brokerIP, 3); // 3 attempts
  
  if (success) {
    Serial.println(" SUCCESS!");
    Serial.printf("  Average time: %.2f ms\n", Ping.averageTime());
    return true;
  } else {
    Serial.println(" FAILED!");
    Serial.println("  Network connectivity issue - cannot reach broker");
    return false;
  }
}

bool reconnectMQTT() {
  if (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    
    // First, ping the broker to check network connectivity
    if (!pingBroker()) {
      Serial.println("Cannot reach MQTT broker - skipping connection attempt");
      return false;
    }
    
    // Create a client ID
    String clientId = String(device_id) + "-" + String(random(0xffff), HEX);
    
    // Prepare Last Will and Testament (LWT) message
    String lwtJson = "{";
    lwtJson += "\"device\":\"" + String(device_id) + "\",";
    lwtJson += "\"name\":\"" + String(device_name) + "\",";
    lwtJson += "\"mac\":\"" + macAddress + "\",";
    lwtJson += "\"status\":\"offline\",";
    lwtJson += "\"relays\":{";
    lwtJson += "\"relay1\":" + String(relay1State ? "true" : "false") + ",";
    lwtJson += "\"relay2\":" + String(relay2State ? "true" : "false") + ",";
    lwtJson += "\"relay3\":" + String(relay3State ? "true" : "false") + ",";
    lwtJson += "\"relay4\":" + String(relay4State ? "true" : "false");
    lwtJson += "}";
    lwtJson += "}";
    
    // Attempt to connect with LWT
    // connect(clientId, username, password, willTopic, willQoS, willRetain, willMessage)
    if (client.connect(clientId.c_str(), mqtt_user, mqtt_password, 
                       topic_device_status.c_str(), 1, true, lwtJson.c_str())) {
      Serial.println("connected!");
      
      // Subscribe to control topics
      client.subscribe(topic_relay1_set.c_str());
      client.subscribe(topic_relay2_set.c_str());
      client.subscribe(topic_relay3_set.c_str());
      client.subscribe(topic_relay4_set.c_str());
      
      Serial.println("Subscribed to topics:");
      Serial.printf("  - %s\n", topic_relay1_set.c_str());
      Serial.printf("  - %s\n", topic_relay2_set.c_str());
      Serial.printf("  - %s\n", topic_relay3_set.c_str());
      Serial.printf("  - %s\n", topic_relay4_set.c_str());
      
      Serial.println("Last Will and Testament (LWT) configured:");
      Serial.printf("  Topic: %s\n", topic_device_status.c_str());
      Serial.printf("  Message: %s\n", lwtJson.c_str());
      
      // Publish online status (will override the LWT while connected)
      publishDeviceStatus("online");
      publishStatus();
      
      return true;
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" - Will try again in 5 seconds");
      return false;
    }
  }
  return true;
}

void publishStatus() {
  if (client.connected()) {
    // Create JSON status message
    String statusJson = "{";
    statusJson += "\"relay1\":" + String(relay1State ? "true" : "false") + ",";
    statusJson += "\"relay2\":" + String(relay2State ? "true" : "false") + ",";
    statusJson += "\"relay3\":" + String(relay3State ? "true" : "false") + ",";
    statusJson += "\"relay4\":" + String(relay4State ? "true" : "false");
    statusJson += "}";
    
    client.publish(topic_status.c_str(), statusJson.c_str(), true); // Retained message
    Serial.print("Status published: ");
    Serial.println(statusJson);
  }
}

void publishDeviceStatus(const char* status) {
  if (client.connected()) {
    String deviceJson = "{";
    deviceJson += "\"device\":\"" + String(device_id) + "\",";
    deviceJson += "\"name\":\"" + String(device_name) + "\",";
    deviceJson += "\"mac\":\"" + macAddress + "\",";
    deviceJson += "\"status\":\"" + String(status) + "\",";
    deviceJson += "\"ip\":\"" + WiFi.localIP().toString() + "\",";
    deviceJson += "\"rssi\":" + String(WiFi.RSSI()) + ",";
    deviceJson += "\"relays\":{";
    deviceJson += "\"relay1\":" + String(relay1State ? "true" : "false") + ",";
    deviceJson += "\"relay2\":" + String(relay2State ? "true" : "false") + ",";
    deviceJson += "\"relay3\":" + String(relay3State ? "true" : "false") + ",";
    deviceJson += "\"relay4\":" + String(relay4State ? "true" : "false");
    deviceJson += "}";
    deviceJson += "}";
    
    client.publish(topic_device_status.c_str(), deviceJson.c_str(), true);
    Serial.print("Device status published: ");
    Serial.println(deviceJson);
  }
}

void loop() {
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi connection lost. Reconnecting...");
    digitalWrite(LED_BUILTIN, LOW);
    setupWiFi();
  } else {
    digitalWrite(LED_BUILTIN, HIGH);
  }
  
  // Maintain MQTT connection
  if (!client.connected()) {
    unsigned long now = millis();
    if (now - lastReconnectAttempt > 5000) {
      lastReconnectAttempt = now;
      if (reconnectMQTT()) {
        lastReconnectAttempt = 0;
      }
    }
  } else {
    client.loop();
    
    // Publish status periodically
    unsigned long now = millis();
    if (now - lastStatusPublish > statusPublishInterval) {
      lastStatusPublish = now;
      publishStatus();
      publishDeviceStatus("online");
    }
  }
  
  delay(10); // Small delay for stability
}
