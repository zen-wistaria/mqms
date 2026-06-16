import { NextResponse } from "next/server";
import { pollAllRouters } from "@/worker/poller";

// POST /api/cron/poll — Manually trigger poll cycle
export async function POST() {
	try {
		await pollAllRouters();
		return NextResponse.json({
			success: true,
			message: "Poll cycle completed",
		});
	} catch (error) {
		console.error("Manual poll failed:", error);
		return NextResponse.json(
			{ error: "Poll cycle failed", message: String(error) },
			{ status: 500 },
		);
	}
}
