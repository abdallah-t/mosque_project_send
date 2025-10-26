import { useState, useEffect } from 'react';

interface NextPrayerCountdownProps {
  nextPrayerTime: string;
}

const NextPrayerCountdown = ({ nextPrayerTime }: NextPrayerCountdownProps) => {
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateCountdown = () => {
      const now = new Date();
      const [hours, minutes] = nextPrayerTime.split(':').map(Number);

      const nextPrayer = new Date(now);
      nextPrayer.setHours(hours, minutes, 0, 0);

      if (nextPrayer < now) {
        nextPrayer.setDate(nextPrayer.getDate() + 1);
      }

      const diff = nextPrayer.getTime() - now.getTime();
      const hoursLeft = Math.floor(diff / (1000 * 60 * 60));
      const minutesLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secondsLeft = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown({ hours: hoursLeft, minutes: minutesLeft, seconds: secondsLeft });
    };

    calculateCountdown();
    const timer = setInterval(calculateCountdown, 1000);

    return () => clearInterval(timer);
  }, [nextPrayerTime]);

  return (
    <div className="bg-card border border-border rounded-xl shadow-md p-6">
      <div className="text-center space-y-3">
        <div className="text-lg font-bold text-primary">الصلاة القادمة</div>
        <div className="text-sm text-muted-foreground">Next Prayer</div>
        <div className="text-4xl font-bold text-foreground">
          {countdown.hours}:{countdown.minutes.toString().padStart(2, '0')}
          <span className="text-2xl text-accent">:{countdown.seconds.toString().padStart(2, '0')}</span>
        </div>
      </div>
    </div>
  );
};

export default NextPrayerCountdown;
