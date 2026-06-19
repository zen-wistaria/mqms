import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/hotspot/logs/activity?routerId=xxx&from=date&to=date&search=xxx&limit=500&offset=0
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const routerId = searchParams.get("routerId");
		const from = searchParams.get("from");
		const to = searchParams.get("to");
		const search = searchParams.get("search");
		const limit = Number(searchParams.get("limit") || "500");
		const offset = Number(searchParams.get("offset") || "0");

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

		const [logs, total] = await Promise.all([
			prisma.hotspotActivityLog.findMany({
				where,
				orderBy: { loggedAt: "desc" },
				take: limit,
				skip: offset,
			}),
			prisma.hotspotActivityLog.count({ where }),
		]);

		return NextResponse.json({ logs, total });
	} catch (error: unknown) {
		if (error instanceof Response) return error;
		const msg = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
