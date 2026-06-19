import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/hotspot/revenue/record-login
 * Called from RouterOS on-login script to record user login for revenue tracking.
 * Body: { username, profile, comment }
 */
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { username, profile, comment } = body;

		if (!username || !profile) {
			return NextResponse.json(
				{ error: "username and profile are required" },
				{ status: 400 },
			);
		}

		// Extract router ID from comment or find first router with matching profile
		// If comment contains price marker (e.g., "up-123-06.19.26-5000"),
		// parse the price and save transaction
		const priceMatch = comment?.match(/-(\d+)$/);
		const price = priceMatch ? Number.parseInt(priceMatch[1], 10) : 0;

		if (price > 0) {
			// Find profile to get routerId
			let routerId = "";
			const cachedRouterId = request.headers.get("x-router-id");

			if (cachedRouterId) {
				routerId = cachedRouterId;
			} else {
				// Find any router that has this profile
				const profileRecord = await prisma.hotspotProfile.findFirst({
					where: { name: profile },
				});
				routerId = profileRecord?.routerId || "";
			}

			if (routerId) {
				// Check if transaction already exists for this username (dedup)
				const existing = await prisma.hotspotTransaction.findFirst({
					where: { username, status: "active" },
				});

				if (!existing) {
					await prisma.hotspotTransaction.create({
						data: {
							routerId,
							username,
							profileName: profile,
							price,
							batchComment: comment?.split("-5000")[0] || comment,
							recordedBy: "auto",
						},
					});
				}
			}
		}

		return NextResponse.json({ success: true });
	} catch (error: unknown) {
		const msg = error instanceof Error ? error.message : "Unknown error";
		console.error("[record-login] Error:", msg);
		// Don't fail — RouterOS script shouldn't block login
		return NextResponse.json({ success: true, note: msg });
	}
}
