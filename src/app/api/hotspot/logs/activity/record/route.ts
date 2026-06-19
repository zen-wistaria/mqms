import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/hotspot/logs/activity/record
 * Called from RouterOS on-login / on-logout script.
 * Body: { username, ipAddress, macAddress, profileName, validity, type, message }
 */
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { username, ipAddress, macAddress, profileName, validity, type, message } = body;

		if (!username || !type) {
			return NextResponse.json(
				{ error: "username and type are required" },
				{ status: 400 },
			);
		}

		if (!["login", "logout"].includes(type)) {
			return NextResponse.json(
				{ error: 'type must be "login" or "logout"' },
				{ status: 400 },
			);
		}

		// Resolve routerId from profile or header
		let routerId = request.headers.get("x-router-id") || "";

		if (!routerId && profileName) {
			const profile = await prisma.hotspotProfile.findFirst({
				where: { name: profileName },
			});
			routerId = profile?.routerId || "";
		}

		if (!routerId) {
			// Fallback: try to find any router that has this user
			const anyLog = await prisma.hotspotActivityLog.findFirst({
				where: { username },
				orderBy: { loggedAt: "desc" },
			});
			routerId = anyLog?.routerId || "";
		}

		await prisma.hotspotActivityLog.create({
			data: {
				routerId,
				username,
				ipAddress: ipAddress || null,
				macAddress: macAddress || null,
				profileName: profileName || null,
				validity: validity || null,
				type,
				message: message || null,
			},
		});

		return NextResponse.json({ success: true });
	} catch (error: unknown) {
		const msg = error instanceof Error ? error.message : "Unknown error";
		console.error("[record-activity] Error:", msg);
		// Never block login/logout
		return NextResponse.json({ success: true, note: msg });
	}
}
