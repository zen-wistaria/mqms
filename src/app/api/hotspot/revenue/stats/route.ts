import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/hotspot/revenue/stats?routerId=xxx&from=date&to=date
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const routerId = searchParams.get("routerId");
		const from = searchParams.get("from");
		const to = searchParams.get("to");

		const where: Record<string, unknown> = {};
		if (routerId) where.routerId = routerId;

		if (from || to) {
			const soldAt: Record<string, Date> = {};
			if (from) soldAt.gte = new Date(from);
			if (to) soldAt.lte = new Date(to);
			where.soldAt = soldAt;
		}

		const [transactions, perProfile, todayCount] = await Promise.all([
			prisma.hotspotTransaction.findMany({ where }),
			prisma.hotspotTransaction.groupBy({
				by: ["profileName"],
				where,
				_sum: { price: true },
				_count: true,
				orderBy: { _sum: { price: "desc" } },
			}),
			prisma.hotspotTransaction.count({
				where: {
					...where,
					soldAt: {
						gte: new Date(new Date().setHours(0, 0, 0, 0)),
					},
				},
			}),
		]);

		const totalRevenue = transactions.reduce(
			(sum, t) => sum + t.price,
			0,
		);
		const totalSold = transactions.length;

		// Monthly breakdown
		const monthlyMap = new Map<string, { revenue: number; count: number }>();
		for (const t of transactions) {
			const key = t.soldAt.toISOString().slice(0, 7); // "YYYY-MM"
			const entry = monthlyMap.get(key) || { revenue: 0, count: 0 };
			entry.revenue += t.price;
			entry.count++;
			monthlyMap.set(key, entry);
		}
		const monthly = Array.from(monthlyMap.entries())
			.map(([month, data]) => ({ month, ...data }))
			.sort((a, b) => a.month.localeCompare(b.month));

		const profileStats = perProfile.map((p) => ({
			profile: p.profileName,
			revenue: p._sum.price || 0,
			count: p._count,
		}));

		return NextResponse.json({
			totalRevenue,
			totalSold,
			avgPrice: totalSold > 0 ? Math.round(totalRevenue / totalSold) : 0,
			todayCount,
			perProfile: profileStats,
			monthly,
		});
	} catch (error: unknown) {
		if (error instanceof Response) return error;
		const msg = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
