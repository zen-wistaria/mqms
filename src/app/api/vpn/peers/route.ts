import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import {
	generateKeypair,
	generatePresharedKey,
	generateServerConfig,
	writeConfig,
	getNextIp,
	isWireguardRunning,
} from "@/lib/wireguard";

// GET /api/vpn/peers — list all peers
export async function GET() {
	try {
		await requireRole("admin");

		const peers = await prisma.wireguardPeer.findMany({
			orderBy: { createdAt: "desc" },
		});

		return NextResponse.json(
			peers.map((p) => ({
				...p,
				transferRx: p.transferRx.toString(),
				transferTx: p.transferTx.toString(),
				latestHandshakeAt: p.latestHandshakeAt?.toISOString() || null,
				// Don't expose privateKey to client
				privateKey: undefined,
			})),
		);
	} catch (error: unknown) {
		if (error instanceof Response) return error;
		const msg = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}

// POST /api/vpn/peers — create new peer
export async function POST(request: NextRequest) {
	try {
		await requireRole("admin");
		const { name, comment } = await request.json();

		if (!name?.trim()) {
			return NextResponse.json(
				{ error: "Name is required" },
				{ status: 400 },
			);
		}

		// Get server config
		const config = await prisma.wireguardConfig.findUnique({
			where: { id: "default" },
		});
		if (!config) {
			return NextResponse.json(
				{ error: "WireGuard not initialized. Create config first." },
				{ status: 400 },
			);
		}

		// Generate keys
		const keys = generateKeypair();
		const psk = generatePresharedKey();

		// Assign next IP
		const address = getNextIp(config.nextIp);
		const allowedIPs = `10.0.0.${config.nextIp}/32`;

		const peer = await prisma.wireguardPeer.create({
			data: {
				name: name.trim(),
				comment: comment?.trim() || null,
				privateKey: keys.privateKey,
				publicKey: keys.publicKey,
				presharedKey: psk,
				address,
				allowedIPs,
			},
		});

		// Increment next IP
		await prisma.wireguardConfig.update({
			where: { id: "default" },
			data: { nextIp: config.nextIp + 1 },
		});

		// Re-generate server config and write
		const allPeers = await prisma.wireguardPeer.findMany();
		const cfgStr = generateServerConfig(config, allPeers);
		writeConfig(cfgStr);

		// If running, sync config
		if (isWireguardRunning()) {
			try {
				const { execSync } = await import("child_process");
				execSync("wg syncconf wg0 <(wg-quick strip wg0)", {
					stdio: "pipe",
				});
			} catch {
				// if syncconf fails, restart might be needed
			}
		}

		return NextResponse.json(
			{
				id: peer.id,
				name: peer.name,
				publicKey: peer.publicKey,
				address: peer.address,
			},
			{ status: 201 },
		);
	} catch (error: unknown) {
		if (error instanceof Response) return error;
		const msg = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
