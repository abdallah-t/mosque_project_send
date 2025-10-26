import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Settings, Cpu, Clock, LogOut, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

const menuItems = [
  { icon: Home, label: 'Dashboard', path: '/dashboard' },
  { icon: Clock, label: 'Prayer Clock', path: '/clock' },
  { icon: Zap, label: 'Prayer Automation', path: '/prayer-automation' },
  { icon: Cpu, label: 'ESP32 Setup', path: '/esp32-setup' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('authenticated');
    toast.success('Logged out successfully');
    navigate('/');
  };

  return (
    <div className="flex flex-col h-full py-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Smart Mosque
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Control Panel</p>
      </div>

      <Separator className="mb-6" />

      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Button
              key={item.path}
              variant={isActive ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => navigate(item.path)}
            >
              <Icon className="mr-3 h-4 w-4" />
              {item.label}
            </Button>
          );
        })}
      </nav>

      <Separator className="my-6" />

      <Button variant="outline" className="w-full justify-start" onClick={handleLogout}>
        <LogOut className="mr-3 h-4 w-4" />
        Logout
      </Button>
    </div>
  );
};

export default Sidebar;
