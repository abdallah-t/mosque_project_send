# Dynamic Prayer Times System

## Overview

The mosque project now features a comprehensive dynamic prayer times system that allows users to select their location and automatically updates prayer times daily after Fajr prayer.

## Features

### 1. Location Selection
- **149+ Saudi Arabian Cities**: Users can select from locations.json containing cities with GPS coordinates
- **Location Persistence**: Selected location is saved to localStorage
- **Location Selector Component**: Easy-to-use dropdown in both Dashboard and Clock views

### 2. Smart Caching & Updates
- **Daily Auto-Update**: Prayer times automatically refresh after Fajr prayer each day
- **localStorage Cache**: Reduces server calls by storing prayer times locally
- **Manual Refresh**: Users can manually refresh if needed
- **Adjustment Tracking**: Manual time adjustments are persisted separately

### 3. Manual Time Adjustments
- **Per-Prayer Adjustments**: Each prayer time can be adjusted independently
- **Increment/Decrement**: Use +/- buttons to adjust times by 1 minute
- **Persistent Adjustments**: Adjustments are tracked separately from base times
- **Applied After Fetch**: Original server times + saved adjustments = displayed time

## Architecture

### Backend (prayer_server.py)

#### Endpoints:
- `GET /api/locations` - Returns all available locations from locations.json
  - Response: `{ locations: [...], count: 149 }`

- `GET /api/prayer-times` - Get prayer times for a location
  - Query Parameters:
    - `city=CityName` - Get times for specific city (e.g., `?city=Mecca`)
    - `latitude=X&longitude=Y` - Get times for coordinates (e.g., `?latitude=21.4225&longitude=39.8262`)
  - Response: Full prayer times data including Hijri date, location info, etc.

#### Implementation:
```python
# Load locations.json into memory
LOCATIONS = load_locations()

# Create prayer API instance with selected coordinates
location_prayer_api = SimplePrayerAPI()
location_prayer_api.latitude = lat
location_prayer_api.longitude = lon
```

### Frontend Storage Service (prayerTimesStorage.ts)

#### Key Interfaces:
```typescript
interface PrayerTime {
  name: string;
  nameArabic: string;
  time: string;
  adjustment: number; // Manual adjustment in minutes
}

interface Location {
  city: string;
  latitude: number;
  longitude: number;
}

interface StoredPrayerData {
  location: Location;
  date: string; // ISO date string (YYYY-MM-DD)
  lastFetch: string; // ISO timestamp
  prayerTimes: PrayerTime[];
}
```

#### Static Methods:
- `PrayerTimesStorage.getPrayerTimes()` - Get stored prayer times
- `PrayerTimesStorage.savePrayerTimes(data)` - Save prayer times to localStorage
- `PrayerTimesStorage.getLocation()` - Get selected location
- `PrayerTimesStorage.saveLocation(location)` - Save selected location
- `PrayerTimesStorage.needsUpdate()` - Check if update needed (after Fajr on new day)
- `PrayerTimesStorage.applyAdjustments(times)` - Apply manual adjustments to prayer times
- `PrayerTimesStorage.updateAdjustment(prayerName, minutes)` - Increment adjustment for a prayer
- `PrayerTimesStorage.clear()` - Clear all stored data
- `PrayerTimesStorage.getAdjustments()` - Get all current adjustments

#### Storage Keys:
- `mosque_prayer_times` - Prayer times data
- `mosque_selected_location` - Selected location

### Components

#### LocationSelector.tsx
- Fetches locations from `/api/locations`
- Displays dropdown with all cities
- Saves selection to PrayerTimesStorage
- Triggers refresh callback on change

#### PrayerTimes.tsx (Dashboard)
- Displays prayer times in a grid
- Includes LocationSelector in header
- +/- buttons for manual adjustments
- Auto-updates when needsUpdate() returns true
- Checks for updates every hour

#### Clock.tsx (Full-Screen Display)
- Full-screen Islamic-themed prayer clock
- Includes LocationSelector
- Same smart caching logic as Dashboard
- Shows next prayer countdown
- Auto-updates after Fajr

## User Flow

### Initial Setup
1. User opens Dashboard or Clock page
2. LocationSelector loads locations from API
3. If no saved location, first city is selected by default (can be changed)
4. Location is saved to localStorage
5. Prayer times are fetched for selected location
6. Times and adjustments are cached in localStorage

### Daily Usage
1. User opens app in the morning
2. `needsUpdate()` checks:
   - Is it a new day?
   - Is current time after Fajr?
3. If yes, fetch new prayer times from server
4. Apply any saved adjustments to new times
5. Display updated times to user

### Location Change
1. User selects different city from dropdown
2. New location saved to localStorage
3. Prayer times fetched for new location
4. Previous adjustments are cleared (fresh start for new location)
5. New times displayed

### Time Adjustment
1. User clicks +/- button on a prayer time
2. Time incremented/decremented by 1 minute in UI
3. Adjustment saved to localStorage: `updateAdjustment(prayerName, ±1)`
4. Adjustments persist across sessions
5. Applied to base times after each fetch

## Update Logic

### needsUpdate() Algorithm:
```typescript
static needsUpdate(): boolean {
  const stored = this.getPrayerTimes();
  if (!stored) return true; // No data - update needed
  
  const storedDate = new Date(stored.date);
  const today = new Date();
  
  // Get date strings (YYYY-MM-DD)
  const storedDateString = storedDate.toISOString().split('T')[0];
  const todayDateString = today.toISOString().split('T')[0];
  
  if (storedDateString !== todayDateString) {
    // New day - check if after Fajr
    const fajrPrayer = stored.prayerTimes.find(p => p.name === 'Fajr');
    const [hours, minutes] = fajrPrayer.time.split(':').map(Number);
    const now = new Date();
    const fajrTime = new Date();
    fajrTime.setHours(hours, minutes, 0, 0);
    
    // Update if current time is after Fajr
    return now > fajrTime;
  }
  
  return false; // Same day - no update
}
```

### Adjustment Application:
```typescript
static applyAdjustments(prayerTimes: PrayerTime[]): PrayerTime[] {
  const stored = this.getPrayerTimes();
  if (!stored) return prayerTimes;
  
  return prayerTimes.map(prayer => {
    // Find matching prayer in stored data
    const storedPrayer = stored.prayerTimes.find(p => p.name === prayer.name);
    if (!storedPrayer || !storedPrayer.adjustment) {
      return prayer;
    }
    
    // Apply adjustment
    const [hours, minutes] = prayer.time.split(':').map(Number);
    let totalMinutes = hours * 60 + minutes + storedPrayer.adjustment;
    
    // Handle day boundaries
    if (totalMinutes < 0) totalMinutes += 24 * 60;
    if (totalMinutes >= 24 * 60) totalMinutes -= 24 * 60;
    
    const newHours = Math.floor(totalMinutes / 60);
    const newMinutes = totalMinutes % 60;
    
    return {
      ...prayer,
      time: `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`,
      adjustment: storedPrayer.adjustment,
    };
  });
}
```

## Benefits

1. **Reduced Server Load**: Prayer times cached locally, only fetch once per day
2. **Offline Support**: Stored times available even without server connection
3. **User Flexibility**: 149+ locations to choose from
4. **Customization**: Manual adjustments for specific mosque schedules
5. **Automatic Updates**: No manual intervention needed - updates after Fajr
6. **Persistent Preferences**: Location and adjustments saved across sessions

## Testing

### Test Location Selection:
1. Open Dashboard or Clock page
2. Click location dropdown in header
3. Select different city (e.g., "Mecca", "Medina")
4. Verify prayer times update
5. Verify location persists on refresh

### Test Daily Update:
1. Open app before Fajr time
2. Wait until after Fajr (or change system time)
3. Refresh page or wait for hourly check
4. Verify `needsUpdate()` triggers fetch
5. Check console logs for "Prayer times need update"

### Test Manual Adjustments:
1. Click + button on Fajr time
2. Verify time increases by 1 minute
3. Refresh page
4. Verify adjustment persisted
5. Change location
6. Verify adjustments reset for new location

### Test Offline Behavior:
1. Load prayer times normally
2. Stop prayer_server.py
3. Refresh page
4. Verify stored times still display
5. Check error handling for failed fetch

## Future Enhancements

- [ ] Implement actual prayer time calculations (replace SimplePrayerAPI mock)
- [ ] Add timezone support for international locations
- [ ] Implement different calculation methods (ISNA, MWL, etc.)
- [ ] Add Iqama times (separate from Adhan times)
- [ ] Export/import settings for backup
- [ ] Multi-language support for city names
- [ ] Search/filter in location dropdown
- [ ] Display calculation method in UI
- [ ] Add notification system for prayer times
- [ ] Implement Hijri calendar with accurate conversion

## Dependencies

### Backend:
- Flask 2.0+
- Flask-CORS
- Python 3.8+

### Frontend:
- React 18+
- TypeScript 5+
- shadcn/ui components (Select)
- localStorage API

## Files Modified/Created

### Created:
- `dashboard/src/lib/prayerTimesStorage.ts` - Storage service
- `dashboard/src/components/dashboard/LocationSelector.tsx` - Location dropdown component
- `PRAYER_TIMES_SYSTEM.md` - This documentation

### Modified:
- `prayer_server.py` - Added location endpoints and dynamic coordinates
- `dashboard/src/components/dashboard/PrayerTimes.tsx` - Integrated location selector and smart caching
- `dashboard/src/pages/Clock.tsx` - Integrated location selector and smart caching

## API Examples

### Get all locations:
```bash
curl http://localhost:5001/api/locations
```

### Get prayer times for Mecca:
```bash
curl "http://localhost:5001/api/prayer-times?city=Mecca"
```

### Get prayer times by coordinates:
```bash
curl "http://localhost:5001/api/prayer-times?latitude=21.4225&longitude=39.8262"
```

## localStorage Structure

### mosque_selected_location:
```json
{
  "city": "Mecca",
  "latitude": 21.4225,
  "longitude": 39.8262
}
```

### mosque_prayer_times:
```json
{
  "location": {
    "city": "Mecca",
    "latitude": 21.4225,
    "longitude": 39.8262
  },
  "date": "2025-01-31",
  "lastFetch": "2025-01-31T05:30:00.000Z",
  "prayerTimes": [
    {
      "name": "Fajr",
      "nameArabic": "الفجر",
      "time": "05:20",
      "adjustment": 2
    },
    {
      "name": "Sunrise",
      "nameArabic": "الشروق",
      "time": "06:45",
      "adjustment": 0
    }
    // ... other prayers
  ]
}
```

## Troubleshooting

### Prayer times not updating:
1. Check console for error messages
2. Verify prayer_server.py is running on port 5001
3. Check network tab for API calls
4. Clear localStorage: `PrayerTimesStorage.clear()`
5. Verify VITE_API_URL environment variable

### Location not saving:
1. Check browser localStorage permissions
2. Verify LocationSelector is receiving onLocationChange callback
3. Check console for storage errors
4. Try different browser (test localStorage support)

### Adjustments not persisting:
1. Verify updateAdjustment() is being called
2. Check localStorage for 'mosque_prayer_times' key
3. Verify adjustment property in stored data
4. Check applyAdjustments() is called after fetch

### Daily update not triggering:
1. Verify system date/time is correct
2. Check Fajr time in stored data
3. Test needsUpdate() logic manually
4. Check hourly interval is running (setInterval)
5. Review console logs for update check messages

---

**Version**: 1.0  
**Date**: January 2025  
**Status**: ✅ Implemented and Tested
