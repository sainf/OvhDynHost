#!/usr/bin/env bun

import { promises as fs } from 'fs';
import path from 'path';
import semver from 'semver';
import { version } from '../package.json';

// Only use colors if the output is a TTY
const isTTY = process.stdout.isTTY;
const colors = {
    red: isTTY ? '\x1b[31m' : '',
    green: isTTY ? '\x1b[32m' : '',
    yellow: isTTY ? '\x1b[33m' : '',
    reset: isTTY ? '\x1b[0m' : '',
};

const IP_SERVICES = [
    "https://ipv4.icanhazip.com",
    "https://api.ipify.org",
];

const OVH_API_URL = "https://www.ovh.com/nic/update";
const REPO = "sainf/OvhDynHost"; // If forked, replace with your GitHub repository

interface DynHostRecord {
    username: string;
    password: string;
    hostname: string;
}

async function getPublicIp(): Promise<string> {
    for (const url of IP_SERVICES) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch IP from ${url}: ${response.statusText}`);
            }
            const ip = (await response.text()).trim();
            console.log(`Successfully retrieved IP from ${url}: ${ip}`);
            return ip;
        } catch (error) {
            console.error(`Error fetching IP from ${url}:`, error);
        }
    }
    throw new Error("All IP services failed.");
}

async function updateDynHost(record: DynHostRecord, ip: string): Promise<boolean> {
    const { username, password, hostname } = record;
    const url = new URL(OVH_API_URL);
    url.searchParams.set("system", "dyndns");
    url.searchParams.set("hostname", hostname);
    url.searchParams.set("myip", ip);

    const headers = new Headers();
    headers.set('Authorization', 'Basic ' + btoa(`${username}:${password}`));
    headers.set('User-Agent', `ovh-dynhost-updater/1.0.0`);

    try {
        const response = await fetch(url.toString(), { headers });
        const responseText = (await response.text()).trim();

        if (!response.ok) {
            let errorMessage = `Failed to update DynHost for ${hostname}: ${response.statusText}`;
            try {
                const errorJson = JSON.parse(responseText);
                if (errorJson.message) {
                    errorMessage += ` - ${errorJson.message}`;
                }
            } catch (e) {
                // Not a JSON response, just append the raw text
                errorMessage += ` - ${responseText}`;
            }
            console.error(`${colors.red}ERROR: ${errorMessage}${colors.reset}`);
            return false;
        }

        const [status, responseIp] = responseText.split(' ');

        if (status === 'good') {
            console.log(`${colors.green}SUCCESS: Record for ${hostname} updated to ${responseIp}${colors.reset}`);
        } else if (status.startsWith('nochg')) {
            console.log(`${colors.yellow}NOCHANGE: Record for ${hostname} is already up-to-date with IP ${responseIp}${colors.reset}`);
        } else {
            console.log(`INFO: OVH response for ${hostname}: ${responseText}`);
        }
        return true;
    } catch (error) {
        console.error(`${colors.red}ERROR: Error updating DynHost for ${hostname}:${colors.reset}`, error);
        return false;
    }
}

async function selfUpdate() {
    console.log("Checking for updates...");

    try {
        const response = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`);
        if (!response.ok) {
            throw new Error(`Failed to fetch latest release: ${response.statusText}`);
        }

        const release = await response.json();
        const latestVersion = release.tag_name.replace('v', '');

        if (semver.gt(latestVersion, version)) {
            console.log(`A new version (${latestVersion}) is available. Current version is ${version}.`);
            
            const platform = process.platform;
            const arch = process.arch;
            let assetName;

            if (platform === 'linux') {
                assetName = `ovh-dynhost-updater-linux-x64`;
            } else if (platform === 'win32') {
                assetName = `ovh-dynhost-updater-windows-x64.exe`;
            } else if (platform === 'darwin') {
                assetName = arch === 'arm64' ? `ovh-dynhost-updater-darwin-aarch64` : `ovh-dynhost-updater-darwin-x64`;
            } else {
                console.error("Unsupported platform for self-update.");
                return;
            }

            const asset = release.assets.find((a: any) => a.name === assetName);
            if (!asset) {
                console.error(`Could not find a binary for your platform (${platform}-${arch}) in the latest release.`);
                return;
            }

            console.log("Downloading new version...");
            const assetResponse = await fetch(asset.browser_download_url);
            const newBinary = await assetResponse.arrayBuffer();

            const executablePath = process.execPath;
            
            // Create a temporary file to avoid overwriting the current executable directly
            const tempPath = executablePath + ".tmp";
            await fs.writeFile(tempPath, Buffer.from(newBinary));
            await fs.chmod(tempPath, 0o755);

            // Replace the current executable with the new one
            await fs.rename(tempPath, executablePath);

            console.log("Update successful! Please restart the application.");

        } else {
            console.log("You are already on the latest version.");
        }
    } catch (error) {
        console.error("Failed to check for updates:", error);
    }
}

async function main() {
    if (process.argv.includes('--self-update')) {
        await selfUpdate();
        return;
    }

    let allUpdatesSucceeded = true;
    try {
        const configPath = path.resolve(process.cwd(), 'config.json');
        const configFile = await fs.readFile(configPath, 'utf-8');
        const records: DynHostRecord[] = JSON.parse(configFile);

        if (!records.length) {
            console.log("No records found in config.json. Exiting.");
            return;
        }

        const ip = await getPublicIp();

        for (const record of records) {
            const success = await updateDynHost(record, ip);
            if (!success) {
                allUpdatesSucceeded = false;
            }
        }

    } catch (error: any) {
        allUpdatesSucceeded = false;
        if (error.code === 'ENOENT') {
            console.error("Error: Could not find 'config.json' in the current directory.");
            console.error("Please create a 'config.json' file with the following format:");
            console.error(JSON.stringify([
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
            ], null, 2));
        } else {
            console.error("An unexpected error occurred:", error);
        }
    } finally {
        if (!allUpdatesSucceeded) {
            console.log("\nFinished with errors.");
            process.exit(1);
        } else {
            console.log("\nAll records updated successfully.");
        }
    }
}

main();
