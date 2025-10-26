# Quick Test Commands

## Test MQTT Broker Connection

```bash
# Subscribe to all mosque topics (monitor everything)
mosquitto_sub -h 192.168.100.81 -t "mosque/#" -v
```

## Control Lights Manually

```bash
# Downstairs lights
mosquitto_pub -h 192.168.100.81 -t "mosque/lights/downstairs/set" -m "ON"
mosquitto_pub -h 192.168.100.81 -t "mosque/lights/downstairs/set" -m "OFF"

# Upstairs lights
mosquitto_pub -h 192.168.100.81 -t "mosque/lights/upstairs/set" -m "ON"
mosquitto_pub -h 192.168.100.81 -t "mosque/lights/upstairs/set" -m "OFF"
```

## Monitor Specific Topics

```bash
# Monitor light status
mosquitto_sub -h 192.168.100.81 -t "mosque/lights/status" -v

# Monitor device status
mosquitto_sub -h 192.168.100.81 -t "mosque/devices/status" -v
```

## Test Both Lights

```bash
# Turn both ON
mosquitto_pub -h 192.168.100.81 -t "mosque/lights/downstairs/set" -m "ON" && \
mosquitto_pub -h 192.168.100.81 -t "mosque/lights/upstairs/set" -m "ON"

# Turn both OFF
mosquitto_pub -h 192.168.100.81 -t "mosque/lights/downstairs/set" -m "OFF" && \
mosquitto_pub -h 192.168.100.81 -t "mosque/lights/upstairs/set" -m "OFF"
```

## Expected Output

When subscribing to `mosque/#`, you should see:

```
mosque/devices/status {"device":"esp32_01","name":"ESP32-Relay-Controller","status":"online","ip":"192.168.1.100","rssi":-45}
mosque/lights/status {"downstairs":false,"upstairs":false}
```

After sending ON command:
```
mosque/lights/downstairs/set ON
mosque/lights/status {"downstairs":true,"upstairs":false}
```
