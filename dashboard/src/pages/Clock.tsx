import { useState, useEffect } from 'react';
import { MapPin, RefreshCw, AlertCircle } from 'lucide-react';
import PrayerTimeCard from '@/components/dashboard/PrayerTimeCard';
import CurrentTimeDisplay from '@/components/dashboard/CurrentTimeDisplay';
import DateDisplay from '@/components/dashboard/DateDisplay';
import NextPrayerCountdown from '@/components/dashboard/NextPrayerCountdown';
import { PrayerTimesStorage, type Location, type PrayerTime as StoredPrayerTime } from '@/lib/prayerTimesStorage';

interface PrayerTime {
    name: string;
    nameArabic: string;
    time: string;
}

interface PrayerApiResponse {
    prayerTimes: PrayerTime[];
    location: string;
    hijriDate: string;
    gregorianDate: string;
    additionalTimes: {
        midnight: string;
        secondThirdOfNight: string;
        lastThirdOfNight: string;
        qiblahDirection: string;
    };
    locationInfo: {
        longitude: number;
        latitude: number;
        timezone: string;
        fajr_isha_method: string;
        asr_madhab: string;
    };
}

const Clock = () => {
    // State for prayer times and loading
    const [prayerTimes, setPrayerTimes] = useState<PrayerTime[]>([
        { name: 'Fajr', nameArabic: 'الفجر', time: '...' },
        { name: 'Sunrise', nameArabic: 'الشروق', time: '...' },
        { name: 'Dhuhr', nameArabic: 'الظهر', time: '...' },
        { name: 'Asr', nameArabic: 'العصر', time: '...' },
        { name: 'Maghrib', nameArabic: 'المغرب', time: '...' },
        { name: 'Isha', nameArabic: 'العشاء', time: '...' },
    ]);

    const [location, setLocation] = useState('MANAMA, BH');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    // API base URL - adjust this to match your backend server
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

    // Function to fetch prayer times from API
    const fetchPrayerTimes = async (selectedLocation?: Location) => {
        setIsLoading(true);
        setError(null);

        try {
            // Get location from parameter or storage
            const loc = selectedLocation || PrayerTimesStorage.getLocation();
            if (!loc) {
                throw new Error('No location selected');
            }

            console.log('Clock: Fetching prayer times for location:', loc);

            // Fetch with city parameter
            const url = `${API_BASE_URL}/prayer-times?city=${encodeURIComponent(loc.city)}`;
            console.log('Clock: Fetching from URL:', url);

            const response = await fetch(url);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Clock: API Error Response:', errorText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data: PrayerApiResponse = await response.json();
            console.log('Clock: Received prayer times data:', data);

            // Get existing adjustments before saving new data
            const existingData = PrayerTimesStorage.getPrayerTimes();
            const existingAdjustments: { [key: string]: number } = {};
            if (existingData) {
                existingData.prayerTimes.forEach(prayer => {
                    existingAdjustments[prayer.name] = prayer.adjustment || 0;
                });
            }

            // Save base times with preserved adjustments
            const storedPrayers: StoredPrayerTime[] = data.prayerTimes.map(prayer => ({
                name: prayer.name,
                nameArabic: prayer.nameArabic,
                time: prayer.time,
                adjustment: existingAdjustments[prayer.name] || 0, // Preserve existing adjustments
            }));

            PrayerTimesStorage.savePrayerTimes({
                location: loc,
                date: new Date().toISOString().split('T')[0],
                lastFetch: new Date().toISOString(),
                prayerTimes: storedPrayers,
            });

            // Apply adjustments to get displayed times
            const adjustedPrayers = PrayerTimesStorage.applyAdjustments(storedPrayers);

            // Update state
            setPrayerTimes(adjustedPrayers.map(p => ({
                name: p.name,
                nameArabic: p.nameArabic,
                time: p.time,
            })));
            setLocation(data.location);
            setLastUpdated(new Date());

            console.log('Prayer times updated:', data);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch prayer times';
            setError(errorMessage);
            console.error('Error fetching prayer times:', err);

            // Try to load from storage and apply adjustments
            const stored = PrayerTimesStorage.getPrayerTimes();
            if (stored) {
                const adjustedPrayers = PrayerTimesStorage.applyAdjustments(stored.prayerTimes);
                setPrayerTimes(adjustedPrayers.map(p => ({
                    name: p.name,
                    nameArabic: p.nameArabic,
                    time: p.time,
                })));
                setLocation(`${stored.location.city}, SA`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch prayer times on component mount and set up refresh interval
    useEffect(() => {
        const loadPrayerTimes = async () => {
            // Check if we need to update
            if (PrayerTimesStorage.needsUpdate()) {
                console.log('Prayer times need update - fetching from server');
                await fetchPrayerTimes();
            } else {
                console.log('Using stored prayer times');
                // Load from storage and apply adjustments
                const stored = PrayerTimesStorage.getPrayerTimes();
                if (stored) {
                    const adjustedPrayers = PrayerTimesStorage.applyAdjustments(stored.prayerTimes);
                    setPrayerTimes(adjustedPrayers.map(p => ({
                        name: p.name,
                        nameArabic: p.nameArabic,
                        time: p.time,
                    })));
                    setLocation(`${stored.location.city}, SA`);
                    setLastUpdated(new Date(stored.lastFetch));
                    setIsLoading(false);
                } else {
                    // No stored data - fetch from server
                    await fetchPrayerTimes();
                }
            }
        };

        loadPrayerTimes();

        // Check for updates every hour
        const refreshInterval = setInterval(() => {
            if (PrayerTimesStorage.needsUpdate()) {
                console.log('Hourly check - fetching new prayer times');
                fetchPrayerTimes();
            }
        }, 60 * 60 * 1000);

        return () => clearInterval(refreshInterval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Listen for prayer time updates (custom event for same-window updates)
    useEffect(() => {
        const handlePrayerTimesUpdate = () => {
            console.log('Prayer times updated - reloading');
            // Reload from storage and apply adjustments
            const stored = PrayerTimesStorage.getPrayerTimes();
            if (stored) {
                const adjustedPrayers = PrayerTimesStorage.applyAdjustments(stored.prayerTimes);
                setPrayerTimes(adjustedPrayers.map(p => ({
                    name: p.name,
                    nameArabic: p.nameArabic,
                    time: p.time,
                })));
                setLocation(`${stored.location.city}, SA`);
                setLastUpdated(new Date(stored.lastFetch));
            }
        };

        // Listen for custom event (works within same window)
        window.addEventListener('prayerTimesUpdated', handlePrayerTimesUpdate);

        // Also listen for storage event (works across tabs/windows)
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'mosque_prayer_times') {
                handlePrayerTimesUpdate();
            }
        };
        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('prayerTimesUpdated', handlePrayerTimesUpdate);
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    // Determine next prayer
    const [nextPrayerIndex, setNextPrayerIndex] = useState(0);

    useEffect(() => {
        const findNextPrayer = () => {
            const now = new Date();
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            const currentTime = currentHour * 60 + currentMinute;

            for (let i = 0; i < prayerTimes.length; i++) {
                const [prayerHour, prayerMinute] = prayerTimes[i].time.split(':').map(Number);
                const prayerTime = prayerHour * 60 + prayerMinute;

                if (prayerTime > currentTime) {
                    setNextPrayerIndex(i);
                    return;
                }
            }
            setNextPrayerIndex(0); // Next is Fajr tomorrow
        };

        findNextPrayer();
        const interval = setInterval(findNextPrayer, 60000);
        return () => clearInterval(interval);
    }, [prayerTimes]);

    return (
        <div className="h-screen w-screen overflow-hidden bg-background flex flex-col">
            {/* Header Section - Fixed Height */}
            <div className="flex-none bg-gradient-to-r from-primary to-secondary p-4 shadow-lg">
                <div className="container mx-auto flex justify-between items-center">
                    {/* Date Display */}
                    <div className="flex items-center gap-4">
                        <DateDisplay />
                    </div>

                    {/* Current Location and Refresh */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-primary-foreground">
                            <MapPin className="w-5 h-5" />
                            <span className="text-lg font-semibold">{location}</span>
                        </div>
                        <button
                            onClick={() => fetchPrayerTimes()}
                            disabled={isLoading}
                            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
                            title="Refresh prayer times"
                        >
                            <RefreshCw className={`w-5 h-5 text-primary-foreground ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="flex-none bg-destructive/10 border-l-4 border-destructive px-6 py-3">
                    <div className="container mx-auto flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-destructive" />
                        <div className="flex-1">
                            <p className="text-destructive font-semibold">Unable to fetch prayer times</p>
                            <p className="text-destructive/80 text-sm">{error}</p>
                        </div>
                        <button
                            onClick={() => fetchPrayerTimes()}
                            className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors text-sm"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            )}

            {/* Main Content - Flexible */}
            <div className="flex-1 overflow-hidden">
                <div className="container mx-auto h-full p-4">
                    <div className="h-full flex flex-col gap-3">
                        {/* Current Time Display */}
                        <div className="flex-none">
                            <CurrentTimeDisplay />
                        </div>

                        {/* Prayer Times Grid - Takes remaining space */}
                        <div className="flex-1 min-h-0">
                            <div className="h-full grid grid-cols-3 lg:grid-cols-6 gap-3 content-center">
                                {prayerTimes.map((prayer, index) => (
                                    <PrayerTimeCard
                                        key={prayer.name}
                                        name={prayer.name}
                                        nameArabic={prayer.nameArabic}
                                        time={prayer.time}
                                        isNext={index === nextPrayerIndex}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Next Prayer Countdown - Fixed at bottom */}
                        <div className="flex-none">
                            <NextPrayerCountdown nextPrayerTime={prayerTimes[nextPrayerIndex].time} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer - Last Updated */}
            {lastUpdated && !error && (
                <div className="flex-none bg-muted/50 py-2 text-center">
                    <p className="text-muted-foreground text-sm">
                        Last updated: {lastUpdated.toLocaleTimeString()}
                    </p>
                </div>
            )}
        </div>
    );
};

export default Clock;
