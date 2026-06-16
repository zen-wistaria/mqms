import { type NextRequest, NextResponse } from "next/server";
import { serializeBigInt } from "@/lib/format";
import { prisma } from "@/lib/prisma";

// GET /api/queues — List all queues
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const routerId = searchParams.get("routerId");
		const showDeleted = searchParams.get("showDeleted") === "true";

		const where: Record<string, unknown> = {};
		if (routerId) where.routerId = routerId;
		if (!showDeleted) where.isDeleted = false;

		const queues = await prisma.queue.findMany({
			where,
			orderBy: { name: "asc" },
			include: {
				router: {
					select: { id: true, name: true, status: true },
				},
				histories: {
					orderBy: { timestamp: "desc" },
					take: 1,
					select: {
						uploadBytes: true,
						downloadBytes: true,
						totalBytes: true,
						rateUpload: true,
						rateDownload: true,
						packetRate: true,
						timestamp: true,
					},
				},
			},
		});

		return NextResponse.json(serializeBigInt(queues));
	} catch (error) {
		console.error("Failed to fetch queues:", error);
		return NextResponse.json(
			{ error: "Failed to fetch queues" },
			{ status: 500 },
		);
	}
}
