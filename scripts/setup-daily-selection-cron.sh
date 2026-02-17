#!/bin/bash
set -e

REPO_DIR="/var/www/theequestrian"

echo "=========================================="
echo "Setting up daily page selection cron"
echo "=========================================="
echo ""

if [ ! -f "$REPO_DIR/.env.production" ]; then
  echo "ERROR: $REPO_DIR/.env.production not found."
  exit 1
fi

# Create wrapper script that sources env and runs selection
WRAPPER_SCRIPT="$REPO_DIR/scripts/run-daily-selection.sh"
echo "Creating wrapper script at $WRAPPER_SCRIPT..."
cat > "$WRAPPER_SCRIPT" << 'EOF'
#!/bin/bash
set -a
source /var/www/theequestrian/.env.production
set +a
cd /var/www/theequestrian
/usr/bin/npm run seo:enrichment:select >> /var/log/seo-enrichment-selection.log 2>&1
EOF

chmod +x "$WRAPPER_SCRIPT"

# Add cron job - runs daily at 2 AM local time
CRON_LINE="0 2 * * * $WRAPPER_SCRIPT"
(crontab -l 2>/dev/null | grep -v "run-daily-selection.sh"; echo "$CRON_LINE") | crontab -

echo ""
echo "✅ Cron job installed!"
echo "   Daily page selection will run at 2:00 AM"
echo "   Will select 300 pages per day"
echo ""
echo "Current crontab:"
crontab -l
echo ""
echo "=========================================="
echo "Useful commands:"
echo "=========================================="
echo "  View selection log:  tail -f /var/log/seo-enrichment-selection.log"
echo "  List cron jobs:      crontab -l"
echo "  Edit cron:           crontab -e"
echo "  Test selection now:  $WRAPPER_SCRIPT"
echo "  Trigger manually:    npm run seo:enrichment:select"
echo ""
echo "✅ System configured for continuous operation:"
echo "   • Cron selects 300 pages daily at 2 AM"
echo "   • Worker processes queue 24/7"
echo "   • All 10,000+ pages cycled monthly"
echo ""
