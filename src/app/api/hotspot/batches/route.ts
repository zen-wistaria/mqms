import { type NextRequest, NextResponse } from "next/server";
import { executeRestCommand } from "@/lib/mikrotik";
import { prisma } from "@/lib/prisma";

async function getRouterConfig(routerId: string | null) {
	if (!routerId) throw new Error("Router ID is required");
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

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const routerId = searchParams.get("routerId");

		const config = await getRouterConfig(routerId);

		const result = await executeRestCommand(config, "GET", "/ip/hotspot/user");
		if (!result.success) {
			return NextResponse.json({ error: result.error }, { status: 500 });
		}

		const users = (result.data as any[]) || [];

		// Group by comment, filter only batch comments (up-xxx or vc-xxx pattern)
		const batchMap = new Map<string, any[]>();

		for (const u of users) {
			const c = u.comment || "";
			if (!c.match(/^(up|vc)-\d{3}/)) continue;

			if (!batchMap.has(c)) batchMap.set(c, []);
			batchMap.get(c)!.push(u);
		}

		// Build batch list sorted newest first
		const batches = Array.from(batchMap.entries())
			.map(([comment, users]) => {
				const parts = comment.split("-");
				const userMode = parts[0]; // up or vc
				const tag = parts[1];
				const date = parts.slice(2, 4).join("."); // MM.DD.YY

				// Collect unique profiles
				const profiles = Array.from(
					new Set(users.map((u: any) => u.profile || "default")),
				);

				// Time/data limits from first user
				const first = users[0] || {};

				return {
					batchComment: comment,
					userMode,
					tag,
					date,
					adcomment: parts.slice(4).join("-") || "",
					count: users.length,
					profiles,
					timeLimit: first["limit-uptime"] || "",
					dataLimit: first["limit-bytes-total"] || "",
					server: first.server || "all",
				};
			})
			.sort((a, b) => {
				// Sort by tag desc (recent tag = larger number)
				const tagA = Number.parseInt(a.tag) || 0;
				const tagB = Number.parseInt(b.tag) || 0;
				return tagB - tagA;
			});

		return NextResponse.json(batches);
	} catch (error) {
		const msg = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
