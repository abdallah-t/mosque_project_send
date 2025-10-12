from datetime import date

from pyIslam.praytimes import (
    PrayerConf,
    Prayer,
    LIST_FAJR_ISHA_METHODS,
)
from pyIslam.hijri import HijriDate
from pyIslam.qiblah import Qiblah


print(
    """Usage example of pyIslam
-------------------------------------"""
)

ar = ("Shafii, Maliki, Hambali", "Hanafi")

# Hardcoded values for Bahrain
longitude = 50.20833
latitude = 26.27944
timezone = 3
fajr_isha_method = 4
asr_fiqh = 1

pconf = PrayerConf(longitude, latitude, timezone, fajr_isha_method, asr_fiqh)

pt = Prayer(pconf, date.today())
hijri = HijriDate.today()

def tz(t):
    if t < 0:
        return "GMT" + str(t)
    else:
        return "GMT+" + str(t)


# Create human-readable prayer times string
prayer_times_str = f"""
Prayer Times for {hijri.format(2)} {hijri.to_gregorian()}
===============================================
Location: Longitude {longitude}, Latitude {latitude}
Timezone: {tz(timezone)}
Fajr and Ishaa reference: {LIST_FAJR_ISHA_METHODS[fajr_isha_method - 1].organizations[0]}
Asr madhab: {ar[asr_fiqh - 1]}

Prayer Times:
Fajr      : {pt.fajr_time()}
Sherook   : {pt.sherook_time()}
Dohr      : {pt.dohr_time()}
Asr       : {pt.asr_time()}
Maghreb   : {pt.maghreb_time()}
Ishaa     : {pt.ishaa_time()}

Night Prayer Times:
1st third : {pt.second_third_of_night()}
Midnight  : {pt.midnight()}
Qiyam     : {pt.last_third_of_night()}

Qiblah direction from the north: {Qiblah(pconf).sixty()}
"""

print(prayer_times_str)