# System Architecture

## Overview
```
┌─────────────────────────────────────────────────────────────────┐
│                         Mosque IoT System                        │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│                  │         │                  │         │                  │
│  Web Dashboard   │◄───────►│  MQTT Broker     │◄───────►│  Prayer Server   │
│  (React/Vite)    │         │  (Mosquitto)     │         │  (Flask/Python)  │
│                  │         │  Port: 1883/8080 │         │  Port: 5001      │
│                  │         │                  │         │                  │
└──────────────────┘         └──────────────────┘         └──────────────────┘
                                      ▲
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    ▼                 ▼                 ▼
           ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
           │   ESP32 #1   │  │   ESP32 #2   │  │   ESP32 #N   │
           │              │  │              │  │              │
           │  Downstairs  │  │   Upstairs   │  │   Future     │
           │    Relay     │  │    Relay     │  │   Devices    │
           └──────────────┘  └──────────────┘  └──────────────┘
                  │                 │
                  ▼                 ▼
           ┌──────────┐      ┌──────────┐
           │  Lights  │      │  Lights  │
           │  Zone 1  │      │  Zone 2  │
           └──────────┘      └──────────┘
```

## MQTT Topic Structure
```
mosque/
├── lights/
│   ├── downstairs/
│   │   └── set         [Subscribe] - Control downstairs lights
│   ├── upstairs/
│   │   └── set         [Subscribe] - Control upstairs lights
│   └── status          [Publish] - All lights status (JSON)
│
├── prayer/
│   └── adjust/
│       ├── Fajr        [Subscribe] - Adjust Fajr time
│       ├── Dhuhr       [Subscribe] - Adjust Dhuhr time
│       ├── Asr         [Subscribe] - Adjust Asr time
│       ├── Maghrib     [Subscribe] - Adjust Maghrib time
│       └── Isha        [Subscribe] - Adjust Isha time
│
├── devices/
│   └── status          [Publish] - Device online/offline status
│
├── water/
│   └── level           [Publish] - Water tank level
│
└── electricity/
    └── usage           [Publish] - Electricity consumption
```

## Data Flow

### Lights Control (Dashboard → ESP32)
```
User clicks switch in Dashboard
         ↓
Dashboard publishes MQTT: "mosque/lights/downstairs/set" = "ON"
         ↓
MQTT Broker forwards to ESP32
         ↓
ESP32 receives command and activates GPIO 4
         ↓
Relay switches, lights turn ON
         ↓
ESP32 publishes status: "mosque/lights/status" = {"downstairs":true}
         ↓
Dashboard updates UI to reflect new state
```

### Prayer Times (Server → Dashboard)
```
Dashboard requests: GET http://localhost:5001/api/prayer-times
         ↓
Prayer Server calculates times for Bahrain
         ↓
Server responds with JSON containing all prayer times
         ↓
Dashboard displays times in UI
         ↓
User clicks +/- to adjust
         ↓
Dashboard publishes MQTT: "mosque/prayer/adjust/Fajr" = "+5"
         ↓
ESP32/Other devices receive adjustment
```

## ESP32 Device States

```
┌─────────────┐
│   Powered   │
│     On      │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Connecting  │  ← LED Blinking
│  to WiFi    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   WiFi      │  ← LED Solid ON
│  Connected  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Connecting  │
│  to MQTT    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Ready     │  ← Listening for commands
│  Listening  │  ← Publishing status every 30s
└─────────────┘
```

## Network Configuration

### Required Ports
- **1883**: MQTT (TCP)
- **8080**: MQTT WebSocket (for web dashboard)
- **5001**: Prayer API Server (HTTP)
- **3000**: Dashboard Development Server (HTTP)

### IP Address Examples
```
Router:           192.168.1.1
Computer/Server:  192.168.1.100  (MQTT Broker + Dashboard)
ESP32 #1:         192.168.1.101  (Downstairs Controller)
ESP32 #2:         192.168.1.102  (Upstairs Controller)
```

## Security Considerations

### Current Implementation
- ⚠️ No authentication on MQTT broker
- ⚠️ No TLS/SSL encryption
- ⚠️ Local network only

### Production Recommendations
- ✅ Enable MQTT authentication (username/password)
- ✅ Use TLS/SSL for MQTT (port 8883)
- ✅ Implement JWT authentication for dashboard
- ✅ Use HTTPS for web dashboard
- ✅ Firewall rules to restrict access
- ✅ Regular firmware updates for ESP32

## Scalability

### Adding More Devices
1. Flash new ESP32 with updated `device_id`
2. Update MQTT topics if needed
3. Add device in Dashboard ESP32 Setup page
4. Configure in Dashboard

### Adding More Features
- Temperature sensors
- Motion detectors
- Door access control
- Sound system control
- Camera integration
- Attendance tracking
