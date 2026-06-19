import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/hotspot/logs/activity/export?routerId=xxx&from=date&to=date&search=xxx
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const routerId = searchParams.get("routerId");
		const from = searchParams.get("from");
		const to = searchParams.get("to");
		const search = searchParams.get("search");

		const where: Record<string, unknown> = {};
		if (routerId) where.routerId = routerId;

		if (from || to) {
			const loggedAt: Record<string, Date> = {};
			if (from) loggedAt.gte = new Date(from);
			if (to) loggedAt.lte = new Date(to);
			where.loggedAt = loggedAt;
		}

		if (search) {
			where.OR = [
				{ username: { contains: search } },
				{ ipAddress: { contains: search } },
				{ macAddress: { contains: search } },
				{ message: { contains: search } },
				{ profileName: { contains: search } },
			];
		}

		const logs = await prisma.hotspotActivityLog.findMany({
			where,
			orderBy: { loggedAt: "desc" },
		});

		// Build CSV
		const headers = [
			"Date",
			"Username",
			"IP Address",
			"MAC Address",
			"Profile",
			"Validity",
			"Type",
			"Message",
		];

		const rows = logs.map((log) => [
			log.loggedAt.toISOString(),
			log.username,
			log.ipAddress || "",
			log.macAddress || "",
			log.profileName || "",
			log.validity || "",
			log.type,
			log.message || "",
		]);

		const csv = [
			headers.join(","),
			...rows.map((r) =>
				r
					.map((v) =>
						v.includes(",") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v,
					)
					.join(","),
			),
		].join("\n");

		return new NextResponse(csv, {
			headers: {
				"Content-Type": "text/csv; charset=utf-8",
				"Content-Disposition": `attachment; filename="hotspot-activity-${new Date().toISOString().slice(0, 10)}.csv"`,
			},
		});
	} catch (error: unknown) {
		if (error instanceof Response) return error;
		const msg = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
