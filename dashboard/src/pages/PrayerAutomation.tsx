import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Power, Clock, Save, PlayCircle, StopCircle, Timer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useMqtt } from '@/contexts/MqttContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { automationService } from '@/services/automationService';

interface RelayAction {
    relay: string; // e.g., "relay1"
    state: boolean; // true = ON, false = OFF
}

interface PrayerSchedule {
    prayer: string;
    beforeMinutes: number;
    beforeActions: RelayAction[];
    afterMinutes: number;
    afterActions: RelayAction[];
}

interface PrayerTime {
    name: string;
    time: string;
}

interface AutomationSettings {
    enabled: boolean;
    schedules: PrayerSchedule[];
}

const STORAGE_KEY = 'mosque_prayer_automation';
const PRAYER_TIMES_KEY = 'mosque_prayer_times';

const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

const defaultSchedule = (prayer: string): PrayerSchedule => ({
    prayer,
    beforeMinutes: 5,
    beforeActions: [],
    afterMinutes: 30,
    afterActions: [],
});

const loadAutomationSettings = (): AutomationSettings => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (error) {
        console.error('Error loading automation settings:', error);
    }
    return {
        enabled: false,
        schedules: PRAYERS.map(defaultSchedule),
    };
};

const saveAutomationSettings = (settings: AutomationSettings) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        // Dispatch event to notify automation service
        window.dispatchEvent(new CustomEvent('automationSettingsChanged', { detail: settings }));
    } catch (error) {
        console.error('Error saving automation settings:', error);
    }
};

const loadPrayerTimes = (): PrayerTime[] => {
    try {
        const stored = localStorage.getItem(PRAYER_TIMES_KEY);
        if (stored) {
            const data = JSON.parse(stored);
            return data.prayerTimes || [];
        }
    } catch (error) {
        console.error('Error loading prayer times:', error);
    }
    return [];
};

const PrayerAutomation = () => {
    const navigate = useNavigate();
    const { devices, toggleRelay, isConnected } = useMqtt();
    const [settings, setSettings] = useState<AutomationSettings>(loadAutomationSettings());
    const [prayerTimes, setPrayerTimes] = useState<PrayerTime[]>(loadPrayerTimes());
    const [selectedPrayer, setSelectedPrayer] = useState(PRAYERS[0]);
    const [hasChanges, setHasChanges] = useState(false);

    // Manual test state
    const [testOnTime, setTestOnTime] = useState('');
    const [testOffTime, setTestOffTime] = useState('');
    const [selectedTestRelays, setSelectedTestRelays] = useState<string[]>([]);
    const [testScheduled, setTestScheduled] = useState(false);

    // Duration test state
    const [durationTestRelay, setDurationTestRelay] = useState('');
    const [durationSeconds, setDurationSeconds] = useState(30);

    // Load prayer times from storage
    useEffect(() => {
        const loadTimes = () => {
            setPrayerTimes(loadPrayerTimes());
        };

        // Load initially
        loadTimes();

        // Listen for updates
        const handlePrayerTimesUpdate = () => loadTimes();
        window.addEventListener('prayerTimesUpdated', handlePrayerTimesUpdate);
        window.addEventListener('storage', handlePrayerTimesUpdate);

        return () => {
            window.removeEventListener('prayerTimesUpdated', handlePrayerTimesUpdate);
            window.removeEventListener('storage', handlePrayerTimesUpdate);
        };
    }, []);

    // Get available relays from devices
    const availableRelays: { deviceMac: string; deviceName: string; relay: string }[] = [];
    devices.forEach(device => {
        if (device.relays) {
            Object.keys(device.relays).forEach(relay => {
                availableRelays.push({
                    deviceMac: device.macAddress,
                    deviceName: device.name,
                    relay,
                });
            });
        }
    });

    const getCurrentSchedule = () => {
        return settings.schedules.find(s => s.prayer === selectedPrayer) || defaultSchedule(selectedPrayer);
    };

    const updateSchedule = (updatedSchedule: PrayerSchedule) => {
        const newSchedules = settings.schedules.map(s =>
            s.prayer === selectedPrayer ? updatedSchedule : s
        );
        setSettings({ ...settings, schedules: newSchedules });
        setHasChanges(true);
    };

    const toggleEnabled = () => {
        const newSettings = { ...settings, enabled: !settings.enabled };
        setSettings(newSettings);
        saveAutomationSettings(newSettings);
        toast.success(newSettings.enabled ? 'Automation enabled' : 'Automation disabled');
    };

    const saveChanges = () => {
        saveAutomationSettings(settings);
        setHasChanges(false);
        toast.success('Settings saved successfully');
    };

    const addBeforeAction = (relay: string, deviceMac: string) => {
        const schedule = getCurrentSchedule();
        const relayKey = `${deviceMac}/${relay}`;
        if (!schedule.beforeActions.find(a => a.relay === relayKey)) {
            updateSchedule({
                ...schedule,
                beforeActions: [...schedule.beforeActions, { relay: relayKey, state: true }],
            });
        }
    };

    const addAfterAction = (relay: string, deviceMac: string) => {
        const schedule = getCurrentSchedule();
        const relayKey = `${deviceMac}/${relay}`;
        if (!schedule.afterActions.find(a => a.relay === relayKey)) {
            updateSchedule({
                ...schedule,
                afterActions: [...schedule.afterActions, { relay: relayKey, state: false }],
            });
        }
    };

    const removeBeforeAction = (relay: string) => {
        const schedule = getCurrentSchedule();
        updateSchedule({
            ...schedule,
            beforeActions: schedule.beforeActions.filter(a => a.relay !== relay),
        });
    };

    const removeAfterAction = (relay: string) => {
        const schedule = getCurrentSchedule();
        updateSchedule({
            ...schedule,
            afterActions: schedule.afterActions.filter(a => a.relay !== relay),
        });
    };

    const toggleActionState = (relay: string, isBefore: boolean) => {
        const schedule = getCurrentSchedule();
        if (isBefore) {
            updateSchedule({
                ...schedule,
                beforeActions: schedule.beforeActions.map(a =>
                    a.relay === relay ? { ...a, state: !a.state } : a
                ),
            });
        } else {
            updateSchedule({
                ...schedule,
                afterActions: schedule.afterActions.map(a =>
                    a.relay === relay ? { ...a, state: !a.state } : a
                ),
            });
        }
    };

    const calculateActionTime = (prayerTime: string, offsetMinutes: number, isBefore: boolean): string => {
        try {
            const [hours, minutes] = prayerTime.split(':').map(Number);
            const date = new Date();
            date.setHours(hours, minutes, 0, 0);

            const offset = isBefore ? -offsetMinutes : offsetMinutes;
            date.setMinutes(date.getMinutes() + offset);

            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        } catch {
            return 'Invalid time';
        }
    };

    const getRelayDisplayName = (relayKey: string): string => {
        const [deviceMac, relay] = relayKey.split('/');
        const device = devices.find(d => d.macAddress === deviceMac);
        return device ? `${device.name} - ${relay}` : relayKey;
    };

    // Manual test functions
    const toggleTestRelay = (relayKey: string) => {
        setSelectedTestRelays(prev => {
            if (prev.includes(relayKey)) {
                return prev.filter(r => r !== relayKey);
            } else {
                return [...prev, relayKey];
            }
        });
    };

    const scheduleManualTest = () => {
        if (!testOnTime || !testOffTime) {
            toast.error('Please set both ON and OFF times');
            return;
        }

        if (selectedTestRelays.length === 0) {
            toast.error('Please select at least one relay to test');
            return;
        }

        const now = new Date();
        const [onHours, onMinutes] = testOnTime.split(':').map(Number);
        const [offHours, offMinutes] = testOffTime.split(':').map(Number);

        const onTime = new Date();
        onTime.setHours(onHours, onMinutes, 0, 0);

        const offTime = new Date();
        offTime.setHours(offHours, offMinutes, 0, 0);

        if (onTime < now) {
            toast.error('ON time must be in the future');
            return;
        }

        if (offTime <= onTime) {
            toast.error('OFF time must be after ON time');
            return;
        }

        // Create test schedule in automation service format
        const testActions = selectedTestRelays.map(relay => ({ relay, state: true }));
        const testActionsOff = selectedTestRelays.map(relay => ({ relay, state: false }));

        // Store test schedule
        const testSchedule = {
            onTime: onTime.toISOString(),
            offTime: offTime.toISOString(),
            onActions: testActions,
            offActions: testActionsOff,
        };

        localStorage.setItem('mosque_test_schedule', JSON.stringify(testSchedule));
        window.dispatchEvent(new CustomEvent('testScheduleChanged'));

        setTestScheduled(true);
        toast.success(`Test scheduled: ON at ${testOnTime}, OFF at ${testOffTime}`);
    };

    const cancelManualTest = () => {
        localStorage.removeItem('mosque_test_schedule');
        window.dispatchEvent(new CustomEvent('testScheduleChanged'));
        setTestScheduled(false);
        setTestOnTime('');
        setTestOffTime('');
        setSelectedTestRelays([]);
        toast.info('Test cancelled');
    };

    const executeTestNow = () => {
        if (selectedTestRelays.length === 0) {
            toast.error('Please select at least one relay to test');
            return;
        }

        selectedTestRelays.forEach(relayKey => {
            const [macAddress, relay] = relayKey.split('/');
            toggleRelay(macAddress, relay);
        });

        toast.success(`Toggled ${selectedTestRelays.length} relay(s)`);
    };

    // Duration test function
    const executeDurationTest = () => {
        if (!durationTestRelay) {
            toast.error('Please select a relay to test');
            return;
        }

        if (durationSeconds < 1 || durationSeconds > 300) {
            toast.error('Duration must be between 1 and 300 seconds');
            return;
        }

        automationService.executeDurationTest(durationTestRelay, durationSeconds);
        toast.success(`Testing ${getRelayDisplayName(durationTestRelay)} for ${durationSeconds} seconds`);
    };

    const schedule = getCurrentSchedule();
    const currentPrayerTime = prayerTimes.find(pt => pt.name === selectedPrayer);

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5 p-6">
            <div className="container mx-auto max-w-7xl">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold">Prayer Times Automation</h1>
                            <p className="text-muted-foreground">Control relays automatically based on prayer times</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {hasChanges && (
                            <Button onClick={saveChanges} variant="default">
                                <Save className="mr-2 h-4 w-4" />
                                Save Changes
                            </Button>
                        )}
                        <div className="flex items-center gap-2">
                            <Switch checked={settings.enabled} onCheckedChange={toggleEnabled} />
                            <Label className="font-semibold">
                                {settings.enabled ? (
                                    <Badge variant="default" className="gap-1">
                                        <PlayCircle className="h-3 w-3" />
                                        Enabled
                                    </Badge>
                                ) : (
                                    <Badge variant="secondary" className="gap-1">
                                        <StopCircle className="h-3 w-3" />
                                        Disabled
                                    </Badge>
                                )}
                            </Label>
                        </div>
                    </div>
                </div>

                {/* Status Card */}
                {!isConnected && (
                    <Card className="mb-6 border-destructive">
                        <CardContent className="pt-6">
                            <p className="text-sm text-destructive">
                                ⚠️ MQTT not connected. Automation will not work until connection is established.
                            </p>
                        </CardContent>
                    </Card>
                )}

                {availableRelays.length === 0 && (
                    <Card className="mb-6 border-yellow-500">
                        <CardContent className="pt-6">
                            <p className="text-sm text-yellow-600">
                                ⚠️ No ESP32 devices found. Please add devices in the ESP32 Setup page.
                            </p>
                        </CardContent>
                    </Card>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Prayer Selection */}
                    <div className="lg:col-span-1">
                        <Card>
                            <CardHeader>
                                <CardTitle>Select Prayer</CardTitle>
                                <CardDescription>Configure automation for each prayer</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {PRAYERS.map(prayer => {
                                    const prayerTime = prayerTimes.find(pt => pt.name === prayer);
                                    const hasSchedule = settings.schedules.find(s => s.prayer === prayer);
                                    const actionCount = (hasSchedule?.beforeActions.length || 0) + (hasSchedule?.afterActions.length || 0);

                                    return (
                                        <Button
                                            key={prayer}
                                            variant={selectedPrayer === prayer ? 'default' : 'outline'}
                                            className="w-full justify-between"
                                            onClick={() => setSelectedPrayer(prayer)}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-4 w-4" />
                                                <span>{prayer}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {actionCount > 0 && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        {actionCount}
                                                    </Badge>
                                                )}
                                                <span className="text-xs opacity-70">
                                                    {prayerTime?.time || '--:--'}
                                                </span>
                                            </div>
                                        </Button>
                                    );
                                })}
                            </CardContent>
                        </Card>

                        {/* Schedule Overview */}
                        <Card className="mt-6">
                            <CardHeader>
                                <CardTitle>Today's Schedule</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 text-sm">
                                    {settings.schedules.map(sched => {
                                        const prayerTime = prayerTimes.find(pt => pt.name === sched.prayer);
                                        if (!prayerTime) return null;

                                        const beforeTime = calculateActionTime(prayerTime.time, sched.beforeMinutes, true);
                                        const afterTime = calculateActionTime(prayerTime.time, sched.afterMinutes, false);

                                        return (
                                            <div key={sched.prayer} className="border-l-2 border-primary pl-3 py-1">
                                                <div className="font-semibold">{sched.prayer} - {prayerTime.time}</div>
                                                {sched.beforeActions.length > 0 && (
                                                    <div className="text-xs text-muted-foreground">
                                                        {beforeTime}: {sched.beforeActions.length} action(s)
                                                    </div>
                                                )}
                                                {sched.afterActions.length > 0 && (
                                                    <div className="text-xs text-muted-foreground">
                                                        {afterTime}: {sched.afterActions.length} action(s)
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column - Configuration */}
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>{selectedPrayer} Automation</CardTitle>
                                <CardDescription>
                                    Configure relay actions before and after {selectedPrayer} prayer
                                    {currentPrayerTime && ` (${currentPrayerTime.time})`}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Tabs defaultValue="before" className="w-full">
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="before">Before Prayer</TabsTrigger>
                                        <TabsTrigger value="after">After Prayer</TabsTrigger>
                                    </TabsList>

                                    {/* Before Prayer Tab */}
                                    <TabsContent value="before" className="space-y-4">
                                        <div className="flex items-center gap-4">
                                            <div className="flex-1">
                                                <Label>Minutes Before {selectedPrayer}</Label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    max="120"
                                                    value={schedule.beforeMinutes}
                                                    onChange={(e) => updateSchedule({ ...schedule, beforeMinutes: parseInt(e.target.value) || 0 })}
                                                    className="mt-1"
                                                />
                                            </div>
                                            {currentPrayerTime && (
                                                <div className="flex-1">
                                                    <Label>Action Time</Label>
                                                    <div className="mt-1 p-2 bg-muted rounded text-center font-mono">
                                                        {calculateActionTime(currentPrayerTime.time, schedule.beforeMinutes, true)}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <Label>Relay Actions</Label>
                                            <div className="mt-2 space-y-2">
                                                {schedule.beforeActions.map(action => (
                                                    <div key={action.relay} className="flex items-center gap-2 p-2 border rounded">
                                                        <Power className={`h-4 w-4 ${action.state ? 'text-green-600' : 'text-red-600'}`} />
                                                        <span className="flex-1 text-sm">{getRelayDisplayName(action.relay)}</span>
                                                        <Button
                                                            size="sm"
                                                            variant={action.state ? 'default' : 'destructive'}
                                                            onClick={() => toggleActionState(action.relay, true)}
                                                        >
                                                            {action.state ? 'ON' : 'OFF'}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => removeBeforeAction(action.relay)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ))}
                                                {schedule.beforeActions.length === 0 && (
                                                    <div className="text-sm text-muted-foreground text-center py-4">
                                                        No actions configured. Add relays below.
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <Label>Add Relay</Label>
                                            <div className="mt-2 grid grid-cols-2 gap-2">
                                                {availableRelays.map(({ deviceMac, deviceName, relay }) => (
                                                    <Button
                                                        key={`${deviceMac}/${relay}`}
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => addBeforeAction(relay, deviceMac)}
                                                        disabled={schedule.beforeActions.some(a => a.relay === `${deviceMac}/${relay}`)}
                                                    >
                                                        <Plus className="h-3 w-3 mr-1" />
                                                        {deviceName} - {relay}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                    </TabsContent>

                                    {/* After Prayer Tab */}
                                    <TabsContent value="after" className="space-y-4">
                                        <div className="flex items-center gap-4">
                                            <div className="flex-1">
                                                <Label>Minutes After {selectedPrayer}</Label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    max="120"
                                                    value={schedule.afterMinutes}
                                                    onChange={(e) => updateSchedule({ ...schedule, afterMinutes: parseInt(e.target.value) || 0 })}
                                                    className="mt-1"
                                                />
                                            </div>
                                            {currentPrayerTime && (
                                                <div className="flex-1">
                                                    <Label>Action Time</Label>
                                                    <div className="mt-1 p-2 bg-muted rounded text-center font-mono">
                                                        {calculateActionTime(currentPrayerTime.time, schedule.afterMinutes, false)}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <Label>Relay Actions</Label>
                                            <div className="mt-2 space-y-2">
                                                {schedule.afterActions.map(action => (
                                                    <div key={action.relay} className="flex items-center gap-2 p-2 border rounded">
                                                        <Power className={`h-4 w-4 ${action.state ? 'text-green-600' : 'text-red-600'}`} />
                                                        <span className="flex-1 text-sm">{getRelayDisplayName(action.relay)}</span>
                                                        <Button
                                                            size="sm"
                                                            variant={action.state ? 'default' : 'destructive'}
                                                            onClick={() => toggleActionState(action.relay, false)}
                                                        >
                                                            {action.state ? 'ON' : 'OFF'}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => removeAfterAction(action.relay)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ))}
                                                {schedule.afterActions.length === 0 && (
                                                    <div className="text-sm text-muted-foreground text-center py-4">
                                                        No actions configured. Add relays below.
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <Label>Add Relay</Label>
                                            <div className="mt-2 grid grid-cols-2 gap-2">
                                                {availableRelays.map(({ deviceMac, deviceName, relay }) => (
                                                    <Button
                                                        key={`${deviceMac}/${relay}`}
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => addAfterAction(relay, deviceMac)}
                                                        disabled={schedule.afterActions.some(a => a.relay === `${deviceMac}/${relay}`)}
                                                    >
                                                        <Plus className="h-3 w-3 mr-1" />
                                                        {deviceName} - {relay}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>

                        {/* Manual Test Card */}
                        <Card className="mt-6 border-blue-500">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="h-5 w-5 text-blue-500" />
                                    Manual Test Schedule
                                </CardTitle>
                                <CardDescription>
                                    Test automation by scheduling relays to turn ON and OFF at specific times
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Time Selection */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Turn ON at:</Label>
                                        <Input
                                            type="time"
                                            value={testOnTime}
                                            onChange={(e) => setTestOnTime(e.target.value)}
                                            className="mt-1"
                                            disabled={testScheduled}
                                        />
                                    </div>
                                    <div>
                                        <Label>Turn OFF at:</Label>
                                        <Input
                                            type="time"
                                            value={testOffTime}
                                            onChange={(e) => setTestOffTime(e.target.value)}
                                            className="mt-1"
                                            disabled={testScheduled}
                                        />
                                    </div>
                                </div>

                                {/* Relay Selection */}
                                <div>
                                    <Label>Select Relays to Test:</Label>
                                    <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
                                        {availableRelays.map(({ deviceMac, deviceName, relay }) => {
                                            const relayKey = `${deviceMac}/${relay}`;
                                            const isSelected = selectedTestRelays.includes(relayKey);
                                            return (
                                                <Button
                                                    key={relayKey}
                                                    variant={isSelected ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => toggleTestRelay(relayKey)}
                                                    disabled={testScheduled}
                                                    className="justify-start"
                                                >
                                                    <Power className={`h-3 w-3 mr-1 ${isSelected ? 'text-white' : ''}`} />
                                                    <span className="text-xs truncate">{deviceName} - {relay}</span>
                                                </Button>
                                            );
                                        })}
                                    </div>
                                    {availableRelays.length === 0 && (
                                        <div className="text-sm text-muted-foreground text-center py-4">
                                            No relays available. Please add ESP32 devices first.
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-2">
                                    {!testScheduled ? (
                                        <>
                                            <Button
                                                onClick={scheduleManualTest}
                                                disabled={!isConnected || selectedTestRelays.length === 0 || !testOnTime || !testOffTime}
                                                className="flex-1"
                                            >
                                                <Clock className="mr-2 h-4 w-4" />
                                                Schedule Test
                                            </Button>
                                            <Button
                                                onClick={executeTestNow}
                                                variant="secondary"
                                                disabled={!isConnected || selectedTestRelays.length === 0}
                                            >
                                                <Power className="mr-2 h-4 w-4" />
                                                Test Now
                                            </Button>
                                        </>
                                    ) : (
                                        <Button onClick={cancelManualTest} variant="destructive" className="flex-1">
                                            <StopCircle className="mr-2 h-4 w-4" />
                                            Cancel Scheduled Test
                                        </Button>
                                    )}
                                </div>

                                {/* Status Message */}
                                {testScheduled && (
                                    <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                                        <div className="font-semibold text-blue-900">Test Scheduled:</div>
                                        <div className="text-blue-700 mt-1">
                                            • {selectedTestRelays.length} relay(s) will turn <strong>ON</strong> at {testOnTime}
                                        </div>
                                        <div className="text-blue-700">
                                            • {selectedTestRelays.length} relay(s) will turn <strong>OFF</strong> at {testOffTime}
                                        </div>
                                        <div className="text-xs text-blue-600 mt-2">
                                            The automation service will execute these actions automatically.
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Duration Test Card - NEW */}
                        <Card className="mt-6 border-green-500">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Timer className="h-5 w-5 text-green-500" />
                                    Quick Duration Test
                                </CardTitle>
                                <CardDescription>
                                    Turn on a relay for a specific duration, then automatically turn it off
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Relay Selection */}
                                <div>
                                    <Label>Select Relay:</Label>
                                    <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
                                        {availableRelays.map(({ deviceMac, deviceName, relay }) => {
                                            const relayKey = `${deviceMac}/${relay}`;
                                            const isSelected = durationTestRelay === relayKey;
                                            return (
                                                <Button
                                                    key={relayKey}
                                                    variant={isSelected ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => setDurationTestRelay(relayKey)}
                                                    className="justify-start"
                                                >
                                                    <Power className={`h-3 w-3 mr-1 ${isSelected ? 'text-white' : ''}`} />
                                                    <span className="text-xs truncate">{deviceName} - {relay}</span>
                                                </Button>
                                            );
                                        })}
                                    </div>
                                    {availableRelays.length === 0 && (
                                        <div className="text-sm text-muted-foreground text-center py-4">
                                            No relays available. Please add ESP32 devices first.
                                        </div>
                                    )}
                                </div>

                                {/* Duration Input */}
                                <div>
                                    <Label>Duration (seconds):</Label>
                                    <div className="flex gap-2 items-center mt-1">
                                        <Input
                                            type="number"
                                            value={durationSeconds}
                                            onChange={(e) => setDurationSeconds(parseInt(e.target.value) || 0)}
                                            min="1"
                                            max="300"
                                            className="flex-1"
                                        />
                                        <div className="flex gap-1">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setDurationSeconds(10)}
                                            >
                                                10s
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setDurationSeconds(30)}
                                            >
                                                30s
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setDurationSeconds(60)}
                                            >
                                                60s
                                            </Button>
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Range: 1-300 seconds
                                    </p>
                                </div>

                                {/* Action Button */}
                                <Button
                                    onClick={executeDurationTest}
                                    disabled={!isConnected || !durationTestRelay}
                                    className="w-full"
                                    variant="default"
                                >
                                    <PlayCircle className="mr-2 h-4 w-4" />
                                    Start Test (ON for {durationSeconds}s, then OFF)
                                </Button>

                                {/* Info */}
                                <div className="p-3 bg-green-50 border border-green-200 rounded text-sm">
                                    <div className="text-green-900 text-xs">
                                        <strong>How it works:</strong> The selected relay will turn ON immediately,
                                        stay on for the specified duration, and then automatically turn OFF.
                                        Perfect for quick testing!
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Manual Override Card */}
                        <Card className="mt-6">
                            <CardHeader>
                                <CardTitle>Manual Override</CardTitle>
                                <CardDescription>Control relays directly (overrides automation temporarily)</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {devices.map(device =>
                                        device.relays && Object.entries(device.relays).map(([relay, state]) => (
                                            <Button
                                                key={`${device.macAddress}/${relay}`}
                                                variant={state ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => toggleRelay(device.macAddress, relay)}
                                                disabled={!isConnected || !device.online}
                                                className="flex items-center justify-between"
                                            >
                                                <Power className="h-3 w-3" />
                                                <span className="text-xs truncate">{device.name} - {relay}</span>
                                                <Badge variant={state ? 'default' : 'secondary'} className="text-xs">
                                                    {state ? 'ON' : 'OFF'}
                                                </Badge>
                                            </Button>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrayerAutomation;
