import { useState, useEffect } from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { MapPin } from 'lucide-react';
import { PrayerTimesStorage, type Location } from '@/lib/prayerTimesStorage';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

interface LocationOption {
    city: string;
    coordinates?: {
        latitude: number;
        longitude: number;
    };
    latitude?: number;
    longitude?: number;
}

interface LocationSelectorProps {
    onLocationChange?: (location: Location) => void;
}

export function LocationSelector({ onLocationChange }: LocationSelectorProps) {
    const [locations, setLocations] = useState<LocationOption[]>([]);
    const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load locations from API and current selection from storage
    useEffect(() => {
        const loadData = async () => {
            try {
                // Load saved location from storage
                const saved = PrayerTimesStorage.getLocation();
                if (saved) {
                    setSelectedLocation(saved);
                }

                // Fetch available locations from API
                const response = await fetch(`${API_BASE_URL}/api/locations`);
                if (!response.ok) {
                    throw new Error('Failed to fetch locations');
                }

                const data = await response.json();
                setLocations(data.locations || []);

                // If no saved location, use first location as default
                if (!saved && data.locations && data.locations.length > 0) {
                    const firstLoc = data.locations[0];
                    const defaultLocation: Location = {
                        city: firstLoc.city,
                        latitude: firstLoc.coordinates?.latitude || firstLoc.latitude || 0,
                        longitude: firstLoc.coordinates?.longitude || firstLoc.longitude || 0,
                    };
                    setSelectedLocation(defaultLocation);
                    PrayerTimesStorage.saveLocation(defaultLocation);
                    onLocationChange?.(defaultLocation);
                }
            } catch (error) {
                console.error('Error loading locations:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleLocationChange = (city: string) => {
        const location = locations.find((loc) => loc.city === city);
        if (location) {
            const newLocation: Location = {
                city: location.city,
                latitude: location.coordinates?.latitude || location.latitude || 0,
                longitude: location.coordinates?.longitude || location.longitude || 0,
            };
            setSelectedLocation(newLocation);
            PrayerTimesStorage.saveLocation(newLocation);
            console.log('Location changed to:', newLocation);
            onLocationChange?.(newLocation);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>Loading locations...</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <Select
                value={selectedLocation?.city || ''}
                onValueChange={handleLocationChange}
            >
                <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                    {locations.map((location) => (
                        <SelectItem key={location.city} value={location.city}>
                            {location.city}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
