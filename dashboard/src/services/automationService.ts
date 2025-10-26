import { mqttService } from '@/lib/mqtt';

interface RelayAction {
  relay: string; // Format: "macAddress/relay1"
  state: boolean;
}

interface PrayerSchedule {
  prayer: string;
  beforeMinutes: number;
  beforeActions: RelayAction[];
  afterMinutes: number;
  afterActions: RelayAction[];
}

interface AutomationSettings {
  enabled: boolean;
  schedules: PrayerSchedule[];
}

interface PrayerTime {
  name: string;
  time: string;
}

interface ScheduledTask {
  id: string;
  prayer: string;
  executionTime: Date;
  actions: RelayAction[];
  executed: boolean;
}

const STORAGE_KEY = 'mosque_prayer_automation';
const PRAYER_TIMES_KEY = 'mosque_prayer_times';

class AutomationService {
  private checkInterval: NodeJS.Timeout | null = null;
  private scheduledTasks: ScheduledTask[] = [];
  private lastCheckDate: string = '';

  start() {
    console.log('Automation Service: Starting...');
    
    // Initial schedule generation
    this.generateSchedule();
    
    // Immediate first check
    this.checkAndExecute();
    
    // Check every 30 seconds
    this.checkInterval = setInterval(() => {
      console.log('Automation Service: Running scheduled check...');
      this.checkAndExecute();
    }, 30000);

    // Listen for settings changes
    window.addEventListener('automationSettingsChanged', () => {
      console.log('Automation Service: Settings changed, regenerating schedule');
      this.generateSchedule(true); // Force regeneration
    });

    // Listen for prayer times updates
    window.addEventListener('prayerTimesUpdated', () => {
      console.log('Automation Service: Prayer times updated, regenerating schedule');
      this.generateSchedule(true); // Force regeneration
    });

    // Listen for test schedule changes
    window.addEventListener('testScheduleChanged', () => {
      console.log('Automation Service: Test schedule changed, regenerating schedule');
      this.generateSchedule(true); // Force regeneration
    });

    window.addEventListener('storage', (e) => {
      if (e.key === PRAYER_TIMES_KEY || e.key === STORAGE_KEY || e.key === 'mosque_test_schedule') {
        console.log('Automation Service: Storage changed, regenerating schedule');
        this.generateSchedule(true); // Force regeneration
      }
    });

    console.log('Automation Service: Started successfully');
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    console.log('Automation Service: Stopped');
  }

  // New method: Quick test with duration (turn ON for X seconds then OFF)
  executeDurationTest(relay: string, durationSeconds: number) {
    const [macAddress, relayName] = relay.split('/');
    const topic = `${macAddress}/${relayName}/set`;

    console.log(`Automation Service: Starting duration test for ${relay} - ${durationSeconds}s`);

    // Turn ON immediately
    mqttService.publish(topic, 'ON');

    // Turn OFF after duration
    setTimeout(() => {
      console.log(`Automation Service: Duration test complete, turning OFF ${relay}`);
      mqttService.publish(topic, 'OFF');
    }, durationSeconds * 1000);
  }

  private loadSettings(): AutomationSettings | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Automation Service: Error loading settings', error);
    }
    return null;
  }

  private loadPrayerTimes(): PrayerTime[] {
    try {
      const stored = localStorage.getItem(PRAYER_TIMES_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        return data.prayerTimes || [];
      }
    } catch (error) {
      console.error('Automation Service: Error loading prayer times', error);
    }
    return [];
  }

  public generateSchedule(force: boolean = false) {
    const settings = this.loadSettings();
    const prayerTimes = this.loadPrayerTimes();

    const today = new Date().toDateString();
    
    // Only regenerate if date changed or forced
    if (!force && this.lastCheckDate === today && this.scheduledTasks.length > 0) {
      // Still add test schedule even if not regenerating
      this.addTestSchedule();
      return;
    }

    this.lastCheckDate = today;
    this.scheduledTasks = [];

    console.log('Automation Service: Generating schedule for today');

    // Only add prayer schedules if automation is enabled
    if (settings && settings.enabled) {
      settings.schedules.forEach(schedule => {
        const prayerTime = prayerTimes.find(pt => pt.name === schedule.prayer);
        if (!prayerTime) {
          console.warn(`Automation Service: Prayer time not found for ${schedule.prayer}`);
          return;
        }

        // Parse prayer time
        const [hours, minutes] = prayerTime.time.split(':').map(Number);
        
        // Create task for "before" actions
        if (schedule.beforeActions.length > 0) {
          const beforeTime = new Date();
          beforeTime.setHours(hours, minutes - schedule.beforeMinutes, 0, 0);

          this.scheduledTasks.push({
            id: `${schedule.prayer}-before-${Date.now()}`,
            prayer: schedule.prayer,
            executionTime: beforeTime,
            actions: schedule.beforeActions,
            executed: false,
          });
        }

        // Create task for "after" actions
        if (schedule.afterActions.length > 0) {
          const afterTime = new Date();
          afterTime.setHours(hours, minutes + schedule.afterMinutes, 0, 0);

          this.scheduledTasks.push({
            id: `${schedule.prayer}-after-${Date.now()}`,
            prayer: schedule.prayer,
            executionTime: afterTime,
            actions: schedule.afterActions,
            executed: false,
          });
        }
      });
    }

    // Add manual test schedule if exists
    this.addTestSchedule();

    // Sort tasks by execution time
    this.scheduledTasks.sort((a, b) => a.executionTime.getTime() - b.executionTime.getTime());

    console.log(`Automation Service: Generated ${this.scheduledTasks.length} tasks`);
    this.scheduledTasks.forEach(task => {
      console.log(`  - ${task.prayer} at ${task.executionTime.toLocaleTimeString()}: ${task.actions.length} action(s)`);
    });
  }

  private addTestSchedule() {
    try {
      const stored = localStorage.getItem('mosque_test_schedule');
      if (!stored) return;

      const testSchedule = JSON.parse(stored);
      const onTime = new Date(testSchedule.onTime);
      const offTime = new Date(testSchedule.offTime);
      const now = new Date();

      // Only add if times are in the future
      if (onTime > now) {
        this.scheduledTasks.push({
          id: `test-on-${Date.now()}`,
          prayer: 'Manual Test',
          executionTime: onTime,
          actions: testSchedule.onActions,
          executed: false,
        });
        console.log(`Automation Service: Added test ON task at ${onTime.toLocaleTimeString()}`);
      }

      if (offTime > now) {
        this.scheduledTasks.push({
          id: `test-off-${Date.now()}`,
          prayer: 'Manual Test',
          executionTime: offTime,
          actions: testSchedule.offActions,
          executed: false,
        });
        console.log(`Automation Service: Added test OFF task at ${offTime.toLocaleTimeString()}`);
      }

      // If both times have passed, remove the test schedule
      if (onTime < now && offTime < now) {
        localStorage.removeItem('mosque_test_schedule');
        console.log('Automation Service: Test schedule expired, removed');
      }
    } catch (error) {
      console.error('Automation Service: Error loading test schedule', error);
    }
  }

  private checkAndExecute() {
    const now = new Date();
    const currentTime = now.toLocaleTimeString();

    console.log(`Automation Service: Check at ${currentTime}`);
    console.log(`Automation Service: Total tasks: ${this.scheduledTasks.length}, Executed: ${this.scheduledTasks.filter(t => t.executed).length}`);

    // Check if we need to regenerate schedule (new day)
    const today = new Date().toDateString();
    if (this.lastCheckDate !== today) {
      console.log('Automation Service: New day detected, regenerating schedule');
      this.generateSchedule(true); // Force regeneration for new day
    }

    // Execute pending tasks (including tests even if automation is disabled)
    let executedCount = 0;
    this.scheduledTasks.forEach(task => {
      if (task.executed) return;

      // Check if task should be executed (within 60 seconds of scheduled time to avoid missing)
      const timeDiff = task.executionTime.getTime() - now.getTime();
      const timeDiffSeconds = Math.floor(timeDiff / 1000);
      
      console.log(`  Task: ${task.prayer} at ${task.executionTime.toLocaleTimeString()}, Time diff: ${timeDiffSeconds}s`);
      
      // Execute if within 60 seconds window (past due or upcoming)
      if (timeDiff <= 30000 && timeDiff > -30000) {
        console.log(`Automation Service: ✅ Executing task for ${task.prayer} (${task.actions.length} actions)`);
        this.executeTask(task);
        task.executed = true; // Mark as executed
        executedCount++;
      }
    });

    if (executedCount > 0) {
      console.log(`Automation Service: Executed ${executedCount} task(s)`);
    }

    // Clean up old executed tasks
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    this.scheduledTasks = this.scheduledTasks.filter(
      task => !task.executed || task.executionTime > yesterday
    );
  }

  private executeTask(task: ScheduledTask) {
    console.log(`Automation Service: Executing ${task.actions.length} action(s) for ${task.prayer}`);

    task.actions.forEach(action => {
      const [macAddress, relay] = action.relay.split('/');
      const command = action.state ? 'ON' : 'OFF';
      const topic = `${macAddress}/${relay}/set`;

      console.log(`Automation Service: Publishing ${command} to ${topic}`);
      mqttService.publish(topic, command);
    });

    task.executed = true;

    // Show notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Prayer Automation', {
        body: `Executed ${task.actions.length} relay action(s) for ${task.prayer}`,
        icon: '/icon.png',
      });
    }
  }

  getUpcomingTasks(): ScheduledTask[] {
    const now = new Date();
    return this.scheduledTasks
      .filter(task => !task.executed && task.executionTime > now)
      .slice(0, 5);
  }

  getExecutedTasks(): ScheduledTask[] {
    return this.scheduledTasks.filter(task => task.executed);
  }

  getTodaysTasks(): ScheduledTask[] {
    return this.scheduledTasks;
  }
}

// Singleton instance
export const automationService = new AutomationService();

// Auto-start the service
if (typeof window !== 'undefined') {
  // Request notification permission
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
  
  // Start service immediately
  console.log('Automation Service: Auto-starting...');
  automationService.start();
  
  // Also start again after a delay to ensure MQTT is ready
  setTimeout(() => {
    console.log('Automation Service: Re-checking after MQTT connection delay...');
    automationService.generateSchedule();
  }, 3000);
}
