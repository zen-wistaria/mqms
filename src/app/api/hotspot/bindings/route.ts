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

// GET /api/hotspot/bindings?routerId=xxx
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const routerId = searchParams.get("routerId");

		const config = await getRouterConfig(routerId);

		const result = await executeRestCommand(
			config,
			"GET",
			"/ip/hotspot/ip-binding",
		);

		if (!result.success) {
			return NextResponse.json({ error: result.error }, { status: 500 });
		}

		return NextResponse.json(result.data);
	} catch (error) {
		const msg = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}

// POST /api/hotspot/bindings?routerId=xxx
export async function POST(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const routerId = searchParams.get("routerId");
		const config = await getRouterConfig(routerId);

		const body = await request.json();

		// Validate
		if (!body["mac-address"] && !body.address) {
			return NextResponse.json(
				{ error: "MAC address or IP address is required" },
				{ status: 400 },
			);
		}

		const result = await executeRestCommand(
			config,
			"PUT",
			"/ip/hotspot/ip-binding",
			body,
		);

		if (!result.success) {
			return NextResponse.json({ error: result.error }, { status: 500 });
		}

		return NextResponse.json(result.data, { status: 201 });
	} catch (error) {
		const msg = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}

// DELETE /api/hotspot/bindings?routerId=xxx&id=.id
export async function DELETE(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const routerId = searchParams.get("routerId");
		const id = searchParams.get("id");

		if (!id) {
			return NextResponse.json(
				{ error: "Binding ID is required" },
				{ status: 400 },
			);
		}

		const config = await getRouterConfig(routerId);

		const result = await executeRestCommand(
			config,
			"DELETE",
			`/ip/hotspot/ip-binding/${encodeURIComponent(id)}`,
		);

		if (!result.success) {
			return NextResponse.json({ error: result.error }, { status: 500 });
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		const msg = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
