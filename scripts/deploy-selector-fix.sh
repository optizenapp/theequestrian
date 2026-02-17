#!/bin/bash
set -e

EC2_HOST="ubuntu@52.206.187.213"
APP_DIR="/var/www/theequestrian"

echo "🚀 Deploying selector fix to EC2..."

# Deploy updated files
echo "📦 Copying updated files..."
scp lib/seo-enrichment/selector.ts "$EC2_HOST:$APP_DIR/lib/seo-enrichment/selector.ts"
scp lib/seo-enrichment/queries.ts "$EC2_HOST:$APP_DIR/lib/seo-enrichment/queries.ts"

echo "✅ Files deployed"

# Restart worker
echo "🔄 Restarting worker..."
ssh "$EC2_HOST" "sudo systemctl restart seo-enrichment-worker"

echo "✅ Worker restarted"

# Run selection
echo "🎯 Triggering page selection..."
ssh "$EC2_HOST" "cd $APP_DIR && bash scripts/run-daily-selection.sh > /tmp/selection-output.log 2>&1 &"

sleep 5

# Show status
echo "📊 Checking status..."
ssh "$EC2_HOST" "tail -30 ~/seo-enrichment-selection.log"

echo ""
echo "✅ Deployment complete!"
echo "   Selection is running in background"
echo "   Watch logs: ssh $EC2_HOST 'tail -f ~/seo-enrichment-selection.log'"
