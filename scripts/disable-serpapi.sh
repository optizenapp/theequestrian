#!/bin/bash
set -e

EC2_HOST="ubuntu@52.206.187.213"
APP_DIR="/var/www/theequestrian"

echo "🚫 Disabling SerpAPI to save costs..."

# Update EC2 .env.production to disable SERP analysis
echo "📝 Updating EC2 configuration..."
ssh "$EC2_HOST" << 'ENDSSH'
cd /var/www/theequestrian

# Remove any existing SERP config lines
sed -i '/SEO_ENRICHMENT_ENABLE_SERP/d' .env.production
sed -i '/SERPAPI_API_KEY/d' .env.production

# Explicitly disable SERP analysis
echo "SEO_ENRICHMENT_ENABLE_SERP=false" >> .env.production

echo "✅ SERP analysis disabled in .env.production"
ENDSSH

# Restart the worker to apply changes
echo "🔄 Restarting worker..."
ssh "$EC2_HOST" "sudo systemctl restart seo-enrichment-worker"

echo "✅ Worker restarted with SERP analysis disabled"

# Verify the change
echo "📊 Verifying configuration..."
ssh "$EC2_HOST" "cd $APP_DIR && grep -E '(SERP|serpapi)' .env.production || echo 'No SERP config found (good!)'"

echo ""
echo "✅ SerpAPI disabled successfully!"
echo "   The enrichment pipeline will now run without competitor SERP analysis"
echo "   This will significantly reduce API costs while maintaining content quality"
echo ""
echo "💡 The AI will still generate high-quality content using:"
echo "   - GSC data (search queries, impressions, CTR)"
echo "   - GA4 data (sessions, conversions, bounce rate)"
echo "   - Koray's topical authority framework"
echo "   - Product/collection data from your database"
