import { NextResponse } from "next/server";
import { syncAllRouters } from "@/worker/syncer";

// POST /api/cron/sync — Manually trigger sync cycle
export async function POST() {
	try {
		await syncAllRouters();
		return NextResponse.json({
			success: true,
			message: "Sync cycle completed",
		});
	} catch (error) {
		console.error("Manual sync failed:", error);
		return NextResponse.json(
			{ error: "Sync cycle failed", message: String(error) },
			{ status: 500 },
		);
	}
}
