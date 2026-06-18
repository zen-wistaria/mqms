import { type NextRequest, NextResponse } from "next/server";
import { executeRestCommand } from "@/lib/mikrotik";
import { prisma } from "@/lib/prisma";

async function getRouterConfig(routerId: string | null) {
	if (!routerId) {
		throw new Error("Router ID is required");
	}
	const router = await prisma.router.findUnique({
		where: { id: routerId },
	});
	if (!router) {
		throw new Error("Router not found");
	}
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

		const result = await executeRestCommand(
			config,
			"GET",
			"/ip/hotspot/active",
		);

		if (!result.success) {
			return NextResponse.json({ error: result.error }, { status: 500 });
		}

		return NextResponse.json(result.data);
	} catch (error: any) {
		console.error("Failed to fetch active hotspot sessions:", error);
		return NextResponse.json(
			{ error: error.message || "Failed to fetch active hotspot sessions" },
			{ status: 500 },
		);
	}
}

export async function DELETE(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const routerId = searchParams.get("routerId");
		const id = searchParams.get("id"); // .id in Mikrotik

		if (!id) {
			return NextResponse.json(
				{ error: "Session ID is required" },
				{ status: 400 },
			);
		}

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
	} catch (error: any) {
		console.error("Failed to disconnect hotspot session:", error);
		return NextResponse.json(
			{ error: error.message || "Failed to disconnect hotspot session" },
			{ status: 500 },
		);
	}
}
