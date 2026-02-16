#!/bin/bash
# Quick deployment script for SEO enrichment updates to EC2

set -e

EC2_HOST="ubuntu@52.206.187.213"
EC2_PATH="/var/www/theequestrian"
KEY_FILE="te-seo.pem"

echo "🚀 Deploying SEO enrichment updates to EC2..."

# Deploy updated files
echo "📦 Uploading updated files..."
scp -i "$KEY_FILE" \
  lib/seo-enrichment/worker.ts \
  scripts/run-seo-enrichment.ts \
  scripts/fix-internal-link-constraint.ts \
  package.json \
  "$EC2_HOST:$EC2_PATH/"

# Move files to correct locations on EC2
echo "📁 Moving files to correct locations..."
ssh -i "$KEY_FILE" "$EC2_HOST" << 'EOF'
  cd /var/www/theequestrian
  mv worker.ts lib/seo-enrichment/
  mv run-seo-enrichment.ts scripts/
  mv fix-internal-link-constraint.ts scripts/
EOF

# Restart the worker
echo "🔄 Restarting SEO enrichment worker..."
ssh -i "$KEY_FILE" "$EC2_HOST" "sudo systemctl restart seo-enrichment-worker"

echo "✅ Deployment complete!"
echo ""
echo "📊 Check status with:"
echo "   ssh -i $KEY_FILE $EC2_HOST 'sudo systemctl status seo-enrichment-worker'"
echo ""
echo "📋 View logs with:"
echo "   ssh -i $KEY_FILE $EC2_HOST 'sudo journalctl -u seo-enrichment-worker -f'"
