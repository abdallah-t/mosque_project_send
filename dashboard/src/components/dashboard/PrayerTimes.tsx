import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Minus, Sunrise } from 'lucide-react';
import { useMqtt } from '@/contexts/MqttContext';
import { toast } from 'sonner';
import { PrayerTimesStorage, convertTo12Hour, type Location, type PrayerTime } from '@/lib/prayerTimesStorage';
import { LocationSelector } from './LocationSelector';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

interface Prayer {
  name: string;
  time: string;
  icon?: React.ReactNode;
  adjustment: number;
}

const PrayerTimes = () => {
  const { updatePrayerTime } = useMqtt();
  const [prayers, setPrayers] = useState<Prayer[]>([
    { name: 'Fajr', time: '04:45', adjustment: 0 },
    { name: 'Sunrise', time: '06:15', icon: <Sunrise className="h-4 w-4" />, adjustment: 0 },
    { name: 'Dhuhr', time: '11:50', adjustment: 0 },
    { name: 'Asr', time: '15:10', adjustment: 0 },
    { name: 'Maghrib', time: '17:45', adjustment: 0 },
    { name: 'Isha', time: '19:15', adjustment: 0 },
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);

  // Fetch prayer times from the server
  const fetchPrayerTimes = async (location?: Location) => {
    try {
      setIsLoading(true);

      // Use provided location or get from storage
      const loc = location || PrayerTimesStorage.getLocation();
      if (!loc) {
        throw new Error('No location selected');
      }

      console.log('Fetching prayer times for location:', loc);

      // Build URL with city parameter
      const url = `${API_BASE_URL}/api/prayer-times?city=${encodeURIComponent(loc.city)}`;
      console.log('Fetching from URL:', url);

      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`Failed to fetch prayer times: ${response.status}`);
      }

      const data = await response.json();
      console.log('Received prayer times data:', data);

      // Get existing adjustments before saving new data
      const existingData = PrayerTimesStorage.getPrayerTimes();
      const existingAdjustments: { [key: string]: number } = {};
      if (existingData) {
        existingData.prayerTimes.forEach(prayer => {
          existingAdjustments[prayer.name] = prayer.adjustment || 0;
        });
      }

      // Map the server response to the component's format, preserving adjustments
      const fetchedPrayers: PrayerTime[] = data.prayerTimes.map((prayer: PrayerTime) => ({
        name: prayer.name,
        nameArabic: prayer.nameArabic,
        time: prayer.time,
        adjustment: existingAdjustments[prayer.name] || 0, // Preserve existing adjustments
      }));

      // Save to storage
      PrayerTimesStorage.savePrayerTimes({
        location: loc,
        date: new Date().toISOString().split('T')[0],
        lastFetch: new Date().toISOString(),
        prayerTimes: fetchedPrayers,
      });

      // Apply stored adjustments
      const adjustedPrayers = PrayerTimesStorage.applyAdjustments(fetchedPrayers);

      // Convert to component format
      const prayers: Prayer[] = adjustedPrayers.map(prayer => ({
        name: prayer.name,
        time: prayer.time,
        adjustment: prayer.adjustment,
        icon: prayer.name === 'Sunrise' ? <Sunrise className="h-4 w-4" /> : undefined,
      }));

      setPrayers(prayers);
      setCurrentLocation(loc);
      toast.success(`Prayer times loaded for ${loc.city}`);
    } catch (error) {
      console.error('Error fetching prayer times:', error);
      toast.error('Failed to load prayer times from server. Using stored times.');

      // Try to load from storage
      const stored = PrayerTimesStorage.getPrayerTimes();
      if (stored) {
        const prayers: Prayer[] = stored.prayerTimes.map(prayer => ({
          name: prayer.name,
          time: prayer.time,
          adjustment: prayer.adjustment,
          icon: prayer.name === 'Sunrise' ? <Sunrise className="h-4 w-4" /> : undefined,
        }));
        setPrayers(prayers);
        setCurrentLocation(stored.location);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Check if update is needed on mount
  useEffect(() => {
    const loadPrayerTimes = async () => {
      // Check if we need to update
      if (PrayerTimesStorage.needsUpdate()) {
        console.log('Prayer times need update - fetching from server');
        await fetchPrayerTimes();
      } else {
        console.log('Using stored prayer times');
        // Load from storage
        const stored = PrayerTimesStorage.getPrayerTimes();
        if (stored) {
          const prayers: Prayer[] = stored.prayerTimes.map(prayer => ({
            name: prayer.name,
            time: prayer.time,
            adjustment: prayer.adjustment,
            icon: prayer.name === 'Sunrise' ? <Sunrise className="h-4 w-4" /> : undefined,
          }));
          setPrayers(prayers);
          setCurrentLocation(stored.location);
          setIsLoading(false);
        } else {
          // No stored data - fetch from server
          await fetchPrayerTimes();
        }
      }
    };

    loadPrayerTimes();

    // Set up daily check (every hour)
    const interval = setInterval(() => {
      if (PrayerTimesStorage.needsUpdate()) {
        console.log('Daily update check - fetching new prayer times');
        fetchPrayerTimes();
      }
    }, 60 * 60 * 1000); // Check every hour

    return () => clearInterval(interval);
  }, []);

  // Handle location change
  const handleLocationChange = (location: Location) => {
    console.log('Location changed to:', location.city);
    fetchPrayerTimes(location);
  };

  const adjustTime = (index: number, minutes: number) => {
    const prayerName = prayers[index].name;

    // Update adjustment in storage
    PrayerTimesStorage.updateAdjustment(prayerName, minutes);

    // Reload from storage and apply adjustments
    const stored = PrayerTimesStorage.getPrayerTimes();
    if (stored) {
      // Apply adjustments to get displayed times
      const adjustedPrayers = PrayerTimesStorage.applyAdjustments(stored.prayerTimes);

      const updatedPrayers: Prayer[] = adjustedPrayers.map(prayer => ({
        name: prayer.name,
        time: prayer.time,
        adjustment: prayer.adjustment,
        icon: prayer.name === 'Sunrise' ? <Sunrise className="h-4 w-4" /> : undefined,
      }));
      setPrayers(updatedPrayers);
    }

    updatePrayerTime(prayerName, minutes);
    toast.success(`${prayerName} time adjusted by ${minutes > 0 ? '+' : ''}${minutes} minute${Math.abs(minutes) !== 1 ? 's' : ''}`);
  };

  return (
    <Card className="overflow-hidden shadow-lg border-primary/20">
      <CardHeader className="bg-gradient-to-r from-primary to-secondary p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-xl font-bold text-primary-foreground">Prayer Times</h2>
          <LocationSelector onLocationChange={handleLocationChange} />
        </div>
        {currentLocation && (
          <p className="text-sm text-primary-foreground/80 mt-2">
            {currentLocation.city}
          </p>
        )}
      </CardHeader>
      <CardContent className="p-6">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {prayers.map((prayer, index) => (
              <div
                key={prayer.name}
                className="flex flex-col items-center p-4 rounded-xl bg-gradient-to-br from-card to-muted/30 border border-border/50 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-2 mb-2">
                  {prayer.icon}
                  <span className="text-sm font-medium text-muted-foreground">{prayer.name}</span>
                </div>
                <div className="text-2xl font-bold mb-3 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  {convertTo12Hour(prayer.time)}
                </div>
                {prayer.name !== 'Sunrise' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0"
                      onClick={() => adjustTime(index, 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0"
                      onClick={() => adjustTime(index, -1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PrayerTimes;
