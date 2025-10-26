// Prayer Times Storage Service
// Handles storing, retrieving, and updating prayer times with location data

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

const STORAGE_KEY = 'mosque_prayer_times';
const LOCATION_KEY = 'mosque_selected_location';

// Helper function to convert 24-hour time to 12-hour format
export function convertTo12Hour(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12; // Convert 0 to 12 for midnight
  return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
}

export class PrayerTimesStorage {
  
  // Get stored prayer times
  static getPrayerTimes(): StoredPrayerData | null {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error reading prayer times from storage:', error);
      return null;
    }
  }

  // Save prayer times
  static savePrayerTimes(data: StoredPrayerData): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      console.log('Prayer times saved:', data);
      
      // Dispatch custom event for same-window updates
      window.dispatchEvent(new CustomEvent('prayerTimesUpdated', { 
        detail: { type: 'saved', location: data.location } 
      }));
    } catch (error) {
      console.error('Error saving prayer times to storage:', error);
    }
  }

  // Get selected location
  static getLocation(): Location | null {
    try {
      const data = localStorage.getItem(LOCATION_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error reading location from storage:', error);
      return null;
    }
  }

  // Save selected location
  static saveLocation(location: Location): void {
    try {
      localStorage.setItem(LOCATION_KEY, JSON.stringify(location));
      console.log('Location saved:', location);
    } catch (error) {
      console.error('Error saving location to storage:', error);
    }
  }

  // Check if prayer times need update (after Fajr or new day)
  static needsUpdate(): boolean {
    const stored = this.getPrayerTimes();
    if (!stored) {
      console.log('No stored data - update needed');
      return true;
    }

    const storedDate = new Date(stored.date);
    const today = new Date();
    
    // Check if it's a different day
    const storedDateString = storedDate.toISOString().split('T')[0];
    const todayDateString = today.toISOString().split('T')[0];
    
    if (storedDateString !== todayDateString) {
      // It's a new day - check if current time is after Fajr
      const fajrPrayer = stored.prayerTimes.find(p => p.name === 'Fajr');
      if (fajrPrayer) {
        const [hours, minutes] = fajrPrayer.time.split(':').map(Number);
        const now = new Date();
        const fajrTime = new Date();
        fajrTime.setHours(hours, minutes, 0, 0);
        
        // If current time is after Fajr, we need to update
        if (now > fajrTime) {
          console.log('New day and after Fajr - update needed');
          return true;
        }
      }
    }

    console.log('Prayer times are up to date');
    return false;
  }

  // Apply manual adjustments to prayer times
  static applyAdjustments(baseTimes: PrayerTime[]): PrayerTime[] {
    const stored = this.getPrayerTimes();
    if (!stored) return baseTimes.map(p => ({ ...p, adjustment: 0 }));

    return baseTimes.map(prayer => {
      const storedPrayer = stored.prayerTimes.find(p => p.name === prayer.name);
      if (storedPrayer && storedPrayer.adjustment !== 0) {
        // Apply adjustment
        const [hours, mins] = prayer.time.split(':').map(Number);
        let totalMinutes = hours * 60 + mins + storedPrayer.adjustment;

        // Handle day boundaries
        if (totalMinutes < 0) totalMinutes += 24 * 60;
        if (totalMinutes >= 24 * 60) totalMinutes -= 24 * 60;

        const newHours = Math.floor(totalMinutes / 60);
        const newMins = totalMinutes % 60;

        return {
          ...prayer,
          time: `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`,
          adjustment: storedPrayer.adjustment
        };
      }
      return { ...prayer, adjustment: 0 };
    });
  }

  // Update adjustment for a specific prayer (incremental)
  static updateAdjustment(prayerName: string, minutesToAdd: number): void {
    const stored = this.getPrayerTimes();
    if (!stored) return;

    const updatedPrayerTimes = stored.prayerTimes.map(prayer => {
      if (prayer.name === prayerName) {
        const newAdjustment = (prayer.adjustment || 0) + minutesToAdd;
        
        // Note: We keep the BASE time unchanged in storage
        // Only the adjustment value changes
        return { 
          ...prayer,
          adjustment: newAdjustment
        };
      }
      return prayer;
    });

    this.savePrayerTimes({
      ...stored,
      prayerTimes: updatedPrayerTimes
    });

    // Dispatch custom event for same-window updates
    window.dispatchEvent(new CustomEvent('prayerTimesUpdated', { 
      detail: { prayerName, adjustment: minutesToAdd } 
    }));

    console.log(`Adjusted ${prayerName} by ${minutesToAdd} minutes, new total adjustment: ${updatedPrayerTimes.find(p => p.name === prayerName)?.adjustment}`);
  }

  // Clear all data (for testing or reset)
  static clear(): void {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LOCATION_KEY);
    console.log('Prayer times storage cleared');
  }

  // Get current adjustments for all prayers
  static getAdjustments(): { [key: string]: number } {
    const stored = this.getPrayerTimes();
    if (!stored) return {};

    const adjustments: { [key: string]: number } = {};
    stored.prayerTimes.forEach(prayer => {
      adjustments[prayer.name] = prayer.adjustment || 0;
    });
    return adjustments;
  }
}

export type { PrayerTime, Location, StoredPrayerData };
