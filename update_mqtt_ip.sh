#!/bin/bash

# Script to update MQTT broker IP in both ESP32 and Dashboard
# Usage: ./update_mqtt_ip.sh <NEW_IP_ADDRESS>

if [ -z "$1" ]; then
    echo "❌ Error: No IP address provided"
    echo "Usage: ./update_mqtt_ip.sh <IP_ADDRESS>"
    echo "Example: ./update_mqtt_ip.sh 172.20.10.2"
    exit 1
fi

NEW_IP="$1"

# Paths
ESP32_CODE="/Users/tantawy/Documents/PlatformIO/Projects/relay-test/src/main.cpp"
DASHBOARD_ENV="/Users/tantawy/Library/CloudStorage/OneDrive-UniversityofTechnologyBahrain/Documents/MasterFolder/academic_life/uni/UTB/business/mosque_project/dashboard/.env"

echo "🔄 Updating MQTT Broker IP to: $NEW_IP"
echo ""

# Update ESP32 code
echo "📝 Updating ESP32 code..."
if [ -f "$ESP32_CODE" ]; then
    # Find the current IP and replace it
    sed -i '' "s|const char\* mqtt_server = \"[^\"]*\";|const char* mqtt_server = \"$NEW_IP\";|g" "$ESP32_CODE"
    echo "✅ ESP32 code updated"
else
    echo "❌ ESP32 code file not found!"
fi

# Update Dashboard .env
echo "📝 Updating Dashboard .env..."
if [ -f "$DASHBOARD_ENV" ]; then
    # Update the WebSocket URL (port 9001)
    sed -i '' "s|VITE_MQTT_BROKER_URL=ws://[^:]*:9001|VITE_MQTT_BROKER_URL=ws://$NEW_IP:9001|g" "$DASHBOARD_ENV"
    echo "✅ Dashboard .env updated"
else
    echo "❌ Dashboard .env file not found!"
fi

echo ""
echo "✅ Update complete!"
echo ""
echo "📌 Next steps:"
echo "1. Upload to ESP32: cd /Users/tantawy/Documents/PlatformIO/Projects/relay-test && ~/.platformio/penv/bin/platformio run --target upload"
echo "2. Restart dashboard: Stop and restart the dev server (Ctrl+C then 'bun run dev')"
echo ""
echo "Current configuration:"
echo "  ESP32: $NEW_IP:1883"
echo "  Dashboard: ws://$NEW_IP:9001"
