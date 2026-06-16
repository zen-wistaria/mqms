import { format } from "date-fns";
import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
	params: Promise<{ id: string }>;
}

// GET /api/queues/:id/export — Export history data as CSV
export async function GET(request: NextRequest, { params }: RouteParams) {
	try {
		const { id } = await params;
		const { searchParams } = new URL(request.url);
		const from = searchParams.get("from");
		const to = searchParams.get("to");

		const queue = await prisma.queue.findUnique({
			where: { id },
			include: { router: { select: { name: true } } },
		});

		if (!queue) {
			return NextResponse.json({ error: "Queue not found" }, { status: 404 });
		}

		const where: Record<string, unknown> = { queueId: id };
		if (from || to) {
			where.timestamp = {};
			if (from)
				(where.timestamp as Record<string, unknown>).gte = new Date(from);
			if (to) (where.timestamp as Record<string, unknown>).lte = new Date(to);
		}

		const histories = await prisma.queueHistory.findMany({
			where,
			orderBy: { timestamp: "asc" },
		});

		// Build CSV
		const headers = [
			"Timestamp",
			"Upload Bytes",
			"Download Bytes",
			"Total Bytes",
			"Upload Rate",
			"Download Rate",
			"Packet Rate",
		];

		const rows = histories.map((h) => [
			format(h.timestamp, "yyyy-MM-dd HH:mm:ss"),
			h.uploadBytes.toString(),
			h.downloadBytes.toString(),
			h.totalBytes.toString(),
			h.rateUpload || "",
			h.rateDownload || "",
			h.packetRate || "",
		]);

		const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join(
			"\n",
		);

		const filename = `queue_${queue.name}_${queue.router.name}_${format(new Date(), "yyyyMMdd")}.csv`;

		return new NextResponse(csv, {
			headers: {
				"Content-Type": "text/csv",
				"Content-Disposition": `attachment; filename="${filename}"`,
			},
		});
	} catch (error) {
		console.error("Failed to export queue data:", error);
		return NextResponse.json(
			{ error: "Failed to export data" },
			{ status: 500 },
		);
	}
}
