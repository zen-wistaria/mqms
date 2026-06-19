import { type NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
	generateServerConfig,
	isWireguardRunning,
	writeConfig,
} from "@/lib/wireguard";

// PATCH /api/vpn/peers/[id] — update peer
export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		await requireRole("admin");
		const { id } = await params;
		const { name, enabled, comment } = await request.json();

		const peer = await prisma.wireguardPeer.findUnique({ where: { id } });
		if (!peer) {
			return NextResponse.json({ error: "Peer not found" }, { status: 404 });
		}

		const updateData: Record<string, unknown> = {};
		if (name !== undefined) updateData.name = name;
		if (enabled !== undefined) updateData.enabled = enabled;
		if (comment !== undefined) updateData.comment = comment?.trim() || null;

		if (Object.keys(updateData).length > 0) {
			await prisma.wireguardPeer.update({ where: { id }, data: updateData });
		}

		// Re-generate server config
		const config = await prisma.wireguardConfig.findUnique({
			where: { id: "default" },
		});
		if (config) {
			const allPeers = await prisma.wireguardPeer.findMany();
			const cfgStr = generateServerConfig(config, allPeers);
			writeConfig(cfgStr);

			if (isWireguardRunning()) {
				try {
					const { execSync } = await import("child_process");
					execSync("wg syncconf wg0 <(wg-quick strip wg0)", {
						stdio: "pipe",
					});
				} catch {
					// ignore
				}
			}
		}

		return NextResponse.json({ success: true });
	} catch (error: unknown) {
		if (error instanceof Response) return error;
		const msg = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}

// DELETE /api/vpn/peers/[id] — delete peer
export async function DELETE(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		await requireRole("admin");
		const { id } = await params;

		const peer = await prisma.wireguardPeer.findUnique({ where: { id } });
		if (!peer) {
			return NextResponse.json({ error: "Peer not found" }, { status: 404 });
		}

		await prisma.wireguardPeer.delete({ where: { id } });

		// Re-generate server config
		const config = await prisma.wireguardConfig.findUnique({
			where: { id: "default" },
		});
		if (config) {
			const allPeers = await prisma.wireguardPeer.findMany();
			const cfgStr = generateServerConfig(config, allPeers);
			writeConfig(cfgStr);

			if (isWireguardRunning()) {
				try {
					const { execSync } = await import("child_process");
					execSync("wg syncconf wg0 <(wg-quick strip wg0)", {
						stdio: "pipe",
					});
				} catch {
					// ignore
				}
			}
		}

		return NextResponse.json({ success: true });
	} catch (error: unknown) {
		if (error instanceof Response) return error;
		const msg = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
