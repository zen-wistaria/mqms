import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/settings/cleanup — Delete old history records
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { before } = body;

		if (!before) {
			return NextResponse.json(
				{ error: "Missing 'before' date parameter" },
				{ status: 400 },
			);
		}

		const cutoffDate = new Date(before);

		const result = await prisma.queueHistory.deleteMany({
			where: {
				timestamp: {
					lt: cutoffDate,
				},
			},
		});

		return NextResponse.json({
			success: true,
			deletedCount: result.count,
			cutoffDate: cutoffDate.toISOString(),
		});
	} catch (error) {
		console.error("Failed to cleanup history:", error);
		return NextResponse.json(
			{ error: "Failed to cleanup history" },
			{ status: 500 },
		);
	}
}
