import { useState, useEffect } from 'react';

const CurrentTimeDisplay = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours();
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();
  const period = hours >= 12 ? 'مساء' : 'صباحا';

  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, '0');
  const displaySeconds = seconds.toString().padStart(2, '0');

  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-4">
        <div className="text-6xl font-bold tracking-tight text-foreground">
          {displayHours}:{displayMinutes}
        </div>
        <div className="flex flex-col gap-1">
          <div className="text-3xl font-bold text-accent">{displaySeconds}</div>
          <div className="text-lg font-semibold text-muted-foreground">{period}</div>
        </div>
      </div>
    </div>
  );
};

export default CurrentTimeDisplay;
