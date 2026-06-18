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

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ comment: string }> },
) {
	try {
		const { searchParams } = new URL(request.url);
		const routerId = searchParams.get("routerId");
		const { comment } = await params;

		if (!comment) {
			return NextResponse.json(
				{ error: "Comment parameter is required" },
				{ status: 400 },
			);
		}

		const config = await getRouterConfig(routerId);

		// Get all users with this comment
		const result = await executeRestCommand(config, "GET", "/ip/hotspot/user");
		if (!result.success) {
			return NextResponse.json({ error: result.error }, { status: 500 });
		}

		const allUsers = (result.data as any[]) || [];
		const toDelete = allUsers.filter((u: any) => u.comment === comment);

		if (toDelete.length === 0) {
			return NextResponse.json(
				{ error: "No users found with this batch comment" },
				{ status: 404 },
			);
		}

		// Delete sequentially
		let successes = 0;
		const errors: string[] = [];

		for (const u of toDelete) {
			const d = await executeRestCommand(
				config,
				"DELETE",
				`/ip/hotspot/user/${encodeURIComponent(u[".id"])}`,
			);
			if (d.success) successes++;
			else errors.push(d.error || "Unknown");
		}

		return NextResponse.json({
			success: true,
			deleted: successes,
			failed: toDelete.length - successes,
			total: toDelete.length,
		});
	} catch (error) {
		const msg = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
