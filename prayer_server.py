from flask import Flask, jsonify
from flask_cors import CORS
from datetime import date, datetime
import json

# Simple fallback prayer calculation or mock data
class SimplePrayerAPI:
    """
    Simplified Prayer API with mock data for Bahrain.
    This is a temporary implementation until pyIslam is properly installed.
    """
    
    def __init__(self):
        self.longitude = 50.20833
        self.latitude = 26.27944
        self.timezone = 3
        
        # Mock prayer times for Bahrain (approximate)
        self.mock_times = {
            'fajr': '04:18',
            'sherook': '05:37',
            'dohr': '11:26',
            'asr': '14:45',
            'maghreb': '17:14',
            'ishaa': '18:44',
            'midnight': '23:30',
            'second_third_of_night': '01:15',
            'last_third_of_night': '02:45',
            'qiblah_direction': '261.5°'
        }
    
    def get_fajr_time(self):
        return self.mock_times['fajr']
    
    def get_sherook_time(self):
        return self.mock_times['sherook']
    
    def get_dohr_time(self):
        return self.mock_times['dohr']
    
    def get_asr_time(self):
        return self.mock_times['asr']
    
    def get_maghreb_time(self):
        return self.mock_times['maghreb']
    
    def get_ishaa_time(self):
        return self.mock_times['ishaa']
    
    def get_midnight_time(self):
        return self.mock_times['midnight']
    
    def get_second_third_of_night(self):
        return self.mock_times['second_third_of_night']
    
    def get_last_third_of_night(self):
        return self.mock_times['last_third_of_night']
    
    def get_qiblah_direction(self):
        return self.mock_times['qiblah_direction']
    
    def get_all_prayer_times(self):
        return self.mock_times
    
    def get_hijri_date(self):
        # Simple Hijri date approximation
        gregorian_date = date.today()
        return f"{gregorian_date.day} Rabi' al-awwal 1447"  # Mock Hijri date
    
    def get_location_info(self):
        return {
            'longitude': self.longitude,
            'latitude': self.latitude,
            'timezone': 'GMT+3',
            'fajr_isha_method': 'Islamic Society of North America',
            'asr_madhab': 'Shafii, Maliki, Hambali'
        }

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize prayer API with Bahrain configuration
prayer_api = SimplePrayerAPI()

@app.route('/api/prayer-times', methods=['GET'])
def get_prayer_times():
    """Get all prayer times for today."""
    try:
        # Get all prayer times
        times = prayer_api.get_all_prayer_times()
        
        # Get location info
        location_info = prayer_api.get_location_info()
        
        # Get Hijri date
        hijri_date = prayer_api.get_hijri_date()
        
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
            'location': 'MANAMA, BH',  # Bahrain location
            'hijriDate': hijri_date.format(2),
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
    print("- GET /api/prayer-times - Get all prayer times")
    print("- GET /api/prayer-times/<prayer_name> - Get specific prayer time")
    print("- GET /api/location-info - Get location information")
    print("- GET /api/qiblah - Get Qiblah direction")
    print("- GET /api/health - Health check")
    
    app.run(debug=True, host='0.0.0.0', port=5001)