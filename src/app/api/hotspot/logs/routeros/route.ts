import { type NextRequest, NextResponse } from "next/server";
import { executeRestCommand } from "@/lib/mikrotik";
import { requireRouterAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

async function getRouterConfig(routerId: string) {
	const router = await prisma.router.findUnique({ where: { id: routerId } });
	if (!router) throw new Error("Router not found");
	return {
		ipAddress: router.ipAddress,
		port: router.port,
		useSSL: router.useSSL,
		username: router.username,
		password: router.password,
	};
}

/**
 * GET /api/hotspot/logs/routeros?routerId=xxx&search=xxx&limit=100
 *
 * Fetch hotspot-related log entries from RouterOS /log endpoint.
 * RouterOS REST API may not expose /log directly in all versions;
 * if that fails, we also try /log/print.
 */
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const rId = searchParams.get("routerId");
		if (!rId) throw new Error("Router ID is required");
		const search = searchParams.get("search") || "";
		const limit = Number(searchParams.get("limit") || "200");

		await requireRouterAccess(rId);
		const config = await getRouterConfig(rId);

		// Try fetching logs from RouterOS
		const result = await executeRestCommand(config, "GET", "/log");

		if (!result.success) {
			// Fallback: try /log/print (some v7 versions)
			const fallbackResult = await executeRestCommand(
				config,
				"GET",
				"/log/print",
			);
			if (!fallbackResult.success) {
				return NextResponse.json(
					{ error: "RouterOS /log endpoint not available" },
					{ status: 501 },
				);
			}
			return filterAndReturn(fallbackResult.data, search, limit);
		}

		return filterAndReturn(result.data, search, limit);
	} catch (error: unknown) {
		if (error instanceof Response) return error;
		const msg = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}

function filterAndReturn(
	data: unknown,
	search: string,
	limit: number,
): NextResponse {
	let logs = (data as any[]) || [];

	// Filter: only hotspot topic + custom user-hotspot messages
	logs = logs.filter(
		(entry: any) =>
			entry.topics?.toLowerCase().includes("hotspot") ||
			entry.message?.toLowerCase().startsWith("user-hotspot") ||
			(search && 
				entry.message?.toLowerCase().includes(search.toLowerCase())),
	);

	// Sort by time descending (RouterOS logs are usually newest first)
	logs = logs.slice(0, Math.min(limit, 500));

	// Map to consistent format
	const mapped = logs.map((entry: any) => ({
		time: entry.time || entry.timestamp || "",
		user: entry.user || (entry.topics || "").split(",").pop() || "",
		ip: entry.address || entry.ip || "",
		message: entry.message || "",
		topics: entry.topics || "",
	}));

	return NextResponse.json(mapped);
}
