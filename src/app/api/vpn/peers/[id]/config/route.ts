import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { generatePeerConfig } from "@/lib/wireguard";

// GET /api/vpn/peers/[id]/config?endpoint=<host> — download peer config
export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		await requireRole("admin");
		const { id } = await params;
		const { searchParams } = new URL(request.url);
		const endpoint = searchParams.get("endpoint") || "vpn.example.com";

		const peer = await prisma.wireguardPeer.findUnique({ where: { id } });
		if (!peer) {
			return NextResponse.json({ error: "Peer not found" }, { status: 404 });
		}

		const config = await prisma.wireguardConfig.findUnique({
			where: { id: "default" },
		});
		if (!config) {
			return NextResponse.json(
				{ error: "WireGuard not initialized" },
				{ status: 400 },
			);
		}

		const cfgContent = generatePeerConfig(config, peer, endpoint);

		return new NextResponse(cfgContent, {
			headers: {
				"Content-Type": "text/plain; charset=utf-8",
				"Content-Disposition": `attachment; filename="wg-${peer.name}.conf"`,
			},
		});
	} catch (error: unknown) {
		if (error instanceof Response) return error;
		const msg = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
