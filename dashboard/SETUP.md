# Smart Mosque Dashboard - Setup Guide

## Overview
A modern IoT dashboard for controlling mosque lighting zones, monitoring utilities (water tank, electricity), and managing prayer times via MQTT protocol and ESP32 devices.

## Features
- 🔐 **Password Authentication** (fingerprint module ready)
- 🕌 **Prayer Times Management** with +/- adjustment buttons
- ⚡ **Real-time Electricity Usage** monitoring
- 💧 **Water Tank Level** gauge display
- 💡 **Light Zone Control** via MQTT commands
- 🔧 **ESP32 Device Management** interface
- 📱 **Responsive Design** for desktop and tablet

## Quick Start

### 1. Environment Setup
Copy `.env.example` to `.env` and configure your MQTT broker:

```bash
cp .env.example .env
```

Edit `.env`:
```env
VITE_MQTT_BROKER_URL=ws://192.168.1.100:8080
# For secure connection: wss://your-broker.com:8083
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```

### 4. Default Login
- **Password**: `admin` (or any password for demo)
- Production: Implement proper authentication

## MQTT Configuration

### Broker Setup
The dashboard expects a WebSocket-enabled MQTT broker. Common options:
- **Mosquitto** with WebSocket support
- **HiveMQ**
- **EMQX**

### MQTT Topics

#### Subscribe (Dashboard listens):
```
mosque/water/level          # Water tank percentage (0-100)
mosque/electricity/usage    # Electricity usage percentage (0-100)
mosque/lights/status        # JSON: {"zone1": true, "zone2": false, ...}
```

#### Publish (Dashboard sends):
```
mosque/lights/zone1/set     # "ON" or "OFF"
mosque/lights/zone2/set     # "ON" or "OFF"
mosque/lights/zone3/set     # "ON" or "OFF"
mosque/prayer/adjust/Fajr   # Minutes adjustment: "+1" or "-1"
```

## ESP32 Configuration

### Example ESP32 Code Structure
```cpp
#include <WiFi.h>
#include <PubSubClient.h>

// MQTT Topics
const char* LIGHT_TOPIC = "mosque/lights/zone1/set";
const char* STATUS_TOPIC = "mosque/lights/status";

void callback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  
  if (String(topic) == LIGHT_TOPIC) {
    if (message == "ON") {
      digitalWrite(RELAY_PIN, HIGH);
    } else {
      digitalWrite(RELAY_PIN, LOW);
    }
  }
}

// Subscribe to control topics
client.subscribe("mosque/lights/zone1/set");

// Publish status updates
String status = "{\"zone1\": true, \"zone2\": false}";
client.publish("mosque/lights/status", status.c_str());
```

### Hardware Connections
- **ESP32 GPIO Pins** → Relay Modules → Light Circuits
- Each relay controls one or more light zones
- Ensure proper isolation and circuit protection

## Dashboard Structure

### Pages
1. **Authentication** (`/`) - Login page
2. **Dashboard** (`/dashboard`) - Main control interface
3. **ESP32 Setup** (`/esp32-setup`) - Device management

### Components
- **PrayerTimes**: Display and adjust prayer times
- **ElectricityGauge**: Circular gauge for power usage
- **WaterTankGauge**: Vertical fuel-style gauge
- **LightsControl**: Toggle switches for each zone
- **Sidebar**: Navigation menu

## Customization

### Adding More Light Zones
Edit `src/contexts/MqttContext.tsx`:
```typescript
const [lightZones, setLightZones] = useState({
  'zone1': false,
  'zone2': false,
  'zone3': false,
  'zone4': false, // Add new zone
});
```

Update `src/components/dashboard/LightsControl.tsx`:
```typescript
const lightZoneNames: { [key: string]: string } = {
  zone1: 'Upstairs Front',
  zone2: 'Downstairs',
  zone3: 'Prayer Hall',
  zone4: 'Courtyard', // Add zone name
};
```

### Changing Colors
Edit `src/index.css` for theme colors:
```css
:root {
  --primary: 142 76% 36%;     /* Islamic green */
  --secondary: 199 89% 48%;   /* Light blue */
  --accent: 28 96% 61%;       /* Gold/amber */
}
```

## Production Deployment

### Security Recommendations
1. ✅ Implement proper user authentication (JWT, OAuth)
2. ✅ Use WSS (secure WebSocket) for MQTT
3. ✅ Add user roles and permissions
4. ✅ Enable HTTPS for web dashboard
5. ✅ Secure ESP32 firmware updates (OTA)
6. ✅ Use strong MQTT credentials
7. ✅ Implement rate limiting

### Build for Production
```bash
npm run build
```

Deploy `dist/` folder to your web server.

## Troubleshooting

### MQTT Not Connecting
- Check broker URL format: `ws://` or `wss://`
- Verify firewall allows WebSocket port (usually 8080 or 8083)
- Test broker with MQTT client tool (MQTT.fx, MQTT Explorer)

### ESP32 Offline
- Check WiFi connection
- Verify MQTT broker address in ESP32 code
- Monitor serial output for errors
- Ensure power supply is adequate

### Lights Not Responding
- Verify MQTT topic names match exactly
- Check relay wiring and power
- Test relay manually with digitalWrite
- Monitor MQTT messages with broker logs

## Support
For issues and questions:
- Check console logs (F12 in browser)
- Verify MQTT topics and messages
- Test ESP32 connections independently

## License
MIT License - Feel free to modify and use for your mosque.
