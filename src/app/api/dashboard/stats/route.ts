import { NextResponse } from "next/server";
import { serializeBigInt } from "@/lib/format";
import { prisma } from "@/lib/prisma";

// GET /api/dashboard/stats — Dashboard summary statistics
export async function GET() {
	try {
		const now = new Date();
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

		// Counts
		const [routerCount, queueCount, onlineRouterCount] = await Promise.all([
			prisma.router.count(),
			prisma.queue.count({ where: { isDeleted: false } }),
			prisma.router.count({ where: { status: "online" } }),
		]);

		// Get all queues with their first and last records this month for delta calculation
		const queues = await prisma.queue.findMany({
			where: { isDeleted: false },
			select: { id: true, name: true, routerId: true },
		});

		let totalUpload = BigInt(0);
		let totalDownload = BigInt(0);

		// Top queues calculation
		const queueUsages: Array<{
			id: string;
			name: string;
			uploadBytes: number;
			downloadBytes: number;
			totalBytes: number;
		}> = [];

		for (const queue of queues) {
			const records = await prisma.queueHistory.findMany({
				where: {
					queueId: queue.id,
					timestamp: { gte: startOfMonth },
				},
				orderBy: { timestamp: "asc" },
				select: {
					uploadBytes: true,
					downloadBytes: true,
				},
			});

			if (records.length < 2) continue;

			let qUpload = BigInt(0);
			let qDownload = BigInt(0);

			for (let i = 1; i < records.length; i++) {
				let uploadDelta = records[i].uploadBytes - records[i - 1].uploadBytes;
				let downloadDelta =
					records[i].downloadBytes - records[i - 1].downloadBytes;

				if (uploadDelta < BigInt(0)) uploadDelta = records[i].uploadBytes;
				if (downloadDelta < BigInt(0)) downloadDelta = records[i].downloadBytes;

				qUpload += uploadDelta;
				qDownload += downloadDelta;
			}

			totalUpload += qUpload;
			totalDownload += qDownload;

			queueUsages.push({
				id: queue.id,
				name: queue.name,
				uploadBytes: Number(qUpload),
				downloadBytes: Number(qDownload),
				totalBytes: Number(qUpload + qDownload),
			});
		}

		// Sort by total and get top 5
		queueUsages.sort((a, b) => b.totalBytes - a.totalBytes);
		const topQueues = queueUsages.slice(0, 5);

		// Recent activity - last 10 history entries
		const recentActivity = await prisma.queueHistory.findMany({
			take: 10,
			orderBy: { timestamp: "desc" },
			include: {
				queue: {
					select: { name: true, router: { select: { name: true } } },
				},
			},
		});

		return NextResponse.json(
			serializeBigInt({
				routerCount,
				queueCount,
				onlineRouterCount,
				monthlyUploadBytes: Number(totalUpload),
				monthlyDownloadBytes: Number(totalDownload),
				monthlyTotalBytes: Number(totalUpload + totalDownload),
				topQueues,
				recentActivity,
			}),
		);
	} catch (error) {
		console.error("Failed to fetch dashboard stats:", error);
		return NextResponse.json(
			{ error: "Failed to fetch dashboard stats" },
			{ status: 500 },
		);
	}
}
