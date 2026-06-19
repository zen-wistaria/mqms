import { NextResponse } from "next/server";
import { requireRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
	generateServerConfig,
	startWireguard,
	writeConfig,
} from "@/lib/wireguard";

// POST /api/vpn/config/start — start wireguard
export async function POST() {
	try {
		await requireRole("admin");

		const config = await prisma.wireguardConfig.findUnique({
			where: { id: "default" },
		});
		if (!config) {
			return NextResponse.json(
				{ error: "WireGuard not initialized. Create config first." },
				{ status: 400 },
			);
		}

		// Ensure config file is up-to-date
		const peers = await prisma.wireguardPeer.findMany();
		const cfgStr = generateServerConfig(config, peers);
		writeConfig(cfgStr);

		const result = startWireguard();
		if (!result.success) {
			return NextResponse.json({ error: result.message }, { status: 500 });
		}

		return NextResponse.json({ success: true, message: result.message });
	} catch (error: unknown) {
		if (error instanceof Response) return error;
		const msg = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
