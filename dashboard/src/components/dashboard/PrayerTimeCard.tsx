import { convertTo12Hour } from '@/lib/prayerTimesStorage';

interface PrayerTimeCardProps {
  name: string;
  nameArabic: string;
  time: string;
  isNext?: boolean;
}

const PrayerTimeCard = ({ name, nameArabic, time, isNext }: PrayerTimeCardProps) => {
  return (
    <div
      className={`
        relative rounded-xl overflow-hidden
        transition-all duration-300
        ${isNext
          ? 'bg-gradient-to-br from-accent/20 to-accent/10 border-2 border-accent shadow-lg scale-105'
          : 'bg-card border border-border shadow-md hover:shadow-lg hover:scale-105'
        }
      `}
    >
      {isNext && (
        <div className="absolute top-2 right-2 bg-accent text-accent-foreground px-3 py-1 rounded-full text-xs font-bold shadow-md">
          Next
        </div>
      )}
      <div className="text-center p-4 space-y-2">
        <div className={`text-xl font-bold ${isNext ? 'text-accent' : 'text-primary'}`}>
          {nameArabic}
        </div>
        <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{name}</div>
        <div className={`text-2xl font-bold mt-2 ${isNext ? 'text-accent' : 'text-foreground'}`}>
          {convertTo12Hour(time)}
        </div>
      </div>
    </div>
  );
};

export default PrayerTimeCard;
