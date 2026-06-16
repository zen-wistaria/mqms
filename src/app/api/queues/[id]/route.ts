import { type NextRequest, NextResponse } from "next/server";
import { serializeBigInt } from "@/lib/format";
import { prisma } from "@/lib/prisma";

interface RouteParams {
	params: Promise<{ id: string }>;
}

// GET /api/queues/:id — Queue detail with latest stats
export async function GET(_request: NextRequest, { params }: RouteParams) {
	try {
		const { id } = await params;

		const queue = await prisma.queue.findUnique({
			where: { id },
			include: {
				router: {
					select: { id: true, name: true, ipAddress: true, status: true },
				},
				histories: {
					orderBy: { timestamp: "desc" },
					take: 1,
				},
			},
		});

		if (!queue) {
			return NextResponse.json({ error: "Queue not found" }, { status: 404 });
		}

		return NextResponse.json(serializeBigInt(queue));
	} catch (error) {
		console.error("Failed to fetch queue:", error);
		return NextResponse.json(
			{ error: "Failed to fetch queue" },
			{ status: 500 },
		);
	}
}
