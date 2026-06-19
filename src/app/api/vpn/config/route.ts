import { type NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
	generateKeypair,
	generateServerConfig,
	getWireguardStatus,
	isWireguardRunning,
	writeConfig,
} from "@/lib/wireguard";

// GET /api/vpn/config — get server config + status
export async function GET() {
	try {
		await requireRole("admin");

		const config = await prisma.wireguardConfig.findUnique({
			where: { id: "default" },
		});

		if (!config) {
			return NextResponse.json({ initialized: false });
		}

		const running = isWireguardRunning();
		const status = running ? getWireguardStatus() : null;

		return NextResponse.json({
			initialized: true,
			running,
			config: {
				publicKey: config.publicKey,
				address: config.address,
				port: config.port,
				mtu: config.mtu,
				dns: config.dns,
				nextIp: config.nextIp,
			},
			peers: status?.peers
				? Array.from(status.peers.entries()).map(([pubkey, data]) => ({
						publicKey: pubkey,
						transferRx: data.transferRx.toString(),
						transferTx: data.transferTx.toString(),
						latestHandshake: data.latestHandshake?.toISOString() || null,
					}))
				: [],
		});
	} catch (error: unknown) {
		if (error instanceof Response) return error;
		const msg = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}

// POST /api/vpn/config — init/update wireguard server config
export async function POST(request: NextRequest) {
	try {
		await requireRole("admin");

		const body = await request.json();
		let config = await prisma.wireguardConfig.findUnique({
			where: { id: "default" },
		});

		if (!config) {
			// First time — generate keys
			const keys = generateKeypair();
			config = await prisma.wireguardConfig.create({
				data: {
					id: "default",
					privateKey: keys.privateKey,
					publicKey: keys.publicKey,
					address: body.address || "10.0.0.1/24",
					port: body.port || 51820,
					mtu: body.mtu || 1420,
					dns: body.dns || "10.0.0.1",
				},
			});

			// Write config
			const peers = await prisma.wireguardPeer.findMany();
			const cfgStr = generateServerConfig(config, peers);
			writeConfig(cfgStr);

			return NextResponse.json({
				success: true,
				message: "WireGuard initialized",
				config: {
					publicKey: config.publicKey,
					address: config.address,
					port: config.port,
				},
			});
		}

		// Update existing config
		const updateData: Record<string, unknown> = {};
		if (body.port) updateData.port = body.port;
		if (body.mtu) updateData.mtu = body.mtu;
		if (body.dns) updateData.dns = body.dns;

		if (Object.keys(updateData).length > 0) {
			config = await prisma.wireguardConfig.update({
				where: { id: "default" },
				data: updateData,
			});

			// Re-write config
			const peers = await prisma.wireguardPeer.findMany();
			const cfgStr = generateServerConfig(config, peers);
			writeConfig(cfgStr);
		}

		return NextResponse.json({ success: true, message: "Config updated" });
	} catch (error: unknown) {
		if (error instanceof Response) return error;
		const msg = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
