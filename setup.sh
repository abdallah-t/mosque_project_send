#!/bin/bash

# Prayer Times Integration Setup Script
echo "=========================================="
echo "Prayer Times Integration Setup"
echo "=========================================="

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3 first."
    exit 1
fi

echo "✅ Python 3 found"

# Install Python dependencies
echo "📦 Installing Python dependencies..."
if pip3 install -r requirements.txt; then
    echo "✅ Python dependencies installed successfully"
else
    echo "❌ Failed to install Python dependencies"
    echo "💡 Try running: pip3 install flask flask-cors pyIslam"
    exit 1
fi

echo ""
echo "🚀 Setup complete!"
echo ""
echo "To start the prayer times API server:"
echo "  python3 prayer_server.py"
echo ""
echo "To start the React frontend:"
echo "  cd interface/islamic-time-display"
echo "  npm run dev"
echo ""
echo "Make sure both servers are running:"
echo "  - Backend API: http://localhost:5000"
echo "  - Frontend: http://localhost:5173 (or the port shown by Vite)"
echo ""
echo "The frontend will automatically fetch prayer times from the backend API."
echo "=========================================="