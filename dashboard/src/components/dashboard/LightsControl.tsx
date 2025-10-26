import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Lightbulb } from 'lucide-react';
import { useMqtt } from '@/contexts/MqttContext';

const LightsControl = () => {
  const { lightZones, lightZoneNames, toggleLight } = useMqtt();

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-accent" />
          Lights Control
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Object.entries(lightZones).map(([zone, isOn]) => (
            <div
              key={zone}
              className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-card to-muted/30 border border-border/50 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${isOn
                    ? 'bg-accent shadow-glow animate-pulse'
                    : 'bg-muted-foreground/30'
                    }`}
                />
                <Label
                  htmlFor={zone}
                  className="text-base font-medium cursor-pointer"
                >
                  {lightZoneNames[zone] || zone}
                </Label>
              </div>
              <Switch
                id={zone}
                checked={isOn}
                onCheckedChange={() => toggleLight(zone)}
                className="data-[state=checked]:bg-primary"
              />
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Active Zones:</span>
            <span className="font-bold text-lg">
              {Object.values(lightZones).filter(Boolean).length} / {Object.keys(lightZones).length}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LightsControl;
