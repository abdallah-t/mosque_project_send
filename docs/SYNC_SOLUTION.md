# ESP32 Setup & Dashboard Synchronization

## Problem Solved
Previously, when you added or edited ESP32 devices in the ESP32 Setup page, the changes didn't appear in the Dashboard's Lights Control component.

## Solution Implemented

### 1. **Dynamic Zone Loading**
The MQTT context now dynamically loads light zones from the ESP32 devices stored in localStorage, instead of using hardcoded zones.

### 2. **Real-time Synchronization**
When devices are added/edited/removed in ESP32 Setup:
- Changes are saved to localStorage
- A custom event `esp32DevicesChanged` is dispatched
- The MQTT context listens for this event
- Light zones are automatically updated in real-time
- The Lights Control component immediately reflects the changes

### 3. **Cross-Tab Support**
The system also supports changes made in other browser tabs/windows through the standard `storage` event.

## How It Works

### Data Flow
```
ESP32 Setup Page
    ↓ (User adds/edits device)
    ↓
Save to localStorage
    ↓
Dispatch 'esp32DevicesChanged' event
    ↓
MQTT Context listens & reloads zones
    ↓
Lights Control component updates automatically
```

### Topic Extraction
The system extracts zone names from MQTT topics:
- Topic: `mosque/lights/downstairs` → Zone: `downstairs`
- Topic: `mosque/lights/upstairs/set` → Zone: `upstairs`
- Topic: `mosque/lights/prayer-hall` → Zone: `prayer-hall`

### Zone Name Mapping
- Zone ID comes from the topic
- Zone Display Name comes from the device name
- Example:
  - Device Name: "Main Hall Lights"
  - Topic: "mosque/lights/main-hall"
  - Zone: "main-hall"
  - Display: "Main Hall Lights"

## Testing

1. **Add a new device:**
   - Go to ESP32 Setup
   - Click "Add Device"
   - Enter name: "Prayer Hall Lights"
   - Enter topic: "mosque/lights/prayer-hall"
   - Enter IP: "192.168.1.103"
   - Click "Add Device"
   - Navigate to Dashboard
   - ✅ "Prayer Hall Lights" should appear in Lights Control

2. **Remove a device:**
   - Go to ESP32 Setup
   - Click trash icon on a device
   - Navigate to Dashboard
   - ✅ That zone should disappear from Lights Control

3. **Edit device (currently requires remove & re-add):**
   - Remove the device
   - Add it again with new values
   - ✅ Changes reflect immediately

## Key Files Modified

### `/dashboard/src/contexts/MqttContext.tsx`
- Added `lightZoneNames` to context
- Added `loadZonesFromDevices()` function
- Added event listeners for storage changes
- Zones now load dynamically from localStorage

### `/dashboard/src/pages/ESP32Setup.tsx`
- Added `window.dispatchEvent()` in `saveDevices()`
- Triggers custom event on every save

### `/dashboard/src/components/dashboard/LightsControl.tsx`
- Uses `lightZoneNames` from context instead of hardcoded names
- Automatically displays all configured zones

## Features

✅ **Immediate Updates**: Changes appear instantly without page refresh
✅ **Persistent**: All devices saved in browser localStorage
✅ **Dynamic**: Add unlimited zones/devices
✅ **Flexible Topics**: Works with any MQTT topic structure
✅ **Cross-Tab Sync**: Changes sync across browser tabs
✅ **No Hardcoding**: All zones configured through UI

## Future Enhancements

- [ ] Edit device in-place (without remove & re-add)
- [ ] Export/Import device configurations
- [ ] Cloud sync of configurations
- [ ] Device grouping (e.g., Indoor/Outdoor)
- [ ] Zone scheduling per device
- [ ] Device templates for quick setup
