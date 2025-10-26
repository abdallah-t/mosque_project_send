import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, RefreshCw, Wifi, Power, Edit2, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useMqtt } from '@/contexts/MqttContext';

interface ESP32Device {
  id: string;
  macAddress: string;
  name: string;
  topic: string;
  ipAddress: string;
  online: boolean;
  rssi?: number;
  lastSeen?: string;
  relays?: { [key: string]: boolean };
  relayNames?: { [key: string]: string }; // Custom names for relays
}

interface DeviceCustomizations {
  [macAddress: string]: {
    deviceName?: string;
    relayNames?: { [key: string]: string };
  };
}

const STORAGE_KEY = 'mosque_esp32_devices';
const CUSTOMIZATIONS_KEY = 'mosque_device_customizations';

const loadCustomizations = (): DeviceCustomizations => {
  try {
    const stored = localStorage.getItem(CUSTOMIZATIONS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading customizations:', error);
  }
  return {};
};

const saveCustomizations = (customizations: DeviceCustomizations) => {
  try {
    localStorage.setItem(CUSTOMIZATIONS_KEY, JSON.stringify(customizations));
  } catch (error) {
    console.error('Error saving customizations:', error);
  }
};

const loadDevices = (): ESP32Device[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading devices from storage:', error);
  }
  // Return default devices if nothing in storage
  return [
    { id: 'esp32_01', macAddress: 'esp32_01', name: 'ESP32 Relay Controller', topic: 'mosque/devices/esp32_01', ipAddress: 'auto', online: false },
  ];
};

const saveDevices = (devices: ESP32Device[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(devices));
    // Dispatch custom event to notify other components in the same window
    window.dispatchEvent(new CustomEvent('esp32DevicesChanged'));
  } catch (error) {
    console.error('Error saving devices to storage:', error);
    toast.error('Failed to save devices');
  }
};

const ESP32Setup = () => {
  const navigate = useNavigate();
  const { isConnected, devices: contextDevices, toggleRelay } = useMqtt();
  const [devices, setDevices] = useState<ESP32Device[]>(contextDevices);
  const [isLiveSyncing, setIsLiveSyncing] = useState(false);
  const [customizations, setCustomizations] = useState<DeviceCustomizations>(loadCustomizations());

  const [showAddForm, setShowAddForm] = useState(false);
  const [newDevice, setNewDevice] = useState({
    name: '',
    topic: '',
    ipAddress: '',
  });

  // Editing state
  const [editingDevice, setEditingDevice] = useState<string | null>(null);
  const [editingRelay, setEditingRelay] = useState<{ deviceId: string; relayKey: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  // Sync devices from context
  useEffect(() => {
    setDevices(contextDevices);
    if (contextDevices.length > 0) {
      setIsLiveSyncing(true);
      setTimeout(() => setIsLiveSyncing(false), 1000);
    }
  }, [contextDevices]);

  // Listen for device updates from MQTT (via MqttContext)
  useEffect(() => {
    const handleDevicesChanged = () => {
      const updatedDevices = loadDevices();
      setDevices(updatedDevices);
      setIsLiveSyncing(true);
      console.log('ESP32Setup: Devices updated from MQTT', updatedDevices);

      // Reset syncing indicator after animation
      setTimeout(() => setIsLiveSyncing(false), 1000);
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        handleDevicesChanged();
      }
    };

    // Listen for custom event from MqttContext
    window.addEventListener('esp32DevicesChanged', handleDevicesChanged);

    // Listen for storage events from other tabs/windows
    window.addEventListener('storage', handleStorageChange);

    // Poll for updates every 5 seconds as a fallback
    const interval = setInterval(() => {
      const currentDevices = loadDevices();
      // Only update if there are actual changes
      if (JSON.stringify(currentDevices) !== JSON.stringify(devices)) {
        setDevices(currentDevices);
      }
    }, 5000);

    return () => {
      window.removeEventListener('esp32DevicesChanged', handleDevicesChanged);
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [devices]);

  // Save devices whenever they change (but only if user made the change)
  const updateDevices = (newDevices: ESP32Device[]) => {
    setDevices(newDevices);
    saveDevices(newDevices);
  };

  const handleAddDevice = () => {
    if (!newDevice.name || !newDevice.topic || !newDevice.ipAddress) {
      toast.error('Please fill all fields');
      return;
    }

    const device: ESP32Device = {
      id: Date.now().toString(),
      macAddress: newDevice.topic, // Use topic as MAC for manually added devices
      ...newDevice,
      online: false,
    };

    updateDevices([...devices, device]);
    setNewDevice({ name: '', topic: '', ipAddress: '' });
    setShowAddForm(false);
    toast.success('Device added successfully');
  };

  const handleRemoveDevice = (id: string) => {
    updateDevices(devices.filter(d => d.id !== id));
    toast.success('Device removed');
  };

  const handleReconnect = (id: string) => {
    toast.info('Refreshing device status...');
    // Just trigger a refresh from localStorage - MqttContext will update it
    const refreshedDevices = loadDevices();
    setDevices(refreshedDevices);

    const device = refreshedDevices.find(d => d.id === id);
    if (device) {
      toast.success(`${device.name}: ${device.online ? 'Online' : 'Offline'}`);
    }
  };

  // Device name editing functions
  const startEditingDevice = (deviceId: string, currentName: string) => {
    setEditingDevice(deviceId);
    setEditValue(currentName);
  };

  const saveDeviceName = (deviceMac: string) => {
    if (!editValue.trim()) {
      toast.error('Device name cannot be empty');
      return;
    }

    const newCustomizations = {
      ...customizations,
      [deviceMac]: {
        ...customizations[deviceMac],
        deviceName: editValue.trim(),
      },
    };

    setCustomizations(newCustomizations);
    saveCustomizations(newCustomizations);
    setEditingDevice(null);
    setEditValue('');
    toast.success('Device name updated');
  };

  const cancelEditingDevice = () => {
    setEditingDevice(null);
    setEditValue('');
  };

  // Relay name editing functions
  const startEditingRelay = (deviceId: string, relayKey: string, currentName: string) => {
    setEditingRelay({ deviceId, relayKey });
    setEditValue(currentName);
  };

  const saveRelayName = (deviceMac: string, relayKey: string) => {
    if (!editValue.trim()) {
      toast.error('Relay name cannot be empty');
      return;
    }

    const newCustomizations = {
      ...customizations,
      [deviceMac]: {
        ...customizations[deviceMac],
        relayNames: {
          ...customizations[deviceMac]?.relayNames,
          [relayKey]: editValue.trim(),
        },
      },
    };

    setCustomizations(newCustomizations);
    saveCustomizations(newCustomizations);
    setEditingRelay(null);
    setEditValue('');
    toast.success('Relay name updated');
  };

  const cancelEditingRelay = () => {
    setEditingRelay(null);
    setEditValue('');
  };

  // Helper function to get display name
  const getDeviceName = (device: ESP32Device): string => {
    return customizations[device.macAddress]?.deviceName || device.name;
  };

  const getRelayName = (device: ESP32Device, relayKey: string): string => {
    return customizations[device.macAddress]?.relayNames?.[relayKey] || relayKey;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5 p-6">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">ESP32 Setup</h1>
                {isLiveSyncing && (
                  <Badge variant="outline" className="animate-pulse">
                    <Wifi className="mr-1 h-3 w-3" />
                    Syncing
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground">Manage your ESP32 devices • Auto-sync enabled</p>
            </div>
          </div>
          <Button onClick={() => setShowAddForm(!showAddForm)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Device
          </Button>
        </div>

        {showAddForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Add New ESP32 Device</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Device Name</Label>
                  <Input
                    placeholder="e.g., Zone Controller 1"
                    value={newDevice.name}
                    onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>MQTT Topic</Label>
                  <Input
                    placeholder="e.g., mosque/lights/zone1"
                    value={newDevice.topic}
                    onChange={(e) => setNewDevice({ ...newDevice, topic: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>IP Address</Label>
                  <Input
                    placeholder="e.g., 192.168.1.101"
                    value={newDevice.ipAddress}
                    onChange={(e) => setNewDevice({ ...newDevice, ipAddress: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddDevice}>Add Device</Button>
                <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map((device) => (
            <Card key={device.id} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {/* Editable Device Name */}
                    {editingDevice === device.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-8 text-lg font-semibold"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveDeviceName(device.macAddress);
                            if (e.key === 'Escape') cancelEditingDevice();
                          }}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => saveDeviceName(device.macAddress)}
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={cancelEditingDevice}
                        >
                          <X className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group">
                        <CardTitle className="text-lg truncate">
                          {getDeviceName(device)}
                        </CardTitle>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => startEditingDevice(device.id, getDeviceName(device))}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    <CardDescription className="mt-1">{device.ipAddress}</CardDescription>
                    <CardDescription className="mt-1 font-mono text-xs truncate">
                      {device.macAddress}
                    </CardDescription>
                  </div>
                  <Badge variant={device.online ? 'default' : 'destructive'} className="shrink-0">
                    {device.online ? 'Online' : 'Offline'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Device Topic</p>
                  <p className="text-sm font-mono bg-muted px-2 py-1 rounded truncate">{device.topic}</p>
                </div>

                {/* Relay Controls with Editable Names */}
                {device.relays && Object.keys(device.relays).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">Relays</p>
                    <div className="space-y-2">
                      {Object.entries(device.relays).map(([relayKey, relayState]) => (
                        <div key={relayKey} className="flex items-center gap-2">
                          {/* Editable Relay Name */}
                          {editingRelay?.deviceId === device.id && editingRelay?.relayKey === relayKey ? (
                            <div className="flex-1 flex items-center gap-1">
                              <Input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="h-8 text-sm"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveRelayName(device.macAddress, relayKey);
                                  if (e.key === 'Escape') cancelEditingRelay();
                                }}
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={() => saveRelayName(device.macAddress, relayKey)}
                              >
                                <Check className="h-3 w-3 text-green-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={cancelEditingRelay}
                              >
                                <X className="h-3 w-3 text-red-600" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant={relayState ? 'default' : 'outline'}
                                className="flex-1"
                                onClick={() => toggleRelay(device.macAddress, relayKey)}
                                disabled={!isConnected || !device.online}
                              >
                                <Power className="mr-1 h-3 w-3" />
                                <span className="truncate">{getRelayName(device, relayKey)}</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={() => startEditingRelay(device.id, relayKey, getRelayName(device, relayKey))}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {device.rssi && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Signal Strength</p>
                    <p className="text-sm font-mono bg-muted px-2 py-1 rounded">{device.rssi} dBm</p>
                  </div>
                )}
                {device.lastSeen && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Last Seen</p>
                    <p className="text-sm bg-muted px-2 py-1 rounded">{device.lastSeen}</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleReconnect(device.id)}
                  >
                    <RefreshCw className="mr-2 h-3 w-3" />
                    Refresh
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRemoveDevice(device.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ESP32Setup;
