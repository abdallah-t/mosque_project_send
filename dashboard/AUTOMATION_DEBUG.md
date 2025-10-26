# Prayer Automation Debugging Guide

## How to Check if Automation is Working

### 1. Open Browser Console
Press `F12` or `Cmd+Option+I` (Mac) to open Developer Tools, then go to the **Console** tab.

### 2. Look for These Messages

Every 30 seconds, you should see:
```
Automation Service: Running scheduled check...
Automation Service: Check at [current time]
Automation Service: Total tasks: X, Executed: Y
  Task: [Prayer Name] at [time], Time diff: XXs
```

### 3. Check Current Schedule

In the browser console, type:
```javascript
automationService.getTodaysTasks()
```

This will show all scheduled tasks for today.

### 4. Check Upcoming Tasks

```javascript
automationService.getUpcomingTasks()
```

This shows the next 5 tasks that will execute.

### 5. Force Regenerate Schedule

If tasks aren't showing up:
```javascript
automationService.generateSchedule()
```

### 6. Test Immediate Execution

To test if MQTT publishing works:
```javascript
// Replace with your actual MAC address and relay
automationService.executeDurationTest('30C6F74367F0/relay1', 5)
```

This will turn ON relay1 for 5 seconds, then turn it OFF.

## Common Issues

### Issue: No tasks scheduled
**Solution:** 
1. Check if automation is enabled in Prayer Automation page
2. Verify prayer times are loaded (check localStorage: `mosque_prayer_times`)
3. Check if schedules are configured with before/after actions

### Issue: Tasks not executing at correct time
**Solution:**
1. Verify your system time is correct
2. Check the time difference in console logs (should be close to 0 when executing)
3. Tasks execute within ±30 seconds of scheduled time

### Issue: MQTT not publishing
**Solution:**
1. Check MQTT connection status (should show "Connected" in dashboard)
2. Verify broker IP is correct in `.env` file
3. Check console for "Publishing [command] to [topic]" messages

## Viewing Current Settings

### Check Automation Settings
```javascript
JSON.parse(localStorage.getItem('mosque_prayer_automation'))
```

### Check Prayer Times
```javascript
JSON.parse(localStorage.getItem('mosque_prayer_times'))
```

### Check Test Schedule
```javascript
JSON.parse(localStorage.getItem('mosque_test_schedule'))
```

## How the 30-Second Check Works

1. **Every 30 seconds**: The service checks all scheduled tasks
2. **Execution Window**: ±30 seconds from scheduled time
   - If task is scheduled for 12:00:00
   - It will execute between 11:59:30 and 12:00:30
3. **Once executed**: Task is marked and won't execute again
4. **Daily reset**: New schedule is generated at midnight

## Expected Console Output

### When Working Correctly:
```
Automation Service: Starting...
Automation Service: Generating schedule for today
Automation Service: Generated 8 tasks
  - Fajr at 5:00:00 AM: 2 action(s)
  - Fajr at 5:30:00 AM: 2 action(s)
  ...
Automation Service: Auto-starting...
Automation Service: Check at 2:45:30 PM
Automation Service: Total tasks: 8, Executed: 2
  Task: Dhuhr at 12:00:00 PM, Time diff: -9930s
  Task: Dhuhr at 12:30:00 PM, Time diff: -8730s
  Task: Asr at 3:00:00 PM, Time diff: 870s
  ...
```

### When Task Executes:
```
Automation Service: ✅ Executing task for Dhuhr (2 actions)
Automation Service: Executing 2 action(s) for Dhuhr
Automation Service: Publishing ON to 30C6F74367F0/relay1/set
Automation Service: Publishing OFF to 30C6F74367F0/relay2/set
Automation Service: Executed 1 task(s)
```
