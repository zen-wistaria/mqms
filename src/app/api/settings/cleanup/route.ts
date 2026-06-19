import { type NextRequest, NextResponse } from "next/server";
import { getAccessibleRouterIds, getCurrentUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

// POST /api/settings/cleanup — Delete old history records
export async function POST(request: NextRequest) {
	try {
		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const body = await request.json();
		const { before, routerId } = body;

		if (!before) {
			return NextResponse.json(
				{ error: "Missing 'before' date parameter" },
				{ status: 400 },
			);
		}

		const cutoffDate = new Date(before);
		const accessibleRouterIds = await getAccessibleRouterIds(user.id);

		// Determine which router IDs to delete
		let targetRouterIds: string[];

		if (routerId === "own") {
			// Non-admin: only their accessible routers
			targetRouterIds = accessibleRouterIds;
		} else if (routerId && routerId !== "all") {
			// Admin: specific router
			if (user.role !== "admin") {
				return NextResponse.json({ error: "Forbidden" }, { status: 403 });
			}
			if (!accessibleRouterIds.includes(routerId)) {
				return NextResponse.json(
					{ error: "Router not found" },
					{ status: 404 },
				);
			}
			targetRouterIds = [routerId];
		} else {
			// Admin: all routers
			if (user.role !== "admin") {
				// Non-admin without specific router = own routers
				targetRouterIds = accessibleRouterIds;
			} else {
				targetRouterIds = accessibleRouterIds; // all
			}
		}

		const result = await prisma.queueHistory.deleteMany({
			where: {
				timestamp: { lt: cutoffDate },
				routerId: { in: targetRouterIds },
			},
		});

		return NextResponse.json({
			success: true,
			deletedCount: result.count,
			cutoffDate: cutoffDate.toISOString(),
			routerCount: targetRouterIds.length,
		});
	} catch (error) {
		console.error("Failed to cleanup history:", error);
		return NextResponse.json(
			{ error: "Failed to cleanup history" },
			{ status: 500 },
		);
	}
}
