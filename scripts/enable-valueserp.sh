#!/bin/bash
set -e

EC2_HOST="ubuntu@52.206.187.213"
APP_DIR="/var/www/theequestrian"

echo "🔄 Switching to ValueSERP API..."

# Deploy updated serp.ts file
echo "📦 Deploying updated SERP analyzer..."
scp lib/seo-enrichment/serp.ts "$EC2_HOST:$APP_DIR/lib/seo-enrichment/serp.ts"
scp lib/seo-enrichment/config.ts "$EC2_HOST:$APP_DIR/lib/seo-enrichment/config.ts"

echo "✅ Files deployed"

# Update EC2 .env.production with ValueSERP config
echo "📝 Updating EC2 configuration..."
ssh "$EC2_HOST" << 'ENDSSH'
cd /var/www/theequestrian

# Remove old SERP config
sed -i '/SEO_ENRICHMENT_ENABLE_SERP/d' .env.production
sed -i '/SERPAPI_API_KEY/d' .env.production
sed -i '/VALUESERP_API_KEY/d' .env.production

# Add ValueSERP config
echo "SEO_ENRICHMENT_ENABLE_SERP=true" >> .env.production
echo "VALUESERP_API_KEY=0253300D1C1D4468BF91D3E4FDE6A363" >> .env.production

echo "✅ ValueSERP configuration added to .env.production"
ENDSSH

# Restart the worker to apply changes
echo "🔄 Restarting worker..."
ssh "$EC2_HOST" "sudo systemctl restart seo-enrichment-worker"

echo "✅ Worker restarted with ValueSERP enabled"

# Wait a bit for worker to start processing
sleep 10

# Check logs to verify ValueSERP is working
echo "📊 Checking logs for ValueSERP activity..."
ssh "$EC2_HOST" "sudo journalctl -u seo-enrichment-worker -n 20 --no-pager | grep -i 'valueserp\|serp' || echo 'No SERP activity yet (worker may still be starting)'"

echo ""
echo "✅ ValueSERP integration complete!"
echo ""
echo "💰 Cost Savings:"
echo "   - Old SerpAPI: ~\$135/month"
echo "   - New ValueSERP: ~\$67.50/month"
echo "   - Savings: \$67.50/month (50% reduction)"
echo ""
echo "📊 Usage:"
echo "   - 300 pages/day × 3 queries = 900 queries/day"
echo "   - 27,000 queries/month @ \$2.50 per 1,000"
echo ""
echo "🔍 Monitor logs: ssh $EC2_HOST 'sudo journalctl -u seo-enrichment-worker -f'"
