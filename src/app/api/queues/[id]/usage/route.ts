import { type NextRequest, NextResponse } from "next/server";
import { serializeBigInt } from "@/lib/format";
import { prisma } from "@/lib/prisma";

interface RouteParams {
	params: Promise<{ id: string }>;
}

// GET /api/queues/:id/usage — Monthly usage breakdown
export async function GET(request: NextRequest, { params }: RouteParams) {
	try {
		const { id } = await params;
		const { searchParams } = new URL(request.url);
		const year = Number(
			searchParams.get("year") || new Date().getFullYear().toString(),
		);

		const queue = await prisma.queue.findUnique({ where: { id } });
		if (!queue) {
			return NextResponse.json({ error: "Queue not found" }, { status: 404 });
		}

		// Get first and last record per month for delta calculation
		const startOfYear = new Date(year, 0, 1);
		const endOfYear = new Date(year + 1, 0, 1);

		const histories = await prisma.queueHistory.findMany({
			where: {
				queueId: id,
				timestamp: {
					gte: startOfYear,
					lt: endOfYear,
				},
			},
			orderBy: { timestamp: "asc" },
			select: {
				uploadBytes: true,
				downloadBytes: true,
				totalBytes: true,
				timestamp: true,
			},
		});

		// Group by month and calculate deltas
		const monthlyUsage: Array<{
			month: number;
			year: number;
			uploadBytes: number;
			downloadBytes: number;
			totalBytes: number;
			recordCount: number;
		}> = [];

		for (let month = 0; month < 12; month++) {
			const monthRecords = histories.filter(
				(h) => h.timestamp.getMonth() === month,
			);

			if (monthRecords.length < 2) {
				monthlyUsage.push({
					month: month + 1,
					year,
					uploadBytes: 0,
					downloadBytes: 0,
					totalBytes: 0,
					recordCount: monthRecords.length,
				});
				continue;
			}

			// Calculate usage considering potential counter resets
			let totalUpload = BigInt(0);
			let totalDownload = BigInt(0);

			for (let i = 1; i < monthRecords.length; i++) {
				const prev = monthRecords[i - 1];
				const curr = monthRecords[i];

				let uploadDelta = curr.uploadBytes - prev.uploadBytes;
				let downloadDelta = curr.downloadBytes - prev.downloadBytes;

				if (uploadDelta < BigInt(0)) {
					uploadDelta = curr.uploadBytes; // Count from zero after reset
				}
				if (downloadDelta < BigInt(0)) {
					downloadDelta = curr.downloadBytes;
				}

				totalUpload += uploadDelta;
				totalDownload += downloadDelta;
			}

			monthlyUsage.push({
				month: month + 1,
				year,
				uploadBytes: Number(totalUpload),
				downloadBytes: Number(totalDownload),
				totalBytes: Number(totalUpload + totalDownload),
				recordCount: monthRecords.length,
			});
		}

		return NextResponse.json(serializeBigInt(monthlyUsage));
	} catch (error) {
		console.error("Failed to fetch queue usage:", error);
		return NextResponse.json(
			{ error: "Failed to fetch queue usage" },
			{ status: 500 },
		);
	}
}
