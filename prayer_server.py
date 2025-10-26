from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import date, datetime
import json
import os

# Import pyIslam library for accurate prayer time calculations
from pyIslam.praytimes import PrayerConf, Prayer, LIST_FAJR_ISHA_METHODS
from pyIslam.hijri import HijriDate
from pyIslam.qiblah import Qiblah

class PrayerAPI:
    """
    Prayer API using pyIslam library for accurate calculations.
    Configuration:
    - Timezone: GMT+3
    - Fajr/Isha Method: 4 (Umm Al-Qura University, Makkah)
    - Asr Madhab: 1 (Shafii, Maliki, Hambali)
    """
    
    def __init__(self, longitude=50.20833, latitude=26.27944):
        self.longitude = longitude
        self.latitude = latitude
        self.timezone = 3  # GMT+3
        self.fajr_isha_method = 4  # Umm Al-Qura University, Makkah
        self.asr_fiqh = 1  # Shafii, Maliki, Hambali
        
        # Create prayer configuration
        self.pconf = PrayerConf(
            self.longitude,
            self.latitude,
            self.timezone,
            self.fajr_isha_method,
            self.asr_fiqh
        )
        
        # Create prayer times object for today
        self.pt = Prayer(self.pconf, date.today())
        
        # Create Qiblah object
        self.qiblah = Qiblah(self.pconf)
    
    def get_all_prayer_times(self):
        """Get all prayer times for today."""
        return {
            'fajr': str(self.pt.fajr_time()),
            'sherook': str(self.pt.sherook_time()),
            'dohr': str(self.pt.dohr_time()),
            'asr': str(self.pt.asr_time()),
            'maghreb': str(self.pt.maghreb_time()),
            'ishaa': str(self.pt.ishaa_time()),
            'midnight': str(self.pt.midnight()),
            'second_third_of_night': str(self.pt.second_third_of_night()),
            'last_third_of_night': str(self.pt.last_third_of_night()),
            'qiblah_direction': self.qiblah.sixty()
        }
    
    def get_fajr_time(self):
        return str(self.pt.fajr_time())
    
    def get_sherook_time(self):
        return str(self.pt.sherook_time())
    
    def get_dohr_time(self):
        return str(self.pt.dohr_time())
    
    def get_asr_time(self):
        return str(self.pt.asr_time())
    
    def get_maghreb_time(self):
        return str(self.pt.maghreb_time())
    
    def get_ishaa_time(self):
        return str(self.pt.ishaa_time())
    
    def get_midnight_time(self):
        return str(self.pt.midnight())
    
    def get_second_third_of_night(self):
        return str(self.pt.second_third_of_night())
    
    def get_last_third_of_night(self):
        return str(self.pt.last_third_of_night())
    
    def get_qiblah_direction(self):
        return self.qiblah.sixty()
    
    def get_hijri_date(self):
        """Get accurate Hijri date."""
        hijri = HijriDate.today()
        return hijri.format(2)  # Format: "Day MonthName Year"
    
    def get_location_info(self):
        """Get location and calculation method information."""
        method_info = LIST_FAJR_ISHA_METHODS[self.fajr_isha_method - 1]
        asr_madhab_names = ("Shafii, Maliki, Hambali", "Hanafi")
        
        return {
            'longitude': self.longitude,
            'latitude': self.latitude,
            'timezone': f'GMT+{self.timezone}',
            'fajr_isha_method': method_info.organizations[0],
            'asr_madhab': asr_madhab_names[self.asr_fiqh - 1]
        }

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Load locations from JSON file
def load_locations():
    try:
        locations_file = os.path.join(os.path.dirname(__file__), 'locations.json')
        with open(locations_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading locations: {e}")
        return []

LOCATIONS = load_locations()

# Initialize prayer API with Bahrain configuration (default)
prayer_api = PrayerAPI(longitude=50.20833, latitude=26.27944)

@app.route('/api/locations', methods=['GET'])
def get_locations():
    """Get all available locations."""
    return jsonify({
        'locations': LOCATIONS,
        'count': len(LOCATIONS)
    })

@app.route('/api/prayer-times', methods=['GET'])
def get_prayer_times():
    """Get all prayer times for today. Supports ?city=CityName or ?latitude=X&longitude=Y parameters."""
    try:
        # Get location parameters from query string
        city = request.args.get('city')
        latitude = request.args.get('latitude', type=float)
        longitude = request.args.get('longitude', type=float)
        
        # Determine location to use
        location_name = 'MANAMA, BH'  # Default
        lat = 26.27944  # Default Bahrain
        lon = 50.20833
        
        if city:
            # Find city in locations
            location = next((loc for loc in LOCATIONS if loc['city'].lower() == city.lower()), None)
            if location:
                # Handle nested coordinates structure
                if 'coordinates' in location:
                    lat = location['coordinates']['latitude']
                    lon = location['coordinates']['longitude']
                else:
                    lat = location['latitude']
                    lon = location['longitude']
                location_name = f"{location['city'].upper()}, SA"
            else:
                return jsonify({'error': f'City "{city}" not found in locations'}), 404
        elif latitude is not None and longitude is not None:
            # Use provided coordinates
            lat = latitude
            lon = longitude
            location_name = f"LAT: {lat:.4f}, LON: {lon:.4f}"
        
        # Create prayer API instance for this location
        location_prayer_api = PrayerAPI(longitude=lon, latitude=lat)
        
        # Get all prayer times
        times = location_prayer_api.get_all_prayer_times()
        
        # Get location info
        location_info = location_prayer_api.get_location_info()
        
        # Get Hijri date
        hijri_date = location_prayer_api.get_hijri_date()
        
        # Format response to match frontend expectations
        response = {
            'prayerTimes': [
                {'name': 'Fajr', 'nameArabic': 'الفجر', 'time': times['fajr']},
                {'name': 'Sunrise', 'nameArabic': 'الشروق', 'time': times['sherook']},
                {'name': 'Dhuhr', 'nameArabic': 'الظهر', 'time': times['dohr']},
                {'name': 'Asr', 'nameArabic': 'العصر', 'time': times['asr']},
                {'name': 'Maghrib', 'nameArabic': 'المغرب', 'time': times['maghreb']},
                {'name': 'Isha', 'nameArabic': 'العشاء', 'time': times['ishaa']},
            ],
            'location': location_name,
            'hijriDate': hijri_date,
            'gregorianDate': date.today().strftime('%Y-%m-%d'),
            'additionalTimes': {
                'midnight': times['midnight'],
                'secondThirdOfNight': times['second_third_of_night'],
                'lastThirdOfNight': times['last_third_of_night'],
                'qiblahDirection': times['qiblah_direction']
            },
            'locationInfo': location_info
        }
        
        return jsonify(response)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/prayer-times/<prayer_name>', methods=['GET'])
def get_specific_prayer_time(prayer_name):
    """Get specific prayer time."""
    try:
        prayer_methods = {
            'fajr': prayer_api.get_fajr_time,
            'sherook': prayer_api.get_sherook_time,
            'sunrise': prayer_api.get_sherook_time,  # alias for sherook
            'dohr': prayer_api.get_dohr_time,
            'dhuhr': prayer_api.get_dohr_time,  # alias for dohr
            'asr': prayer_api.get_asr_time,
            'maghreb': prayer_api.get_maghreb_time,
            'maghrib': prayer_api.get_maghreb_time,  # alias for maghreb
            'ishaa': prayer_api.get_ishaa_time,
            'isha': prayer_api.get_ishaa_time,  # alias for ishaa
        }
        
        prayer_name_lower = prayer_name.lower()
        
        if prayer_name_lower not in prayer_methods:
            return jsonify({'error': 'Invalid prayer name'}), 400
        
        time = prayer_methods[prayer_name_lower]()
        
        return jsonify({
            'prayer': prayer_name,
            'time': time,
            'date': date.today().strftime('%Y-%m-%d')
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/location-info', methods=['GET'])
def get_location_info():
    """Get location and calculation method information."""
    try:
        location_info = prayer_api.get_location_info()
        return jsonify(location_info)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/qiblah', methods=['GET'])
def get_qiblah_direction():
    """Get Qiblah direction."""
    try:
        direction = prayer_api.get_qiblah_direction()
        return jsonify({'qiblahDirection': direction})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({'status': 'healthy', 'message': 'Prayer API server is running'})

if __name__ == '__main__':
    print("Starting Prayer API Server...")
    print("Available endpoints:")
    print("- GET /api/locations - Get all available locations")
    print("- GET /api/prayer-times - Get all prayer times (optional: ?city=CityName or ?latitude=X&longitude=Y)")
    print("- GET /api/prayer-times/<prayer_name> - Get specific prayer time")
    print("- GET /api/location-info - Get location information")
    print("- GET /api/qiblah - Get Qiblah direction")
    print("- GET /api/health - Health check")
    print(f"\nLoaded {len(LOCATIONS)} locations from locations.json")
    
    app.run(debug=True, host='0.0.0.0', port=5001)