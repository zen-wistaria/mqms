import { type NextRequest, NextResponse } from "next/server";
import { executeRestCommand } from "@/lib/mikrotik";
import { requireRouterAccess } from "@/lib/permissions";
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
		if (!routerId) throw new Error("Router ID is required");

		await requireRouterAccess(routerId);
		const config = await getRouterConfig(routerId);

		const result = await executeRestCommand(
			config,
			"GET",
			"/ip/hotspot/active",
		);

		if (!result.success) {
			return NextResponse.json({ error: result.error }, { status: 500 });
		}

		return NextResponse.json(result.data);
	} catch (error: unknown) {
		if (error instanceof Response) return error;
		const msg = error instanceof Error ? error.message : "Unknown error";
		console.error("Failed to fetch active hotspot sessions:", error);
		return NextResponse.json(
			{ error: msg || "Failed to fetch active hotspot sessions" },
			{ status: 500 },
		);
	}
}

export async function DELETE(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const routerId = searchParams.get("routerId");
		const id = searchParams.get("id");

		if (!id) {
			return NextResponse.json(
				{ error: "Session ID is required" },
				{ status: 400 },
			);
		}
		if (!routerId) throw new Error("Router ID is required");

		await requireRouterAccess(routerId);
		const config = await getRouterConfig(routerId);

		const result = await executeRestCommand(
			config,
			"DELETE",
			`/ip/hotspot/active/${id}`,
		);

		if (!result.success) {
			return NextResponse.json({ error: result.error }, { status: 500 });
		}

		return NextResponse.json({ success: true });
	} catch (error: unknown) {
		if (error instanceof Response) return error;
		const msg = error instanceof Error ? error.message : "Unknown error";
		console.error("Failed to disconnect hotspot session:", error);
		return NextResponse.json(
			{ error: msg || "Failed to disconnect hotspot session" },
			{ status: 500 },
		);
	}
}
