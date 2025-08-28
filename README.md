# OVH DynHost Updater

A simple, efficient CLI tool to update OVH DynHost (Dynamic DNS) records. Built with TypeScript and Bun, compiled to a single, dependency-free binary.

## Index

- [Features](#features)
- [Quick Start](#quick-start)
- [Command Line Options](#command-line-options)
- [Systemd Setup](#systemd-setup)
- [Development](#development)
- [License](#license)

## Features

- **Multiple Records**: Update several DynHost records at once
- **Single Binary**: Standalone executable, no dependencies needed
- **Self-Update**: Updates itself to latest version from GitHub
- **IP Caching**: Only updates when your IP actually changes
- **Configurable Delay**: Set custom delay between updates
- **Debug Mode**: Show OVH API requests/responses for troubleshooting
- **Systemd Integration**: Includes service and timer files

## Quick Start

1. **Configure**: Create `config.json` with your DynHost credentials:
   ```json
   [
     {
       "username": "your-ovh-username",
       "password": "your-ovh-password", 
       "hostname": "your-domain.com"
     }
   ]
   ```

2. **Build**: 
   ```bash
   bun install
   bun run build
   ```

3. **Run**:
   ```bash
   ./ovh-dynhost-updater
   ```

## Command Line Options

```bash
./ovh-dynhost-updater                # Normal operation (only updates if IP changed)
./ovh-dynhost-updater --force        # Force update even if IP unchanged  
./ovh-dynhost-updater --self-update  # Update to latest version
./ovh-dynhost-updater --dev          # Show OVH API URL and raw responses
./ovh-dynhost-updater --delay=10000  # Set delay between updates (ms, default: 5000)
```

### IP Caching

The tool automatically caches your IP in `last_ip.txt` and only performs updates when your IP changes, reducing unnecessary API calls.

## Systemd Setup

For automated updates every 15 minutes:

```bash
# Quick install (downloads latest release)
curl -sL https://raw.githubusercontent.com/sainf/OvhDynHost/master/install.sh | sudo bash

# Manual install
sudo cp ovh-dynhost-updater /usr/local/bin/
sudo mkdir -p /etc/ovh-dynhost
sudo cp config.json /etc/ovh-dynhost/
sudo cp ovh-dynhost.{service,timer} /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now ovh-dynhost.timer

# Check logs
journalctl -u ovh-dynhost.service
```

## Development

```bash
# Run directly with Bun
bun run dev

# Or with Node.js
npm install -g tsx
tsx src/index.ts

# Build for all platforms
bun run build:all
```

## License

MIT License - see [LICENSE](LICENSE) file for details.
