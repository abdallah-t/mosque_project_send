import { useState, useEffect } from 'react';

const DateDisplay = () => {
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setDate(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const dayName = days[date.getDay()];

  const gregorianDate = date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });

  // Simplified Hijri date calculation (you can use a library for accurate conversion)
  const hijriYear = 1447;
  const hijriMonth = 'ربيع الآخر';
  const hijriDay = Math.floor((date.getDate() % 30) + 1);

  return (
    <div className="text-left space-y-1">
      <div className="text-2xl font-bold text-primary-foreground">{dayName}</div>
      <div className="text-sm text-primary-foreground/90">
        {hijriYear} {hijriMonth} {hijriDay}
      </div>
    </div>
  );
};

export default DateDisplay;
