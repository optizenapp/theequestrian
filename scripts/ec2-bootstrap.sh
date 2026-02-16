#!/bin/bash
set -e

echo "=========================================="
echo "SEO Enrichment EC2 Bootstrap"
echo "=========================================="
echo ""

# 1. Install Node.js if needed
if ! command -v node &> /dev/null; then
  echo "Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"
echo ""

# 2. Clone or pull repo
REPO_DIR="/var/www/theequestrian"
if [ -d "$REPO_DIR/.git" ]; then
  echo "Pulling latest from repo..."
  cd "$REPO_DIR"
  git pull origin main
else
  echo "Cloning repository..."
  sudo mkdir -p /var/www
  sudo chown -R ubuntu:ubuntu /var/www
  cd /var/www
  git clone git@github.com-optizen:optizenapp/theequestrian.git
  cd theequestrian
fi

cd "$REPO_DIR"

# 3. Install dependencies
echo ""
echo "Installing dependencies..."
npm ci

# 4. Check for .env.production
if [ ! -f ".env.production" ]; then
  echo ""
  echo "WARNING: .env.production not found."
  echo "You need to create it with required variables:"
  echo "  - POSTGRES_URL"
  echo "  - OPENAI_API_KEY"
  echo "  - NEXT_PUBLIC_SITE_URL"
  echo "  - INTERNAL_REVALIDATE_SECRET"
  echo "  - (optional) GSC/GA4 credentials"
  echo ""
  echo "Creating template..."
  cat > .env.production << 'EOF'
# Database
POSTGRES_URL=postgresql://...

# OpenAI
OPENAI_API_KEY=sk-...

# Site
NEXT_PUBLIC_SITE_URL=https://theequestrian.com.au

# Revalidation
INTERNAL_REVALIDATE_SECRET=...
SEO_ENRICHMENT_REVALIDATE_BASE_URL=https://theequestrian.com.au
SEO_ENRICHMENT_REVALIDATE_PATH=/api/internal/revalidate-shopify

# Pipeline config
SEO_ENRICHMENT_MODE=dry-run
SEO_ENRICHMENT_DAILY_BATCH_SIZE=20
SEO_ENRICHMENT_MIN_BATCH_SIZE=20
SEO_ENRICHMENT_MAX_BATCH_SIZE=20
SEO_ENRICHMENT_SELECTION_CANDIDATE_MULTIPLIER=2
SEO_ENRICHMENT_SELECTION_HARD_CAP=60
SEO_ENRICHMENT_KORAY_COMPLIANCE_THRESHOLD=72
SEO_ENRICHMENT_MAX_REGEN_ATTEMPTS=1

# Optional: Analytics (for full scoring)
# GSC_SITE_URL=https://theequestrian.com.au
# GSC_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
# GA4_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
# GA4_PROPERTY_ID=properties/123456789
EOF
  echo "STOP: Edit .env.production with real values, then re-run this script."
  exit 1
fi

# 5. Load env and initialize tables
echo ""
echo "Initializing enrichment tables..."
export $(grep -v '^#' .env.production | xargs)
npm run seo:enrichment:init

# 6. Run smoke test
echo ""
echo "Running dry-run smoke test..."
npm run seo:enrichment:ec2:smoke

echo ""
echo "=========================================="
echo "Bootstrap complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Review logs above for errors"
echo "  2. Test shadow mode: npx tsx scripts/seo-enrichment-ec2-smoke.ts --mode=shadow"
echo "  3. Test apply mode: npx tsx scripts/seo-enrichment-ec2-smoke.ts --mode=apply"
echo "  4. Install systemd service: sudo bash scripts/ec2-install-systemd.sh"
echo ""
