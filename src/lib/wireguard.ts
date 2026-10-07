import fs from "fs";
import { execSync } from "child_process";
import { prisma } from "./prisma";

export interface WireguardConfigData {
	privateKey: string;
	publicKey: string;
	address: string;
	port: number;
	mtu: number;
	dns: string;
	nextIp: number;
}

export interface WireguardPeerData {
	id: string;
	name: string;
	enabled: boolean;
	privateKey: string;
	publicKey: string;
	presharedKey: string | null;
	allowedIPs: string;
	address: string;
	endpoint: string | null;
	persistentKeepalive: number;
	transferRx: bigint;
	transferTx: bigint;
	latestHandshakeAt: Date | null;
	comment: string | null;
}

/**
 * Generate WireGuard keypair using wg binary.
 */
export function generateKeypair(): { privateKey: string; publicKey: string } {
	const privateKey = execSync("wg genkey", { encoding: "utf-8" }).trim();
	const publicKey = execSync(`echo "${privateKey}" | wg pubkey`, {
		encoding: "utf-8",
	}).trim();
	return { privateKey, publicKey };
}

/**
 * Generate preshared key.
 */
export function generatePresharedKey(): string {
	return execSync("wg genpsk", { encoding: "utf-8" }).trim();
}

/**
 * Generate wg0.conf content for the server.
 */
export function generateServerConfig(
	config: WireguardConfigData,
	peers: WireguardPeerData[],
): string {
	const enabledPeers = peers.filter((p) => p.enabled);
	const peerSections = enabledPeers
		.map((p) => {
			const psk = p.presharedKey ? `\nPresharedKey = ${p.presharedKey}` : "";
			return `[Peer]
# ${p.name}${p.comment ? ` — ${p.comment}` : ""}
PublicKey = ${p.publicKey}${psk}
AllowedIPs = ${p.allowedIPs}`;
		})
		.join("\n\n");

	return `[Interface]
Address = ${config.address}
PrivateKey = ${config.privateKey}
ListenPort = ${config.port}
MTU = ${config.mtu}
# Enable IP forwarding is handled by docker-compose sysctl

${peerSections}
`;
}

/**
 * Generate peer config file content (for download).
 */
export function generatePeerConfig(
	serverConfig: WireguardConfigData,
	peer: WireguardPeerData,
	endpointHost: string,
): string {
	const psk = peer.presharedKey ? `\nPresharedKey = ${peer.presharedKey}` : "";
	return `[Interface]
Address = ${peer.address}
PrivateKey = ${peer.privateKey}
DNS = ${serverConfig.dns}
MTU = ${serverConfig.mtu}

[Peer]
PublicKey = ${serverConfig.publicKey}${psk}
Endpoint = ${endpointHost}:${serverConfig.port}
AllowedIPs = ${peer.allowedIPs}
PersistentKeepalive = ${peer.persistentKeepalive}
`;
}

/**
 * Write wg0.conf to /etc/wireguard/wg0.conf and persistent storage.
 */
export function writeConfig(content: string): void {
	const dir = "/etc/wireguard";
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
	fs.writeFileSync(`${dir}/wg0.conf`, content, "utf-8");

	// Backup to persistent /app/data/wireguard so config survives container restarts
	try {
		const persistentDir = "/app/data/wireguard";
		if (fs.existsSync("/app/data")) {
			if (!fs.existsSync(persistentDir)) {
				fs.mkdirSync(persistentDir, { recursive: true });
			}
			fs.writeFileSync(`${persistentDir}/wg0.conf`, content, "utf-8");
		}
	} catch {}
}

/**
 * Start wireguard interface.
 */
export function startWireguard(): { success: boolean; message: string } {
	try {
		// Clean up any stale/lingering wg0 state before starting
		try {
			execSync("wg-quick down wg0", {
				stdio: "ignore",
				shell: "/bin/sh",
			});
		} catch {}
		try {
			execSync("ip link delete wg0", {
				stdio: "ignore",
				shell: "/bin/sh",
			});
		} catch {}

		execSync("wg-quick up wg0", {
			encoding: "utf-8",
			shell: "/bin/sh",
			stdio: ["ignore", "pipe", "pipe"],
		});
		return { success: true, message: "WireGuard started" };
	} catch (error: any) {
		const stderr = error.stderr ? error.stderr.toString().trim() : "";
		const stdout = error.stdout ? error.stdout.toString().trim() : "";
		const message = stderr || stdout || error.message || "Failed to start WireGuard";
		console.error("[WireGuard] Failed to start:", message);
		return { success: false, message };
	}
}

/**
 * Stop wireguard interface.
 */
export function stopWireguard(): { success: boolean; message: string } {
	try {
		execSync("wg-quick down wg0", {
			encoding: "utf-8",
			shell: "/bin/sh",
			stdio: ["ignore", "pipe", "pipe"],
		});
		try {
			if (fs.existsSync("/etc/wireguard/wg0.conf")) {
				fs.unlinkSync("/etc/wireguard/wg0.conf");
			}
			if (fs.existsSync("/app/data/wireguard/wg0.conf")) {
				fs.unlinkSync("/app/data/wireguard/wg0.conf");
			}
		} catch {}
		return { success: true, message: "WireGuard stopped" };
	} catch (error: any) {
		// Force delete link if wg-quick down encountered an issue
		try {
			execSync("ip link delete wg0", {
				stdio: "ignore",
				shell: "/bin/sh",
			});
			try {
				if (fs.existsSync("/etc/wireguard/wg0.conf")) {
					fs.unlinkSync("/etc/wireguard/wg0.conf");
				}
				if (fs.existsSync("/app/data/wireguard/wg0.conf")) {
					fs.unlinkSync("/app/data/wireguard/wg0.conf");
				}
			} catch {}
			return { success: true, message: "WireGuard stopped" };
		} catch {}
		const stderr = error.stderr ? error.stderr.toString().trim() : "";
		const message = stderr || error.message || "Failed to stop WireGuard";
		return { success: false, message };
	}
}

/**
 * Check if wireguard interface is running.
 */
export function isWireguardRunning(): boolean {
	try {
		// Fast check on Linux: check /sys/class/net/wg0 directly without child process
		if (fs.existsSync("/sys/class/net")) {
			return fs.existsSync("/sys/class/net/wg0");
		}
		const out = execSync("wg show wg0", {
			encoding: "utf-8",
			stdio: ["ignore", "pipe", "ignore"],
			shell: "/bin/sh",
		});
		return out.includes("interface: wg0");
	} catch {
		return false;
	}
}

/**
 * Dynamically synchronize live wireguard interface with current configuration.
 */
export function syncWireguardConfig(): void {
	if (!isWireguardRunning()) return;
	try {
		// Portable across dash and bash: pipe stripped config into wg syncconf via stdin
		execSync("wg-quick strip wg0 | wg syncconf wg0 /dev/stdin", {
			stdio: "ignore",
			shell: "/bin/sh",
		});
	} catch (error) {
		console.warn("[WireGuard] Failed to sync live config:", error);
	}
}

/**
 * Parse wg show output to update peer status in DB.
 * Returns transfer and handshake data keyed by public key.
 */
export interface WireguardStatus {
	running: boolean;
	peers: Map<
		string,
		{ transferRx: bigint; transferTx: bigint; latestHandshake: Date | null }
	>;
}

export function getWireguardStatus(): WireguardStatus {
	const result: WireguardStatus = { running: false, peers: new Map() };
	if (!isWireguardRunning()) {
		return result;
	}
	try {
		const out = execSync("wg show wg0 dump", {
			encoding: "utf-8",
			stdio: ["ignore", "pipe", "ignore"],
			shell: "/bin/sh",
		});
		const lines = out.trim().split("\n");
		if (lines.length === 0) return result;

		result.running = true;

		// First line is interface info, skip it
		for (let i = 1; i < lines.length; i++) {
			const parts = lines[i].split("\t");
			if (parts.length >= 6) {
				// Format: publicKey	presharedKey	endpoint	allowedIPs	latestHandshake	transferRx	transferTx	persistentKeepalive
				const publicKey = parts[0];
				const latestHandshake = Number.parseInt(parts[4]);
				const transferRx = BigInt(parts[5] || "0");
				const transferTx = BigInt(parts[6] || "0");

				result.peers.set(publicKey, {
					transferRx,
					transferTx,
					latestHandshake:
						latestHandshake > 0 ? new Date(latestHandshake * 1000) : null,
				});
			}
		}
	} catch {
		// not running
	}
	return result;
}

/**
 * Sync peer status from wg dump to database.
 */
export async function syncPeerStatus(): Promise<void> {
	const status = getWireguardStatus();
	if (!status.running) return;

	for (const [publicKey, data] of status.peers) {
		await prisma.wireguardPeer.updateMany({
			where: { publicKey },
			data: {
				transferRx: data.transferRx,
				transferTx: data.transferTx,
				latestHandshakeAt: data.latestHandshake,
			},
		});
	}
}

/**
 * Auto-assign next available tunnel IP.
 */
export function getNextIp(octet: number): string {
	return `10.0.0.${octet}/32`;
}
