# MQTT Configuration Guide

## Overview
The dashboard connects to an MQTT broker to control and monitor the ESP32 relay controller.

## MQTT Broker Setup

### Required MQTT Broker
You need an MQTT broker with WebSocket support. The ESP32 connects via standard MQTT (port 1883), while the web dashboard connects via WebSocket (port 8080).

### Recommended: Mosquitto with WebSocket

1. **Install Mosquitto** (if not already installed):
   ```bash
   brew install mosquitto
   ```

2. **Configure Mosquitto for WebSocket**:
   
   Edit `/opt/homebrew/etc/mosquitto/mosquitto.conf` (or `/usr/local/etc/mosquitto/mosquitto.conf`):
   ```conf
   # Standard MQTT port for ESP32
   listener 1883
   protocol mqtt
   allow_anonymous true

   # WebSocket port for web dashboard
   listener 8080
   protocol websockets
   allow_anonymous true

   # Persistence
   persistence true
   persistence_location /opt/homebrew/var/mosquitto/
   ```

3. **Start Mosquitto**:
   ```bash
   # Run as service
   brew services start mosquitto
   
   # Or run manually
   mosquitto -c /opt/homebrew/etc/mosquitto/mosquitto.conf
   ```

## MQTT Topics Used by ESP32

### Topics ESP32 Subscribes To (Controls)
- `mosque/lights/downstairs/set` - Control downstairs lights (payload: "ON" or "OFF")
- `mosque/lights/upstairs/set` - Control upstairs lights (payload: "ON" or "OFF")

### Topics ESP32 Publishes To (Status)
- `mosque/lights/status` - Light states as JSON: `{"downstairs":true,"upstairs":false}`
- `mosque/devices/status` - Device info as JSON: `{"device":"esp32_01","name":"ESP32-Relay-Controller","status":"online","ip":"192.168.1.100","rssi":-45}`

## Dashboard Configuration

### Environment Variables
Create a `.env` file in the dashboard directory:

```env
VITE_MQTT_BROKER_URL=ws://192.168.100.81:8080
```

If not set, it defaults to `ws://192.168.100.81:8080`

### Network Requirements
- ESP32 IP: Match the IP in `main.cpp` (default: connects to broker at `192.168.100.81`)
- Dashboard: Needs access to MQTT broker WebSocket port (8080)
- Both devices should be on the same network

## Testing the Connection

### 1. Test MQTT Broker
```bash
# Subscribe to all topics
mosquitto_sub -h 192.168.100.81 -t "mosque/#" -v

# Publish test message
mosquitto_pub -h 192.168.100.81 -t "mosque/lights/downstairs/set" -m "ON"
```

### 2. Monitor ESP32
Open PlatformIO Serial Monitor to see ESP32 logs:
- Connection status
- Received commands
- Published status updates

### 3. Check Dashboard
- Open browser console (F12)
- Look for "MQTT Connected successfully"
- Check for incoming messages: "Received light status:", "Device status received:"

## Troubleshooting

### Dashboard Not Connecting
1. Verify MQTT broker is running: `brew services list | grep mosquitto`
2. Check WebSocket is enabled on port 8080
3. Verify network connectivity to broker IP
4. Check browser console for errors

### ESP32 Not Responding
1. Verify ESP32 is connected to WiFi (LED should be on)
2. Check Serial Monitor for MQTT connection status
3. Verify broker IP in `main.cpp` matches your broker
4. Test manually with mosquitto_pub/sub commands

### Lights Not Toggling
1. Check topics match exactly (case-sensitive)
2. Verify payload is "ON" or "OFF" (case-sensitive)
3. Check relay wiring (should be active-LOW)
4. Monitor Serial output for received messages

## Message Formats

### Light Control Commands
```bash
# Turn downstairs lights ON
Topic: mosque/lights/downstairs/set
Payload: ON

# Turn upstairs lights OFF
Topic: mosque/lights/upstairs/set
Payload: OFF
```

### Status Updates (from ESP32)
```json
// Light status
Topic: mosque/lights/status
Payload: {"downstairs":true,"upstairs":false}

// Device status
Topic: mosque/devices/status
Payload: {
  "device":"esp32_01",
  "name":"ESP32-Relay-Controller",
  "status":"online",
  "ip":"192.168.1.100",
  "rssi":-45
}
```

## Network Diagram
```
ESP32 Relay Controller
    ↓ (MQTT port 1883)
MQTT Broker (Mosquitto)
    ↓ (WebSocket port 8080)
Web Dashboard
```
