#!/bin/bash

echo "🚀 Starting The Equestrian Development Environment..."
echo ""

# Navigate to project directory
PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$PROJECT_DIR"

# Switch to dev branch
echo "🔀 Switching to jono-dev branch..."
git checkout jono-dev

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin jono-dev

# Check if package.json changed in last pull
if git diff HEAD@{1} --name-only 2>/dev/null | grep -q "package.json"; then
    echo "📦 Package.json changed - installing dependencies..."
    npm install
fi

# Wake database and check status
echo "🗄️  Waking up database..."
npm run db:stats

# Generate redirects from CSV
echo "🔀 Generating redirects..."
npm run redirects:generate

echo ""
echo "✅ Environment ready!"
echo "🌐 Starting development server on http://localhost:3001"
echo ""

# Start dev server
npm run dev
