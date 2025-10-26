# MAC Address-Based MQTT Setup Guide

## Overview
The system has been updated to use MAC addresses as unique identifiers for ESP32 devices. Each device automatically generates its own MQTT topics based on its MAC address.

## 🔧 ESP32 Configuration

### MQTT Topic Structure
Each ESP32 publishes to topics using its MAC address:
- `<MAC_ADDRESS>/relay1/set` - Control relay 1
- `<MAC_ADDRESS>/relay2/set` - Control relay 2  
- `<MAC_ADDRESS>/relay3/set` - Control relay 3
- `<MAC_ADDRESS>/relay4/set` - Control relay 4
- `<MAC_ADDRESS>/status` - Current status of all relays (JSON)
- `devices/<MAC_ADDRESS>/status` - Device information (IP, RSSI, name)

### Example Topics
For a device with MAC address `A1B2C3D4E5F6`:
```
A1B2C3D4E5F6/relay1/set
A1B2C3D4E5F6/relay2/set
A1B2C3D4E5F6/relay3/set
A1B2C3D4E5F6/relay4/set
A1B2C3D4E5F6/status
devices/A1B2C3D4E5F6/status
```

### Relay Status Message (JSON)
Published to `<MAC_ADDRESS>/status`:
```json
{
  "relay1": true,
  "relay2": false,
  "relay3": true,
  "relay4": false
}
```

### Device Status Message (JSON)
Published to `devices/<MAC_ADDRESS>/status`:
```json
{
  "device": "esp32_01",
  "name": "ESP32-Relay-Controller",
  "status": "online",
  "ip": "192.168.1.100",
  "rssi": -45
}
```

## 📱 Dashboard Configuration

### Auto-Discovery
The dashboard automatically discovers ESP32 devices by:
1. Subscribing to wildcard topic: `+/status`
2. Extracting MAC address from incoming topics
3. Creating device entries with relay controls
4. Subscribing to: `devices/+/status` for device metadata

### Device Display
Each auto-discovered device shows:
- Device name
- MAC address
- IP address
- Signal strength (RSSI)
- Online/offline status
- Last seen timestamp
- Individual relay control buttons

### Relay Controls
- Click any relay button to toggle it ON/OFF
- Button color indicates current state (filled = ON, outline = OFF)
- Buttons are disabled when device is offline or MQTT is disconnected

## 🚀 Setup Steps

### 1. Upload ESP32 Code
```bash
# For relay-test project
cd "/Users/tantawy/Documents/PlatformIO/Projects/relay-test"
pio run --target upload

# For dev module project
cd "/Users/tantawy/Documents/PlatformIO/Projects/dev module"
pio run --target upload
```

### 2. Check Serial Monitor
After uploading, the Serial Monitor will show:
```
=================================
ESP32 MQTT Relay Controller
=================================
MAC Address: A1B2C3D4E5F6
MQTT Topics:
  A1B2C3D4E5F6/relay1/set
  A1B2C3D4E5F6/relay2/set
  A1B2C3D4E5F6/relay3/set
  A1B2C3D4E5F6/relay4/set
  A1B2C3D4E5F6/status
  devices/A1B2C3D4E5F6/status
```

### 3. Start Dashboard
```bash
cd "/Users/tantawy/Library/CloudStorage/OneDrive-UniversityofTechnologyBahrain/Documents/MasterFolder/academic_life/uni/UTB/business/mosque_project/dashboard"
npm run dev
# or
bun dev
```

### 4. View Devices
1. Navigate to **ESP32 Setup** page
2. Devices will appear automatically in the grid
3. Each device shows its relays with control buttons

## 🔍 Troubleshooting

### Device Not Appearing
1. Check MQTT broker connection (green badge should say "Connected")
2. Verify ESP32 is online (check Serial Monitor)
3. Ensure ESP32 published status to `<MAC_ADDRESS>/status`
4. Check browser console for MQTT messages

### Relay Not Responding
1. Verify device shows "Online" badge
2. Check MQTT connection status
3. Look for publish confirmations in browser console
4. Check ESP32 Serial Monitor for received messages

### Multiple Devices Same MAC
- This shouldn't happen - each ESP32 has unique MAC
- If it does, check for manual device entries in localStorage
- Clear localStorage and let devices auto-discover

## 📊 Benefits of MAC-Based Topics

✅ **Unique Identification**: Every ESP32 has a unique MAC address  
✅ **No Configuration**: No need to hardcode device IDs  
✅ **Scalable**: Add unlimited devices without topic conflicts  
✅ **Auto-Discovery**: Dashboard automatically finds new devices  
✅ **Easy Debugging**: MAC address visible in topics and UI  

## 🔄 Migration from Old Topics

### Old Format (Hardcoded)
```
mosque/lights/relay1/set
mosque/lights/relay2/set
mosque/lights/status
```

### New Format (MAC-Based)
```
A1B2C3D4E5F6/relay1/set
A1B2C3D4E5F6/relay2/set
A1B2C3D4E5F6/status
```

Both formats are currently supported for backwards compatibility, but new devices should use MAC-based topics.

## 📝 Code Files Updated

### ESP32 Projects
- `/relay-test/src/main.cpp` - Updated to use MAC-based topics
- `/dev module/src/main.cpp` - Updated to use MAC-based topics

### Dashboard
- `/dashboard/src/contexts/MqttContext.tsx` - Added MAC discovery and relay management
- `/dashboard/src/lib/mqtt.ts` - Added wildcard topic matching
- `/dashboard/src/pages/ESP32Setup.tsx` - Added relay controls to device cards

## 🎯 Next Steps

1. **Upload code** to both ESP32 boards
2. **Monitor Serial** output to confirm MAC addresses and topics
3. **Open dashboard** and navigate to ESP32 Setup
4. **Test relays** by clicking the buttons
5. **Add more devices** by uploading the code to additional ESP32s

All devices will automatically appear in the dashboard - no manual configuration needed! 🎉
