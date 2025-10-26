# ESP32 Setup Page Sync Fix

## Problem
The ESP32 Setup page was not syncing with real-time MQTT device status updates. When the ESP32 published its status to the MQTT broker, the MqttContext would update localStorage, but the ESP32Setup page wouldn't reflect these changes.

## Solution Implemented

### 1. **Real-time Event Listeners** (ESP32Setup.tsx)
Added event listeners to detect when MqttContext updates device information:

```typescript
useEffect(() => {
  const handleDevicesChanged = () => {
    const updatedDevices = loadDevices();
    setDevices(updatedDevices);
    setIsLiveSyncing(true);
    console.log('ESP32Setup: Devices updated from MQTT', updatedDevices);
    
    // Reset syncing indicator after animation
    setTimeout(() => setIsLiveSyncing(false), 1000);
  };

  // Listen for custom event from MqttContext
  window.addEventListener('esp32DevicesChanged', handleDevicesChanged);
  
  // Listen for storage events from other tabs/windows
  window.addEventListener('storage', handleStorageChange);

  // Poll for updates every 5 seconds as a fallback
  const interval = setInterval(() => {
    const currentDevices = loadDevices();
    if (JSON.stringify(currentDevices) !== JSON.stringify(devices)) {
      setDevices(currentDevices);
    }
  }, 5000);

  return () => {
    window.removeEventListener('esp32DevicesChanged', handleDevicesChanged);
    window.removeEventListener('storage', handleStorageChange);
    clearInterval(interval);
  };
}, [devices]);
```

### 2. **Auto-Discovery** (MqttContext.tsx)
Enhanced device status subscription to automatically create devices if not found:

```typescript
// If device not found, create it
if (!deviceFound && deviceStatus.device) {
  const newDevice: ESP32Device = {
    id: deviceStatus.device,
    name: deviceStatus.name || `ESP32 Device ${deviceStatus.device}`,
    topic: `mosque/devices/${deviceStatus.device}`,
    ipAddress: deviceStatus.ip || 'auto',
    online: deviceStatus.status === 'online',
    rssi: deviceStatus.rssi,
    lastSeen: new Date().toLocaleString()
  };
  updatedDevices.push(newDevice);
  console.log('Auto-discovered new device:', newDevice);
}
```

### 3. **Visual Feedback**
Added a "Syncing" badge that appears when receiving MQTT updates:

- Shows animated "Syncing" indicator when updates arrive
- Subtitle text: "Auto-sync enabled"
- Disappears after 1 second

### 4. **Better State Management**
- Separated user actions from MQTT updates
- `updateDevices()` function for user-initiated changes
- Direct `setDevices()` for MQTT updates
- Prevents infinite loops and unnecessary re-renders

## How It Works Now

### Flow Diagram
```
ESP32 (every 30s)
    ↓ publishes to
MQTT Broker (mosque/devices/status)
    ↓ received by
MqttContext
    ↓ updates
localStorage + fires 'esp32DevicesChanged' event
    ↓ listened by
ESP32Setup Page
    ↓ updates UI
Device Cards (shows online status, IP, RSSI, last seen)
```

### Sync Methods (Triple Redundancy)

1. **Event-based (Primary)**: `esp32DevicesChanged` custom event
2. **Storage API (Cross-tab)**: `storage` event for other tabs/windows
3. **Polling (Fallback)**: Every 5 seconds check for changes

## Testing

### 1. Monitor Console Logs
Open browser console and watch for:
```
Device status received: {device: "esp32_01", ...}
ESP32Setup: Devices updated from MQTT [...]
```

### 2. Check Live Sync
1. Open ESP32 Setup page
2. Watch ESP32 Serial Monitor publish status every 30 seconds
3. See the "Syncing" badge appear on the setup page
4. Verify device card updates with new info

### 3. Test Cross-Tab Sync
1. Open dashboard in two browser tabs
2. Navigate to ESP32 Setup in both
3. Changes in one tab should sync to the other

### 4. Test Auto-Discovery
1. Clear localStorage: `localStorage.removeItem('mosque_esp32_devices')`
2. Refresh page
3. Wait for ESP32 to publish status (max 30 seconds)
4. Device should auto-appear in the list

## What Updates Automatically

✅ **Online/Offline status** - Updates every 30 seconds from ESP32
✅ **IP Address** - Updated when ESP32 reports it
✅ **Signal Strength (RSSI)** - Updated with each status message
✅ **Last Seen** - Timestamp of last status update
✅ **Auto-discovery** - New devices appear automatically

## Manual Actions

🔘 **Add Device** - Manually add additional ESP32 controllers
🔘 **Remove Device** - Delete devices from the list
🔘 **Refresh** - Force reload of device status from localStorage

## Files Modified

- `dashboard/src/pages/ESP32Setup.tsx` - Added sync logic and visual feedback
- `dashboard/src/contexts/MqttContext.tsx` - Added auto-discovery

## Key Features

1. **Real-time Updates**: Device status updates within 1 second of MQTT message
2. **Auto-Discovery**: ESP32 devices automatically appear when they connect
3. **Visual Feedback**: "Syncing" badge shows when updates occur
4. **Resilient**: Triple-redundancy ensures sync even if one method fails
5. **Cross-Tab**: Changes sync across multiple browser tabs
