#!/bin/bash
set -e

REPO_DIR="/var/www/theequestrian"
SERVICE_NAME="seo-enrichment-worker"

echo "=========================================="
echo "Installing SEO Enrichment systemd service"
echo "=========================================="
echo ""

if [ ! -f "$REPO_DIR/.env.production" ]; then
  echo "ERROR: $REPO_DIR/.env.production not found."
  echo "Create it first, then re-run this script."
  exit 1
fi

# Create systemd service file
echo "Creating systemd service file..."
sudo tee /etc/systemd/system/${SERVICE_NAME}.service > /dev/null << EOF
[Unit]
Description=SEO Enrichment Worker
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=${REPO_DIR}
EnvironmentFile=${REPO_DIR}/.env.production
ExecStart=/usr/bin/npm run seo:enrichment:worker
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
echo "Reloading systemd..."
sudo systemctl daemon-reload

# Enable service
echo "Enabling service..."
sudo systemctl enable ${SERVICE_NAME}

# Start service
echo "Starting service..."
sudo systemctl start ${SERVICE_NAME}

# Show status
echo ""
echo "Service installed and started!"
echo ""
sudo systemctl status ${SERVICE_NAME} --no-pager

echo ""
echo "=========================================="
echo "Useful commands:"
echo "=========================================="
echo "  View logs:    sudo journalctl -u ${SERVICE_NAME} -f"
echo "  Stop:         sudo systemctl stop ${SERVICE_NAME}"
echo "  Start:        sudo systemctl start ${SERVICE_NAME}"
echo "  Restart:      sudo systemctl restart ${SERVICE_NAME}"
echo "  Status:       sudo systemctl status ${SERVICE_NAME}"
echo "  Disable:      sudo systemctl disable ${SERVICE_NAME}"
echo ""
