# OVH DynHost Updater

A simple, modern, and efficient command-line tool to update OVH DynHost (Dynamic DNS) records. This tool is built with TypeScript and Bun, and is designed to be compiled into a single, dependency-free binary for easy deployment.

It can update multiple DynHost records from a single configuration file and includes systemd service and timer files for automated execution.

> **A Note on Binary Size:** The single-file executable produced by `bun build --compile` is approximately 100MB. This is because it includes the Bun runtime, which allows the binary to run on any compatible system without needing a separate runtime installation. The benefit is a completely standalone deployment, eliminating the need for package managers (like `apt` or `dnf`) or build toolchains on the target system.

## Features

-   **Multiple Record Updates**: Update several DynHost records at once.
-   **Single Binary**: Compiles to a single, standalone executable. No `node_modules` or other dependencies needed on the target machine.
-   **Self-Update**: The binary can update itself to the latest version from GitHub.
-   **IP Caching**: IP change detection to avoid unnecessary API calls when your IP hasn't changed.
-   **Resilient IP Fetching**: Uses multiple public IP services (`icanhazip.com`, `api.ipify.org`) for redundancy.
-   **Systemd Integration**: Comes with `.service` and `.timer` files for easy setup as a scheduled service on Linux.
-   **Clear Logging**: Provides clean and informative output, suitable for systemd's journal.

## Prerequisites

-   [Bun](https://bun.sh/) installed on your development machine for building the project.
-   An OVH domain with DynHost records configured.

## Getting Started

### 1. Configuration

Create a `config.json` file in the root of the project. You can use `config.json.example` as a template. Add the DynHost credentials and hostnames for each record you want to update.

```json
[
  {
    "username": "your-ovh-username",
    "password": "your-ovh-password",
    "hostname": "your-domain.com"
  },
  {
    "username": "another-user",
    "password": "another-password",
    "hostname": "sub.another-domain.com"
  }
]
```

### 2. Build

Install the development dependencies and build the executable:

```bash
bun install
bun run build
```

This will create a single binary file named `ovh-dynhost-updater` in the project directory.

To build for all supported platforms (Linux, Windows, macOS), run:

```bash
bun run build:all
```

This will generate binaries for each target in the project root.

### 3. Manual Execution (Optional)

You can run the updater manually to test your configuration:

```bash
./ovh-dynhost-updater
```

## IP Caching Functionality

The OVH DynHost Updater includes intelligent IP caching to minimize unnecessary API calls and improve efficiency:

### How It Works

- **Automatic IP Detection**: The tool checks your current external IP address using multiple reliable services.
- **Change Detection**: It compares your current IP with the last known IP stored in a cache file (`last_ip.txt`).
- **Smart Updates**: Only performs DynHost updates when your IP address has actually changed.
- **Bandwidth Saving**: Reduces API calls to OVH when your IP is stable, saving bandwidth and reducing server load.


### Command Line Options

```bash
# Normal operation - only updates if IP has changed
./ovh-dynhost-updater

# Force update even if IP hasn't changed
./ovh-dynhost-updater --force

# Self-update to latest version
./ovh-dynhost-updater --self-update

# Development mode: show OVH update URL and raw response in console
./ovh-dynhost-updater --dev
```

#### --dev Option

When running with `--dev`, the updater will print the OVH update URL and the raw response from OVH to the console for each DynHost update. This is useful for debugging and development, allowing you to see exactly what is sent to and received from the OVH API.

### Cache Behavior

- **First Run**: Creates a new cache file and performs the update.
- **Subsequent Runs**: Compares current IP with cached IP and only updates if different.
- **Cache Location**: The `last_ip.txt` file is created in the working directory (same location as `config.json`).
- **Error Handling**: If the cache file can't be read or written, the tool gracefully falls back to always updating.

### Example Output

```
Successfully retrieved IP from https://ipv4.icanhazip.com: 203.0.113.45
IP unchanged: 203.0.113.45
IP has not changed. Skipping DynHost updates.
Use --force to update anyway.
```

When IP changes:
```
Successfully retrieved IP from https://ipv4.icanhazip.com: 203.0.113.46
IP has changed from 203.0.113.45 to 203.0.113.46
IP has changed. Proceeding with DynHost updates...
SUCCESS: Record for example.com updated to 203.0.113.46
All records updated successfully.
```

## Systemd Service Installation

For automatic updates, you can install the provided systemd service and timer.

### Easy Installation (Linux)

On a Linux system, you can use the `install.sh` script to automate the entire process. It will download the latest release, set up the directories, and configure systemd.

```bash
curl -sL https://raw.githubusercontent.com/sainf/OvhDynHost/master/install.sh | sudo bash
```

### Manual Installation

#### 1. Copy Files

Copy the compiled binary and the configuration file to appropriate system locations.


```bash
# Copy the binary to a directory in your PATH
sudo cp ovh-dynhost-updater /usr/local/bin/

# Create a directory for the config and copy it
sudo mkdir -p /etc/ovh-dynhost
sudo cp config.json /etc/ovh-dynhost/config.json
```

### 2. Configure the Service

Edit the `ovh-dynhost.service` file to set the correct paths.

-   `ExecStart`: Should point to the location of your binary (e.g., `/usr/local/bin/ovh-dynhost-updater`).
-   `WorkingDirectory`: Should point to the directory containing your `config.json` (e.g., `/etc/ovh-dynhost`).

The provided service file looks like this:

```ini
[Unit]
Description=OVH DynHost Updater Service
Wants=ovh-dynhost.timer

[Service]
Type=oneshot
ExecStart=/usr/local/bin/ovh-dynhost-updater
WorkingDirectory=/etc/ovh-dynhost

[Install]
WantedBy=multi-user.target
```

### 3. Install and Start the Timer

Copy the service and timer files to the systemd directory, then enable and start the timer.

```bash
# Copy the systemd files
sudo cp ovh-dynhost.service /etc/systemd/system/
sudo cp ovh-dynhost.timer /etc/systemd/system/

# Reload the systemd daemon, enable and start the timer
sudo systemctl daemon-reload
sudo systemctl enable --now ovh-dynhost.timer
```

The timer is configured to run the service every 15 minutes by default. You can change this by editing the `OnCalendar` value in `ovh-dynhost.timer`.

### 4. Check the Logs

You can view the logs of the service using `journalctl`:

```bash
# View all logs for the service
journalctl -u ovh-dynhost.service

# Follow the logs in real-time
journalctl -f -u ovh-dynhost.service
```

## Updating

The application includes a self-update mechanism to easily upgrade to the latest version.

```bash
# If you installed using the install.sh script
/opt/ovh-dynhost-updater/ovh-dynhost-updater --self-update

# Or if you placed it elsewhere
/path/to/your/ovh-dynhost-updater --self-update
```

This command will check for a new release on GitHub, download the correct binary for your system, and replace the current executable.

## Development

For development, you can run the script directly with Bun without compiling it first. This allows for faster testing cycles.

```bash
bun run dev
```

### Node.js Compatibility

The script is also compatible with Node.js (v18 or newer). You can run it directly using `tsx` (a tool for executing TypeScript with Node.js) or by first compiling it to JavaScript.

To run with `tsx`:
```bash
# First, install tsx if you haven't already
npm install -g tsx

# Then run the script
tsx src/index.ts
```

Developed with the assistance of GitHub Copilot.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Releasing

This project uses the [GitHub CLI (`gh`)](https://cli.github.com/) to create releases.

1.  Make sure you have `gh` installed and authenticated (`gh auth login`).
2.  Commit your changes.
3.  Run the release script:

```bash
bun run release
```

This will build all binaries, create a new GitHub release with the version from `package.json`, generate release notes, and upload the binaries as release assets.
