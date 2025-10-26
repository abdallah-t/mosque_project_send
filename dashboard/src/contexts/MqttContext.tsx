import React, { createContext, useContext, useEffect, useState } from 'react';
import { mqttService } from '@/lib/mqtt';

interface ESP32Device {
  id: string;
  macAddress: string;
  name: string;
  topic: string;
  ipAddress: string;
  online: boolean;
  rssi?: number;
  lastSeen?: string;
  relays?: { [key: string]: boolean }; // relay1, relay2, etc.
}

interface MqttContextType {
  isConnected: boolean;
  waterLevel: number;
  electricityUsage: number;
  lightZones: { [key: string]: boolean };
  lightZoneNames: { [key: string]: string };
  devices: ESP32Device[];
  toggleLight: (zone: string) => void;
  toggleRelay: (macAddress: string, relay: string) => void;
  updatePrayerTime: (prayer: string, minutes: number) => void;
}

const MqttContext = createContext<MqttContextType | undefined>(undefined);

export const useMqtt = () => {
  const context = useContext(MqttContext);
  if (!context) {
    throw new Error('useMqtt must be used within MqttProvider');
  }
  return context;
};

const STORAGE_KEY = 'mosque_esp32_devices';

// Helper function to extract zone name from topic
const extractZoneFromTopic = (topic: string): string => {
  // For ESP32 MAC-based topics like "30C6F74367F0/relay"
  if (topic.includes('/relay')) {
    return topic.split('/')[0]; // Return MAC address as zone identifier
  }
  // Extract zone from topics like "mosque/lights/downstairs" or "mosque/lights/zone1/set"
  const match = topic.match(/mosque\/lights\/([^/]+)/);
  return match ? match[1] : topic;
};

// Load zones from ESP32 devices in localStorage
const loadZonesFromDevices = (): { zones: { [key: string]: boolean }, names: { [key: string]: string } } => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const devices: ESP32Device[] = JSON.parse(stored);
      const zones: { [key: string]: boolean } = {};
      const names: { [key: string]: string } = {};

      devices.forEach(device => {
        // For ESP32 relay controllers, create zones for each relay
        if (device.topic.includes('/relay')) {
          const macAddress = device.id;
          // Create 4 relay zones (relay1, relay2, relay3, relay4)
          for (let i = 1; i <= 4; i++) {
            const zoneKey = `${macAddress}/relay${i}`;
            zones[zoneKey] = false;
            names[zoneKey] = `${device.name} - Relay ${i}`;
          }
        } else {
          // Legacy zone handling
          const zone = extractZoneFromTopic(device.topic);
          zones[zone] = false;
          names[zone] = device.name;
        }
      });

      return { zones, names };
    }
  } catch (error) {
    console.error('Error loading zones from devices:', error);
  }

  // Default zones if nothing in storage
  return {
    zones: {},
    names: {}
  };
};

export const MqttProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [waterLevel, setWaterLevel] = useState(75);
  const [electricityUsage, setElectricityUsage] = useState(65);
  const [devices, setDevices] = useState<ESP32Device[]>([]);

  const initialData = loadZonesFromDevices();
  const [lightZones, setLightZones] = useState(initialData.zones);
  const [lightZoneNames, setLightZoneNames] = useState(initialData.names);

  // Load devices from localStorage on mount
  useEffect(() => {
    const loadStoredDevices = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const loadedDevices: ESP32Device[] = JSON.parse(stored);
          // Mark all devices as offline initially - they'll update when they send status
          const devicesWithOfflineStatus = loadedDevices.map(d => ({
            ...d,
            online: false,
          }));
          setDevices(devicesWithOfflineStatus);
        }
      } catch (error) {
        console.error('Error loading devices:', error);
      }
    };
    loadStoredDevices();
  }, []);

  // Check device timeouts every 60 seconds
  useEffect(() => {
    const checkDeviceTimeouts = () => {
      const now = Date.now();
      const TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes (devices send status every 30s)

      setDevices(prevDevices => {
        const updatedDevices = prevDevices.map(device => {
          if (!device.lastSeen) return { ...device, online: false };

          const lastSeenTime = new Date(device.lastSeen).getTime();
          const isTimedOut = now - lastSeenTime > TIMEOUT_MS;

          if (device.online && isTimedOut) {
            console.log(`Device ${device.macAddress} marked offline (timeout)`);
            return { ...device, online: false };
          }

          return device;
        });

        // Save updated devices to localStorage if there were changes
        if (JSON.stringify(updatedDevices) !== JSON.stringify(prevDevices)) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedDevices));
          window.dispatchEvent(new CustomEvent('esp32DevicesChanged'));
        }

        return updatedDevices;
      });
    };

    // Check immediately on mount
    checkDeviceTimeouts();

    // Then check every 60 seconds
    const interval = setInterval(checkDeviceTimeouts, 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Listen for changes to ESP32 devices in localStorage
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        const newData = loadZonesFromDevices();
        setLightZones(prev => ({ ...prev, ...newData.zones }));
        setLightZoneNames(newData.names);
      }
    };

    const handleDevicesChanged = () => {
      const newData = loadZonesFromDevices();
      setLightZones(prev => ({ ...prev, ...newData.zones }));
      setLightZoneNames(newData.names);
    };

    // Listen for storage events from other tabs/windows
    window.addEventListener('storage', handleStorageChange);

    // Listen for custom event from same window
    window.addEventListener('esp32DevicesChanged', handleDevicesChanged);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('esp32DevicesChanged', handleDevicesChanged);
    };
  }, []);

  useEffect(() => {
    const brokerUrl = import.meta.env.VITE_MQTT_BROKER_URL || 'ws://localhost:8080';

    mqttService.connect({ brokerUrl })
      .then(() => {
        setIsConnected(true);

        // Subscribe to topics
        mqttService.subscribe('mosque/water/level', (message) => {
          setWaterLevel(parseInt(message));
        });

        mqttService.subscribe('mosque/electricity/usage', (message) => {
          setElectricityUsage(parseInt(message));
        });

        mqttService.subscribe('mosque/lights/status', (message) => {
          try {
            const status = JSON.parse(message);
            setLightZones(status);
          } catch (e) {
            console.error('Failed to parse light status:', e);
          }
        });

        // Auto-discover ESP32 devices
        mqttService.subscribe('+/device/status', (message, topic) => {
          try {
            const deviceInfo = JSON.parse(message);
            console.log('ESP32 Device discovered:', deviceInfo);

            // Extract MAC address from topic (e.g., "30C6F74367F0/device/status")
            const macAddress = topic.split('/')[0];

            // Handle offline status (from LWT)
            if (deviceInfo.status === 'offline') {
              console.log(`Device ${macAddress} went offline`);

              // Update devices state (preserve relay states even when offline)
              setDevices(prevDevices => {
                const updated = prevDevices.map(d =>
                  d.macAddress === macAddress
                    ? {
                      ...d,
                      online: false,
                      lastSeen: new Date().toISOString(),
                      // Update relays if provided in offline message
                      relays: deviceInfo.relays || d.relays
                    }
                    : d
                );
                // Save to localStorage
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
                window.dispatchEvent(new CustomEvent('esp32DevicesChanged'));
                return updated;
              });
              return; // Don't process further
            }

            // Check if device already exists in localStorage
            const stored = localStorage.getItem(STORAGE_KEY);
            const devices: ESP32Device[] = stored ? JSON.parse(stored) : [];

            // Find if device already exists
            const existingIndex = devices.findIndex(d => d.id === macAddress);

            if (existingIndex >= 0) {
              // Update existing device status
              devices[existingIndex] = {
                ...devices[existingIndex],
                ipAddress: deviceInfo.ip,
                online: deviceInfo.status === 'online',
                rssi: deviceInfo.rssi,
                lastSeen: new Date().toISOString(),
                // Update relays if provided in device status
                relays: deviceInfo.relays || devices[existingIndex].relays || {},
              };
            } else {
              // Add new device
              const newDevice: ESP32Device = {
                id: macAddress,
                macAddress: macAddress,
                name: deviceInfo.name || 'ESP32 Device',
                topic: `${macAddress}/relay`, // Base topic for relays
                ipAddress: deviceInfo.ip,
                online: deviceInfo.status === 'online',
                rssi: deviceInfo.rssi,
                lastSeen: new Date().toISOString(),
                relays: deviceInfo.relays || {}, // Get relays from device status
              };
              devices.push(newDevice);
              console.log('New ESP32 device added:', newDevice);

              // Subscribe to this device's relay status
              mqttService.subscribe(`${macAddress}/status`, (statusMsg) => {
                try {
                  const relayStatus = JSON.parse(statusMsg);
                  console.log(`Relay status for ${macAddress}:`, relayStatus);

                  // Update devices state with relay information
                  setDevices(prevDevices =>
                    prevDevices.map(d =>
                      d.macAddress === macAddress
                        ? { ...d, relays: relayStatus }
                        : d
                    )
                  );

                  // Also save to localStorage
                  const stored = localStorage.getItem(STORAGE_KEY);
                  if (stored) {
                    const storedDevices: ESP32Device[] = JSON.parse(stored);
                    const updatedDevices = storedDevices.map(d =>
                      d.macAddress === macAddress
                        ? { ...d, relays: relayStatus }
                        : d
                    );
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedDevices));
                  }

                  // Update light zones with relay states for compatibility
                  const updates: { [key: string]: boolean } = {};
                  for (let i = 1; i <= 4; i++) {
                    const relayKey = `relay${i}`;
                    if (relayKey in relayStatus) {
                      updates[`${macAddress}/relay${i}`] = relayStatus[relayKey];
                    }
                  }

                  setLightZones(prev => ({ ...prev, ...updates }));
                } catch (e) {
                  console.error('Failed to parse relay status:', e);
                }
              });
            }

            // Save updated devices
            localStorage.setItem(STORAGE_KEY, JSON.stringify(devices));
            setDevices(devices); // Update state
            window.dispatchEvent(new CustomEvent('esp32DevicesChanged'));

            // Update light zones with relay states from device status
            if (deviceInfo.relays) {
              const updates: { [key: string]: boolean } = {};
              Object.entries(deviceInfo.relays).forEach(([relayKey, relayState]) => {
                updates[`${macAddress}/${relayKey}`] = relayState as boolean;
              });
              setLightZones(prev => ({ ...prev, ...updates }));
              console.log('Light zones updated from device status:', updates);
            }
          } catch (e) {
            console.error('Failed to parse device status:', e);
          }
        });
      })
      .catch((error) => {
        console.error('Failed to connect to MQTT broker:', error);
        setIsConnected(false);
      });

    return () => {
      mqttService.disconnect();
    };
  }, []);

  const toggleLight = (zone: string) => {
    const newState = !lightZones[zone];

    // Check if this is an ESP32 relay zone (format: MAC/relay1)
    if (zone.includes('/relay')) {
      const [macAddress, relay] = zone.split('/');
      const relayNumber = relay.replace('relay', '');
      mqttService.publish(`${macAddress}/relay${relayNumber}/set`, newState ? 'ON' : 'OFF');
      console.log(`Toggling ${macAddress} relay${relayNumber} to ${newState ? 'ON' : 'OFF'}`);
    } else {
      // Legacy mosque/lights topics
      mqttService.publish(`mosque/lights/${zone}/set`, newState ? 'ON' : 'OFF');
    }

    setLightZones(prev => ({ ...prev, [zone]: newState }));
  };

  const toggleRelay = (macAddress: string, relay: string) => {
    // Find the device to get current relay state
    const device = devices.find(d => d.macAddress === macAddress);
    const currentState = device?.relays?.[relay] || false;
    const newState = !currentState;

    // Topic format: <MAC_ADDRESS>/relay1/set
    const topic = `${macAddress}/${relay}/set`;
    const message = newState ? 'ON' : 'OFF';

    console.log(`Publishing to ${topic}: ${message}`);
    mqttService.publish(topic, message);

    // Optimistically update the UI
    setDevices(prevDevices =>
      prevDevices.map(d =>
        d.macAddress === macAddress
          ? { ...d, relays: { ...d.relays, [relay]: newState } }
          : d
      )
    );

    // Also update lightZones for compatibility
    const zoneKey = `${macAddress}/${relay}`;
    setLightZones(prev => ({ ...prev, [zoneKey]: newState }));
  };

  const updatePrayerTime = (prayer: string, minutes: number) => {
    mqttService.publish(`mosque/prayer/adjust/${prayer}`, minutes.toString());
  };

  return (
    <MqttContext.Provider
      value={{
        isConnected,
        waterLevel,
        electricityUsage,
        lightZones,
        lightZoneNames,
        devices,
        toggleLight,
        toggleRelay,
        updatePrayerTime,
      }}
    >
      {children}
    </MqttContext.Provider>
  );
};
