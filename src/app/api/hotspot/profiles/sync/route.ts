import { type NextRequest, NextResponse } from "next/server";
import { executeRestCommand } from "@/lib/mikrotik";
import { prisma } from "@/lib/prisma";

async function getRouterConfig(routerId: string) {
	const router = await prisma.router.findUnique({ where: { id: routerId } });
	if (!router) throw new Error("Router not found");
	return {
		ipAddress: router.ipAddress,
		port: router.port,
		useSSL: router.useSSL,
		username: router.username,
		password: router.password,
	};
}

/**
 * POST /api/hotspot/profiles/sync
 * Sync RouterOS hotspot profiles into local DB (upsert by routerId + name).
 * Only sets basic fields; Mikhmon metadata fields are preserved if already set.
 */
export async function POST(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const routerId = searchParams.get("routerId");
		if (!routerId) throw new Error("Router ID is required");

		const config = await getRouterConfig(routerId);

		const result = await executeRestCommand(
			config,
			"GET",
			"/ip/hotspot/user/profile",
		);
		if (!result.success) {
			return NextResponse.json({ error: result.error }, { status: 500 });
		}

		const routerosProfiles = (result.data as any[]) || [];
		let created = 0;
		let updated = 0;

		for (const rp of routerosProfiles) {
			const existing = await prisma.hotspotProfile.findUnique({
				where: {
					routerId_name: {
						routerId,
						name: rp.name,
					},
				},
			});

			const sharedUsers = Number.parseInt(rp["shared-users"], 10) || 1;

			if (existing) {
				// Only update basic fields, preserve Mikhmon metadata
				await prisma.hotspotProfile.update({
					where: { id: existing.id },
					data: {
						sharedUsers,
						rateLimit: rp["rate-limit"] || null,
						addressPool: rp["address-pool"] || null,
						macCookie: rp["mac-cookie-timeout"] ? true : false,
						server: rp.server || "all",
					},
				});
				updated++;
			} else {
				await prisma.hotspotProfile.create({
					data: {
						name: rp.name,
						routerId,
						sharedUsers,
						rateLimit: rp["rate-limit"] || null,
						addressPool: rp["address-pool"] || null,
						macCookie: rp["mac-cookie-timeout"] ? true : false,
						server: rp.server || "all",
					},
				});
				created++;
			}
		}

		return NextResponse.json({
			success: true,
			message: `Synced: ${created} created, ${updated} updated`,
			created,
			updated,
		});
	} catch (error: unknown) {
		if (error instanceof Response) return error;
		const msg = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
