import { type NextRequest, NextResponse } from "next/server";
import { serializeBigInt } from "@/lib/format";
import { prisma } from "@/lib/prisma";

interface RouteParams {
	params: Promise<{ id: string }>;
}

// GET /api/routers/:id/queues — Get queues for a specific router
export async function GET(_request: NextRequest, { params }: RouteParams) {
	try {
		const { id } = await params;

		const queues = await prisma.queue.findMany({
			where: { routerId: id, isDeleted: false },
			orderBy: { name: "asc" },
			include: {
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
		console.error("Failed to fetch router queues:", error);
		return NextResponse.json(
			{ error: "Failed to fetch router queues" },
			{ status: 500 },
		);
	}
}
