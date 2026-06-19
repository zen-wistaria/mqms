import { type NextRequest, NextResponse } from "next/server";
import { serializeBigInt } from "@/lib/format";
import { getAccessibleRouterIdsOrThrow } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

// GET /api/queues — List all queues (filtered by accessible routers)
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const routerIdParam = searchParams.get("routerId");
		const showDeleted = searchParams.get("showDeleted") === "true";
		const filter = searchParams.get("filter") || "total";

		const { user, routerIds } = await getAccessibleRouterIdsOrThrow();

		const where: Record<string, unknown> = {};

		// If specific routerId requested, check access
		if (routerIdParam && routerIdParam !== "all") {
			if (!routerIds.includes(routerIdParam)) {
				return NextResponse.json({ error: "Forbidden" }, { status: 403 });
			}
			where.routerId = routerIdParam;
		} else if (user.role !== "admin") {
			// Non-admin: only show queues from accessible routers
			where.routerId = { in: routerIds };
		}

		if (!showDeleted) where.isDeleted = false;

		const queues = await prisma.queue.findMany({
			where,
			orderBy: { name: "asc" },
			include: {
				router: {
					select: { id: true, name: true, status: true },
				},
			},
		});

		let startDate: Date | undefined;
		let endDate: Date | undefined;

		if (filter !== "total") {
			const [year, month] = filter.split("-").map(Number);
			startDate = new Date(year, month - 1, 1);
			endDate = new Date(year, month, 1);
		}

		const result = [];

		for (const queue of queues) {
			let qUpload = BigInt(0);
			let qDownload = BigInt(0);
			let qTotal = BigInt(0);
			let rateUpload: string | null = null;
			let rateDownload: string | null = null;

			if (filter === "total") {
				const lastRecord = await prisma.queueHistory.findFirst({
					where: { queueId: queue.id },
					orderBy: { timestamp: "desc" },
					select: {
						uploadBytes: true,
						downloadBytes: true,
						totalBytes: true,
						rateUpload: true,
						rateDownload: true,
					},
				});

				if (lastRecord) {
					qUpload = lastRecord.uploadBytes;
					qDownload = lastRecord.downloadBytes;
					qTotal = lastRecord.totalBytes;
					rateUpload = lastRecord.rateUpload;
					rateDownload = lastRecord.rateDownload;
				}
			} else {
				const records = await prisma.queueHistory.findMany({
					where: {
						queueId: queue.id,
						timestamp: { gte: startDate, lt: endDate },
					},
					orderBy: { timestamp: "asc" },
					select: {
						uploadBytes: true,
						downloadBytes: true,
						rateUpload: true,
						rateDownload: true,
					},
				});

				if (records.length >= 2) {
					for (let i = 1; i < records.length; i++) {
						let uploadDelta =
							records[i].uploadBytes - records[i - 1].uploadBytes;
						let downloadDelta =
							records[i].downloadBytes - records[i - 1].downloadBytes;

						if (uploadDelta < BigInt(0)) uploadDelta = records[i].uploadBytes;
						if (downloadDelta < BigInt(0))
							downloadDelta = records[i].downloadBytes;

						qUpload += uploadDelta;
						qDownload += downloadDelta;
					}
					qTotal = qUpload + qDownload;

					const lastRec = records[records.length - 1];
					rateUpload = lastRec.rateUpload;
					rateDownload = lastRec.rateDownload;
				} else if (records.length === 1) {
					const lastRec = records[0];
					rateUpload = lastRec.rateUpload;
					rateDownload = lastRec.rateDownload;
				}
			}

			result.push({
				...queue,
				uploadBytes: Number(qUpload),
				downloadBytes: Number(qDownload),
				totalBytes: Number(qTotal),
				rateUpload,
				rateDownload,
			});
		}

		return NextResponse.json(serializeBigInt(result));
	} catch (error: unknown) {
		if (error instanceof Response) return error;
		console.error("Failed to fetch queues:", error);
		return NextResponse.json(
			{ error: "Failed to fetch queues" },
			{ status: 500 },
		);
	}
}
