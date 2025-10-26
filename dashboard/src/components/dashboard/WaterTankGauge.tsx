import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Droplets } from 'lucide-react';
import { useMqtt } from '@/contexts/MqttContext';

const WaterTankGauge = () => {
  const { waterLevel } = useMqtt();

  const getWaterColor = () => {
    if (waterLevel < 30) return 'from-destructive to-destructive/80';
    if (waterLevel < 60) return 'from-accent to-accent/80';
    return 'from-secondary to-secondary/80';
  };

  const getTextColor = () => {
    if (waterLevel < 30) return 'text-destructive';
    if (waterLevel < 60) return 'text-accent';
    return 'text-secondary';
  };

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Droplets className="h-5 w-5 text-secondary" />
          Water Tank
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <div className="relative w-32 h-56 border-4 border-border rounded-2xl overflow-hidden bg-muted/30">
          {/* Water fill */}
          <div
            className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t ${getWaterColor()} transition-all duration-700 ease-out`}
            style={{ height: `${waterLevel}%` }}
          >
            {/* Wave effect */}
            <div className="absolute top-0 left-0 right-0 h-3 bg-white/20 animate-pulse" />
          </div>
          
          {/* Percentage overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`text-3xl font-bold ${getTextColor()} drop-shadow-lg`}>
              {waterLevel}%
            </div>
          </div>

          {/* Level markers */}
          <div className="absolute inset-0 flex flex-col justify-between p-2">
            {[100, 75, 50, 25, 0].map((mark) => (
              <div key={mark} className="flex items-center">
                <div className="w-full border-t border-border/50" />
                <span className="ml-2 text-xs text-muted-foreground">{mark}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 w-full space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Status:</span>
            <span className={`font-semibold ${getTextColor()}`}>
              {waterLevel < 30 ? 'Low' : waterLevel < 60 ? 'Moderate' : 'Good'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Capacity:</span>
            <span className="font-medium">{Math.round(waterLevel * 50)} / 5000 L</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WaterTankGauge;
