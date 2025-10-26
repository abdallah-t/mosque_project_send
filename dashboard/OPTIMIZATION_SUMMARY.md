# Dashboard Optimization Summary

## Changes Made

### 1. **ESP32Setup.tsx** - Updated Device Configuration
- Changed default device to match actual ESP32 (`esp32_01`)
- Added device metadata fields: `rssi`, `lastSeen`
- Updated IP address display to show "auto" (retrieved from device status)
- Improved device card to show signal strength and last seen time

**Key Changes:**
```typescript
// Old default devices
{ id: '1', name: 'Downstairs Lights', topic: 'mosque/lights/downstairs', ... }
{ id: '2', name: 'Upstairs Lights', topic: 'mosque/lights/upstairs', ... }

// New default device (matches ESP32)
{ id: 'esp32_01', name: 'ESP32 Relay Controller', topic: 'mosque/devices/esp32_01', ipAddress: 'auto', online: false }
```

### 2. **MqttContext.tsx** - Fixed MQTT Communication
- Updated default broker URL to match ESP32: `ws://192.168.100.81:8080`
- Fixed light status subscription to parse ESP32's JSON format: `{"downstairs":true,"upstairs":false}`
- Added `mosque/devices/status` subscription to track ESP32 online status
- Fixed light control topics to include `/set` suffix (e.g., `mosque/lights/downstairs/set`)
- Added device state tracking with IP address and signal strength updates

**MQTT Topics Now Match ESP32:**
- **Subscribe:** `mosque/lights/status` (receives: `{"downstairs":true,"upstairs":false}`)
- **Subscribe:** `mosque/devices/status` (receives: `{"device":"esp32_01","name":"...","status":"online","ip":"...","rssi":-45}`)
- **Publish:** `mosque/lights/downstairs/set` (sends: "ON" or "OFF")
- **Publish:** `mosque/lights/upstairs/set` (sends: "ON" or "OFF")

### 3. **LightsControl.tsx** - Enhanced UI
- Added connection status badge
- Added status text under each zone ("Active" / "Inactive")
- Disabled switches when offline
- Added GPIO pin information
- Improved visual feedback

### 4. **.env.example** - Updated Default Configuration
- Changed default broker URL from `ws://localhost:8080` to `ws://192.168.100.81:8080`

### 5. **MQTT_SETUP.md** - Created Complete Setup Guide
- Mosquitto installation and configuration instructions
- MQTT topic documentation
- Testing procedures with `mosquitto_pub`/`mosquitto_sub`
- Troubleshooting guide
- Message format examples

## How It Works Now

### ESP32 → Dashboard Flow
1. ESP32 connects to MQTT broker at `192.168.100.81:1883`
2. ESP32 publishes device status every 30 seconds to `mosque/devices/status`
3. Dashboard subscribes to `mosque/devices/status` and updates device info (IP, RSSI, online status)
4. ESP32 publishes light states to `mosque/lights/status` as JSON
5. Dashboard receives and displays current light states

### Dashboard → ESP32 Flow
1. User toggles a light switch in the dashboard
2. Dashboard publishes to `mosque/lights/{zone}/set` with payload "ON" or "OFF"
3. ESP32 receives the message and controls the relay
4. ESP32 publishes updated status back to `mosque/lights/status`
5. Dashboard receives and confirms the change

## Testing Steps

### 1. Verify MQTT Broker
```bash
# Check if mosquitto is running
brew services list | grep mosquitto

# If not running, start it
brew services start mosquitto
```

### 2. Test with Command Line
```bash
# Terminal 1: Subscribe to all topics
mosquitto_sub -h 192.168.100.81 -t "mosque/#" -v

# Terminal 2: Test controlling lights
mosquitto_pub -h 192.168.100.81 -t "mosque/lights/downstairs/set" -m "ON"
mosquitto_pub -h 192.168.100.81 -t "mosque/lights/downstairs/set" -m "OFF"
```

### 3. Run the Dashboard
```bash
cd dashboard
bun install  # if needed
bun run dev
```

### 4. Check Browser Console
- Open developer tools (F12)
- Look for: "MQTT Connected successfully"
- Monitor incoming messages: "Received light status:", "Device status received:"

## Expected Behavior

✅ **Dashboard shows:**
- Connection indicator (green = connected)
- Device status updates every 30 seconds
- Real-time light state changes
- ESP32 IP address and signal strength

✅ **ESP32 Serial Monitor shows:**
- WiFi connected with IP address
- MQTT connection successful
- Subscribed to control topics
- Received commands when toggling lights
- Published status updates

## Troubleshooting

### Dashboard Not Connecting
1. Check `.env` file has correct broker URL
2. Verify mosquitto is running with WebSocket on port 8080
3. Check browser console for errors

### Lights Not Responding
1. Verify ESP32 serial monitor shows "Message arrived" when toggling
2. Check topic names match exactly (case-sensitive)
3. Test manually with `mosquitto_pub` commands
4. Ensure relays are wired correctly (active-LOW)

### Device Shows Offline
1. ESP32 publishes status every 30 seconds - wait for update
2. Check ESP32 serial monitor for MQTT connection
3. Verify both devices can reach the broker IP

## Files Modified
- `/dashboard/src/pages/ESP32Setup.tsx`
- `/dashboard/src/contexts/MqttContext.tsx`
- `/dashboard/src/components/dashboard/LightsControl.tsx`
- `/dashboard/.env.example`

## Files Created
- `/dashboard/MQTT_SETUP.md`
- `/dashboard/OPTIMIZATION_SUMMARY.md` (this file)
