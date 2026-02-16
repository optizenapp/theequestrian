#!/bin/bash
# Update EC2 SEO enrichment batch size configuration

set -e

EC2_HOST="ubuntu@13.239.21.182"
APP_DIR="~/theequestrian"

echo "🔧 Updating SEO Enrichment Configuration on EC2..."

# Update .env.production with new batch size
ssh "$EC2_HOST" "cd $APP_DIR && cat >> .env.production << 'EOF'

# SEO Enrichment Configuration
SEO_ENRICHMENT_MODE=apply
SEO_ENRICHMENT_DAILY_BATCH_SIZE=300
SEO_ENRICHMENT_REVALIDATE_BASE_URL=https://www.theequestrian.com.au
INTERNAL_REVALIDATE_SECRET=Lennie04-20262026
EOF
"

echo "✅ Configuration updated"

# Restart the worker service
echo "🔄 Restarting seo-enrichment-worker service..."
ssh "$EC2_HOST" "sudo systemctl restart seo-enrichment-worker"

echo "✅ Service restarted"

# Check status
echo "📊 Checking service status..."
ssh "$EC2_HOST" "sudo systemctl status seo-enrichment-worker --no-pager -l"

echo ""
echo "✅ EC2 configuration updated successfully!"
echo "   Daily batch size: 120 → 300 pages"
echo "   Next cron run will select 300 pages"
