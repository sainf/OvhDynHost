#!/bin/bash

# Stop on any error
set -e

# Configuration
INSTALL_DIR="/opt/ovh-dynhost-updater"
SERVICE_DIR="/etc/systemd/system"
REPO="sainf/OvhDynHost" # Replace with your GitHub repository
BINARY_NAME="ovh-dynhost-updater-linux-x64"
SERVICE_FILE="ovh-dynhost.service"
TIMER_FILE="ovh-dynhost.timer"

# Check for root privileges
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root"
  exit 1
fi

echo "Starting installation of OVH DynHost Updater..."

# Create installation directory
echo "Creating installation directory at $INSTALL_DIR..."
mkdir -p "$INSTALL_DIR"

# Download the latest release binary from GitHub
echo "Downloading the latest binary from GitHub..."
LATEST_RELEASE_URL=$(curl -s "https://api.github.com/repos/$REPO/releases/latest" | grep "browser_download_url.*$BINARY_NAME" | cut -d '"' -f 4)
if [ -z "$LATEST_RELEASE_URL" ]; then
    echo "Could not find the latest release binary. Please check the repository and release assets."
    exit 1
fi
curl -L -o "$INSTALL_DIR/ovh-dynhost-updater" "$LATEST_RELEASE_URL"
chmod +x "$INSTALL_DIR/ovh-dynhost-updater"

# Create systemd service file
echo "Creating systemd service file..."
cat > "$SERVICE_DIR/$SERVICE_FILE" <<EOL
[Unit]
Description=OVH DynHost Updater Service
Wants=$TIMER_FILE

[Service]
Type=oneshot
ExecStart=$INSTALL_DIR/ovh-dynhost-updater
WorkingDirectory=$INSTALL_DIR

[Install]
WantedBy=multi-user.target
EOL

# Create systemd timer file
echo "Creating systemd timer file..."
cat > "$SERVICE_DIR/$TIMER_FILE" <<EOL
[Unit]
Description=Run OVH DynHost Updater periodically
Requires=$SERVICE_FILE

[Timer]
Unit=$SERVICE_FILE
OnCalendar=*:0/15
Persistent=true

[Install]
WantedBy=timers.target
EOL

# Create a sample config.json if it doesn't exist
if [ ! -f "$INSTALL_DIR/config.json" ]; then
    echo "Creating a sample config.json..."
    cat > "$INSTALL_DIR/config.json" <<EOL
[
  {
    "username": "your-ovh-username",
    "password": "your-ovh-password",
    "hostname": "your-domain.com"
  }
]
EOL
fi

# Reload systemd, enable and start the timer
echo "Reloading systemd and enabling the timer..."
systemctl daemon-reload
systemctl enable --now "$TIMER_FILE"

echo ""
echo "--------------------------------------------------"
echo "Installation complete!"
echo ""
echo "IMPORTANT: You must now edit the configuration file at:"
echo "  $INSTALL_DIR/config.json"
echo ""
echo "After editing, you can check the status of the timer with:"
echo "  systemctl status $TIMER_FILE"
echo ""
echo "And view the logs with:"
echo "  journalctl -u $SERVICE_FILE -f"
echo "--------------------------------------------------"

