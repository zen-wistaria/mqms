import { type NextRequest, NextResponse } from "next/server";
import { serializeBigInt } from "@/lib/format";
import { prisma } from "@/lib/prisma";

interface RouteParams {
	params: Promise<{ id: string }>;
}

// GET /api/queues/:id/daily — Daily usage for a month
export async function GET(request: NextRequest, { params }: RouteParams) {
	try {
		const { id } = await params;
		const { searchParams } = new URL(request.url);
		const year = Number(
			searchParams.get("year") || new Date().getFullYear().toString(),
		);
		const month = Number(
			searchParams.get("month") || (new Date().getMonth() + 1).toString(),
		);

		const queue = await prisma.queue.findUnique({ where: { id } });
		if (!queue) {
			return NextResponse.json({ error: "Queue not found" }, { status: 404 });
		}

		const startOfMonth = new Date(year, month - 1, 1);
		const endOfMonth = new Date(year, month, 1);

		const histories = await prisma.queueHistory.findMany({
			where: {
				queueId: id,
				timestamp: {
					gte: startOfMonth,
					lt: endOfMonth,
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

		// Group by day and calculate daily deltas
		const daysInMonth = new Date(year, month, 0).getDate();
		const dailyUsage: Array<{
			date: string;
			day: number;
			uploadBytes: number;
			downloadBytes: number;
			totalBytes: number;
		}> = [];

		for (let day = 1; day <= daysInMonth; day++) {
			const dayRecords = histories.filter((h) => h.timestamp.getDate() === day);

			if (dayRecords.length < 2) {
				dailyUsage.push({
					date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
					day,
					uploadBytes: 0,
					downloadBytes: 0,
					totalBytes: 0,
				});
				continue;
			}

			let totalUpload = BigInt(0);
			let totalDownload = BigInt(0);

			for (let i = 1; i < dayRecords.length; i++) {
				const prev = dayRecords[i - 1];
				const curr = dayRecords[i];

				let uploadDelta = curr.uploadBytes - prev.uploadBytes;
				let downloadDelta = curr.downloadBytes - prev.downloadBytes;

				if (uploadDelta < BigInt(0)) uploadDelta = curr.uploadBytes;
				if (downloadDelta < BigInt(0)) downloadDelta = curr.downloadBytes;

				totalUpload += uploadDelta;
				totalDownload += downloadDelta;
			}

			dailyUsage.push({
				date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
				day,
				uploadBytes: Number(totalUpload),
				downloadBytes: Number(totalDownload),
				totalBytes: Number(totalUpload + totalDownload),
			});
		}

		return NextResponse.json(serializeBigInt(dailyUsage));
	} catch (error) {
		console.error("Failed to fetch daily usage:", error);
		return NextResponse.json(
			{ error: "Failed to fetch daily usage" },
			{ status: 500 },
		);
	}
}
