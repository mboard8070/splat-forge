#!/bin/bash
cd /project

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start the app on port 3002
echo "Starting Splat Forge on port 3002..."
npm run dev -- -p 3002 -H 0.0.0.0
