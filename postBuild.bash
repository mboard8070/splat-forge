#!/bin/bash
# postBuild.bash - runs during container build with root privileges

set -e

echo "Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

echo "Installing project dependencies..."
cd /project
npm install

echo "Building Next.js app..."
npm run build

echo "postBuild complete!"
