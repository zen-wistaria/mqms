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
			"/ip/hotspot/user/profile",
		);

		if (!result.success) {
			return NextResponse.json({ error: result.error }, { status: 500 });
		}

		return NextResponse.json(result.data);
	} catch (error: any) {
		console.error("Failed to fetch hotspot profiles:", error);
		return NextResponse.json(
			{ error: error.message || "Failed to fetch hotspot profiles" },
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const routerId = searchParams.get("routerId");
		const config = await getRouterConfig(routerId);

		const body = await request.json();

		const result = await executeRestCommand(
			config,
			"PUT",
			"/ip/hotspot/user/profile",
			body,
		);

		if (!result.success) {
			return NextResponse.json({ error: result.error }, { status: 500 });
		}

		return NextResponse.json(result.data);
	} catch (error: any) {
		console.error("Failed to create hotspot profile:", error);
		return NextResponse.json(
			{ error: error.message || "Failed to create hotspot profile" },
			{ status: 500 },
		);
	}
}
