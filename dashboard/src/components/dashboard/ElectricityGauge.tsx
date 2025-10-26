import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap } from 'lucide-react';
import { useMqtt } from '@/contexts/MqttContext';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const ElectricityGauge = () => {
  const { electricityUsage } = useMqtt();

  const data = [
    { name: 'Used', value: electricityUsage },
    { name: 'Available', value: 100 - electricityUsage },
  ];

  const COLORS = ['hsl(var(--accent))', 'hsl(var(--muted))'];

  const getUsageColor = () => {
    if (electricityUsage > 80) return 'text-destructive';
    if (electricityUsage > 60) return 'text-accent';
    return 'text-success';
  };

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-accent" />
          Electricity Usage
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <div className="relative w-48 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                startAngle={180}
                endAngle={0}
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className={`text-4xl font-bold ${getUsageColor()}`}>
              {electricityUsage}%
            </div>
            <div className="text-xs text-muted-foreground">Current Load</div>
          </div>
        </div>
        <div className="mt-6 w-full space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Status:</span>
            <span className={`font-semibold ${getUsageColor()}`}>
              {electricityUsage > 80 ? 'High' : electricityUsage > 60 ? 'Moderate' : 'Normal'}
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                electricityUsage > 80 ? 'bg-destructive' : electricityUsage > 60 ? 'bg-accent' : 'bg-success'
              }`}
              style={{ width: `${electricityUsage}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ElectricityGauge;
