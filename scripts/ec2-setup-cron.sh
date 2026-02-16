#!/bin/bash
set -e

REPO_DIR="/var/www/theequestrian"

echo "=========================================="
echo "Setting up daily enrichment report cron"
echo "=========================================="
echo ""

if [ ! -f "$REPO_DIR/.env.production" ]; then
  echo "ERROR: $REPO_DIR/.env.production not found."
  exit 1
fi

# Create a wrapper script that sources env and runs the report
WRAPPER_SCRIPT="$REPO_DIR/scripts/run-daily-report.sh"
echo "Creating wrapper script at $WRAPPER_SCRIPT..."
cat > "$WRAPPER_SCRIPT" << 'EOF'
#!/bin/bash
set -a
source /var/www/theequestrian/.env.production
set +a
cd /var/www/theequestrian
/usr/bin/npm run seo:enrichment:report -- --email >> /var/log/seo-enrichment-report.log 2>&1
EOF

chmod +x "$WRAPPER_SCRIPT"

# Add cron job (runs daily at 9 AM UTC)
CRON_LINE="0 9 * * * $WRAPPER_SCRIPT"
(crontab -l 2>/dev/null | grep -v "run-daily-report.sh"; echo "$CRON_LINE") | crontab -

echo ""
echo "Cron job installed!"
echo "Daily report will run at 9:00 AM UTC"
echo ""
echo "Current crontab:"
crontab -l
echo ""
echo "=========================================="
echo "Useful commands:"
echo "=========================================="
echo "  View report log:  tail -f /var/log/seo-enrichment-report.log"
echo "  List cron jobs:   crontab -l"
echo "  Edit cron:        crontab -e"
echo "  Test report now:  $WRAPPER_SCRIPT"
echo ""
