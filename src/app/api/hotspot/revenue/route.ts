import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/hotspot/revenue?routerId=xxx&from=date&to=date&profile=xxx&batch=xxx
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const routerId = searchParams.get("routerId");
		const from = searchParams.get("from");
		const to = searchParams.get("to");
		const profile = searchParams.get("profile");
		const batch = searchParams.get("batch");
		const limit = Number(searchParams.get("limit") || "500");
		const offset = Number(searchParams.get("offset") || "0");

		const where: Record<string, unknown> = {};
		if (routerId) where.routerId = routerId;
		if (profile) where.profileName = profile;
		if (batch) where.batchComment = batch;

		if (from || to) {
			const soldAt: Record<string, Date> = {};
			if (from) soldAt.gte = new Date(from);
			if (to) soldAt.lte = new Date(to);
			where.soldAt = soldAt;
		}

		const [transactions, total] = await Promise.all([
			prisma.hotspotTransaction.findMany({
				where,
				orderBy: { soldAt: "desc" },
				take: limit,
				skip: offset,
			}),
			prisma.hotspotTransaction.count({ where }),
		]);

		return NextResponse.json({ transactions, total });
	} catch (error: unknown) {
		if (error instanceof Response) return error;
		const msg = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
