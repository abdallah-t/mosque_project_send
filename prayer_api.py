from datetime import date
from typing import Optional, Dict, Any

from pyIslam.praytimes import (
    PrayerConf,
    Prayer,
    LIST_FAJR_ISHA_METHODS,
)
from pyIslam.hijri import HijriDate
from pyIslam.qiblah import Qiblah


class PrayerAPI:
    """
    Prayer API class that provides individual functions for each prayer time.
    Uses the same configuration as prayer.py with hardcoded values for Bahrain.
    """
    
    def __init__(self, 
                 longitude: float = 50.20833,
                 latitude: float = 26.27944,
                 timezone: int = 3,
                 fajr_isha_method: int = 4,
                 asr_fiqh: int = 1):
        """
        Initialize the Prayer API with location and calculation parameters.
        
        Args:
            longitude: Longitude coordinate (default: Bahrain)
            latitude: Latitude coordinate (default: Bahrain)
            timezone: Timezone offset from GMT (default: +3 for Bahrain)
            fajr_isha_method: Method for Fajr and Isha calculation (default: 4)
            asr_fiqh: Asr calculation method - 1 for Shafii/Maliki/Hambali, 2 for Hanafi (default: 1)
        """
        self.longitude = longitude
        self.latitude = latitude
        self.timezone = timezone
        self.fajr_isha_method = fajr_isha_method
        self.asr_fiqh = asr_fiqh
        
        # Create prayer configuration
        self.pconf = PrayerConf(longitude, latitude, timezone, fajr_isha_method, asr_fiqh)
        
    def _get_prayer_object(self, target_date: Optional[date] = None) -> Prayer:
        """Get Prayer object for the specified date or today."""
        if target_date is None:
            target_date = date.today()
        return Prayer(self.pconf, target_date)
    
    def get_fajr_time(self, target_date: Optional[date] = None) -> str:
        """
        Get Fajr prayer time.
        
        Args:
            target_date: Date for which to calculate prayer time (default: today)
            
        Returns:
            Fajr prayer time as string
        """
        pt = self._get_prayer_object(target_date)
        return pt.fajr_time()
    
    def get_sherook_time(self, target_date: Optional[date] = None) -> str:
        """
        Get Sherook (sunrise) time.
        
        Args:
            target_date: Date for which to calculate prayer time (default: today)
            
        Returns:
            Sherook time as string
        """
        pt = self._get_prayer_object(target_date)
        return pt.sherook_time()
    
    def get_dohr_time(self, target_date: Optional[date] = None) -> str:
        """
        Get Dohr (noon) prayer time.
        
        Args:
            target_date: Date for which to calculate prayer time (default: today)
            
        Returns:
            Dohr prayer time as string
        """
        pt = self._get_prayer_object(target_date)
        return pt.dohr_time()
    
    def get_asr_time(self, target_date: Optional[date] = None) -> str:
        """
        Get Asr (afternoon) prayer time.
        
        Args:
            target_date: Date for which to calculate prayer time (default: today)
            
        Returns:
            Asr prayer time as string
        """
        pt = self._get_prayer_object(target_date)
        return pt.asr_time()
    
    def get_maghreb_time(self, target_date: Optional[date] = None) -> str:
        """
        Get Maghreb (sunset) prayer time.
        
        Args:
            target_date: Date for which to calculate prayer time (default: today)
            
        Returns:
            Maghreb prayer time as string
        """
        pt = self._get_prayer_object(target_date)
        return pt.maghreb_time()
    
    def get_ishaa_time(self, target_date: Optional[date] = None) -> str:
        """
        Get Ishaa (night) prayer time.
        
        Args:
            target_date: Date for which to calculate prayer time (default: today)
            
        Returns:
            Ishaa prayer time as string
        """
        pt = self._get_prayer_object(target_date)
        return pt.ishaa_time()
    
    def get_midnight_time(self, target_date: Optional[date] = None) -> str:
        """
        Get Islamic midnight time.
        
        Args:
            target_date: Date for which to calculate prayer time (default: today)
            
        Returns:
            Midnight time as string
        """
        pt = self._get_prayer_object(target_date)
        return pt.midnight()
    
    def get_second_third_of_night(self, target_date: Optional[date] = None) -> str:
        """
        Get second third of night time.
        
        Args:
            target_date: Date for which to calculate prayer time (default: today)
            
        Returns:
            Second third of night time as string
        """
        pt = self._get_prayer_object(target_date)
        return pt.second_third_of_night()
    
    def get_last_third_of_night(self, target_date: Optional[date] = None) -> str:
        """
        Get last third of night time (Qiyam time).
        
        Args:
            target_date: Date for which to calculate prayer time (default: today)
            
        Returns:
            Last third of night time as string
        """
        pt = self._get_prayer_object(target_date)
        return pt.last_third_of_night()
    
    def get_qiblah_direction(self) -> str:
        """
        Get Qiblah direction from north.
        
        Returns:
            Qiblah direction as string
        """
        return Qiblah(self.pconf).sixty()
    
    def get_all_prayer_times(self, target_date: Optional[date] = None) -> Dict[str, str]:
        """
        Get all prayer times for the specified date.
        
        Args:
            target_date: Date for which to calculate prayer times (default: today)
            
        Returns:
            Dictionary containing all prayer times
        """
        pt = self._get_prayer_object(target_date)
        
        return {
            'fajr': pt.fajr_time(),
            'sherook': pt.sherook_time(),
            'dohr': pt.dohr_time(),
            'asr': pt.asr_time(),
            'maghreb': pt.maghreb_time(),
            'ishaa': pt.ishaa_time(),
            'midnight': pt.midnight(),
            'second_third_of_night': pt.second_third_of_night(),
            'last_third_of_night': pt.last_third_of_night(),
            'qiblah_direction': self.get_qiblah_direction()
        }
    
    def get_hijri_date(self, target_date: Optional[date] = None) -> HijriDate:
        """
        Get Hijri date for the specified date.
        
        Args:
            target_date: Date to convert to Hijri (default: today)
            
        Returns:
            HijriDate object
        """
        if target_date is None:
            return HijriDate.today()
        else:
            # Convert Gregorian date to Hijri
            return HijriDate.from_gregorian(target_date.year, target_date.month, target_date.day)
    
    def get_location_info(self) -> Dict[str, Any]:
        """
        Get location and configuration information.
        
        Returns:
            Dictionary containing location and calculation method information
        """
        ar = ("Shafii, Maliki, Hambali", "Hanafi")
        
        def tz(t):
            if t < 0:
                return "GMT" + str(t)
            else:
                return "GMT+" + str(t)
        
        return {
            'longitude': self.longitude,
            'latitude': self.latitude,
            'timezone': tz(self.timezone),
            'fajr_isha_method': LIST_FAJR_ISHA_METHODS[self.fajr_isha_method - 1].organizations[0],
            'asr_madhab': ar[self.asr_fiqh - 1]
        }


# Convenience functions using default Bahrain configuration
def get_fajr_time(target_date: Optional[date] = None) -> str:
    """Get Fajr time for Bahrain location."""
    api = PrayerAPI()
    return api.get_fajr_time(target_date)

def get_sherook_time(target_date: Optional[date] = None) -> str:
    """Get Sherook time for Bahrain location."""
    api = PrayerAPI()
    return api.get_sherook_time(target_date)

def get_dohr_time(target_date: Optional[date] = None) -> str:
    """Get Dohr time for Bahrain location."""
    api = PrayerAPI()
    return api.get_dohr_time(target_date)

def get_asr_time(target_date: Optional[date] = None) -> str:
    """Get Asr time for Bahrain location."""
    api = PrayerAPI()
    return api.get_asr_time(target_date)

def get_maghreb_time(target_date: Optional[date] = None) -> str:
    """Get Maghreb time for Bahrain location."""
    api = PrayerAPI()
    return api.get_maghreb_time(target_date)

def get_ishaa_time(target_date: Optional[date] = None) -> str:
    """Get Ishaa time for Bahrain location."""
    api = PrayerAPI()
    return api.get_ishaa_time(target_date)

def get_all_prayer_times(target_date: Optional[date] = None) -> Dict[str, str]:
    """Get all prayer times for Bahrain location."""
    api = PrayerAPI()
    return api.get_all_prayer_times(target_date)


# Example usage
if __name__ == "__main__":
    # Using the class
    prayer_api = PrayerAPI()
    
    print("Individual Prayer Times:")
    print(f"Fajr: {prayer_api.get_fajr_time()}")
    print(f"Sherook: {prayer_api.get_sherook_time()}")
    print(f"Dohr: {prayer_api.get_dohr_time()}")
    print(f"Asr: {prayer_api.get_asr_time()}")
    print(f"Maghreb: {prayer_api.get_maghreb_time()}")
    print(f"Ishaa: {prayer_api.get_ishaa_time()}")
    
    print("\nAll Prayer Times:")
    all_times = prayer_api.get_all_prayer_times()
    for prayer, time in all_times.items():
        print(f"{prayer.capitalize()}: {time}")
    
    print("\nLocation Info:")
    location_info = prayer_api.get_location_info()
    for key, value in location_info.items():
        print(f"{key.replace('_', ' ').title()}: {value}")
    
    # Using convenience functions
    print(f"\nUsing convenience functions:")
    print(f"Today's Fajr: {get_fajr_time()}")
    print(f"Today's Dohr: {get_dohr_time()}")