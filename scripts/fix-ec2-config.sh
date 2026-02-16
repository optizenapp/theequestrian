#!/bin/bash
# Fix EC2 configuration to enable apply mode and increase batch size

set -e

EC2_HOST="ubuntu@13.239.21.182"
APP_DIR="~/theequestrian"

echo "🔧 Fixing EC2 SEO Enrichment Configuration..."
echo ""

# Backup existing .env.production
echo "📦 Backing up existing .env.production..."
ssh "$EC2_HOST" "cd $APP_DIR && cp .env.production .env.production.backup.$(date +%Y%m%d_%H%M%S)"

# Update the configuration
echo "✏️  Updating configuration..."
ssh "$EC2_HOST" "cd $APP_DIR && sed -i 's/SEO_ENRICHMENT_MODE=dry-run/SEO_ENRICHMENT_MODE=apply/g' .env.production"
ssh "$EC2_HOST" "cd $APP_DIR && sed -i 's/SEO_ENRICHMENT_DAILY_BATCH_SIZE=20/SEO_ENRICHMENT_DAILY_BATCH_SIZE=300/g' .env.production"
ssh "$EC2_HOST" "cd $APP_DIR && sed -i 's/SEO_ENRICHMENT_MIN_BATCH_SIZE=20/SEO_ENRICHMENT_MIN_BATCH_SIZE=100/g' .env.production"
ssh "$EC2_HOST" "cd $APP_DIR && sed -i 's/SEO_ENRICHMENT_MAX_BATCH_SIZE=20/SEO_ENRICHMENT_MAX_BATCH_SIZE=300/g' .env.production"
ssh "$EC2_HOST" "cd $APP_DIR && sed -i 's/SEO_ENRICHMENT_SELECTION_HARD_CAP=60/SEO_ENRICHMENT_SELECTION_HARD_CAP=600/g' .env.production"

echo "✅ Configuration updated"
echo ""

# Show the changes
echo "📋 Updated configuration:"
ssh "$EC2_HOST" "cd $APP_DIR && grep 'SEO_ENRICHMENT_' .env.production | grep -v '^#'"
echo ""

# Restart the worker service
echo "🔄 Restarting seo-enrichment-worker service..."
ssh "$EC2_HOST" "sudo systemctl restart seo-enrichment-worker"
sleep 3

# Check status
echo "📊 Service status:"
ssh "$EC2_HOST" "sudo systemctl status seo-enrichment-worker --no-pager -l | head -20"
echo ""

# Check recent logs
echo "📝 Recent worker logs:"
ssh "$EC2_HOST" "sudo journalctl -u seo-enrichment-worker -n 20 --no-pager"
echo ""

echo "✅ EC2 configuration fixed successfully!"
echo ""
echo "Summary of changes:"
echo "  • Mode: dry-run → apply (AI enrichment now enabled)"
echo "  • Daily batch: 20 → 300 pages"
echo "  • Min batch: 20 → 100 pages"
echo "  • Max batch: 20 → 300 pages"
echo "  • Selection cap: 60 → 600 pages"
echo ""
echo "Next cron run (tomorrow) will:"
echo "  • Select 300 pages for enrichment"
echo "  • Apply AI-generated content to live site"
echo "  • Process entire catalog (~9,000 pages) in ~30 days"
