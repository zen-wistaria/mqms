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
		const profile = searchParams.get("profile");
		const comment = searchParams.get("comment");

		const config = await getRouterConfig(routerId);

		const result = await executeRestCommand(
			config,
			"GET",
			"/ip/hotspot/user",
		);

		if (!result.success) {
			return NextResponse.json({ error: result.error }, { status: 500 });
		}

		let users = (result.data as any[]) || [];

		// Filter by profile
		if (profile && profile !== "all") {
			users = users.filter((u: any) => u.profile === profile);
		}

		// Filter by comment
		if (comment) {
			users = users.filter((u: any) => u.comment === comment);
		}

		return NextResponse.json(users);
	} catch (error: any) {
		console.error("Failed to fetch hotspot users:", error);
		return NextResponse.json(
			{ error: error.message || "Failed to fetch hotspot users" },
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
			"/ip/hotspot/user",
			body,
		);

		if (!result.success) {
			return NextResponse.json({ error: result.error }, { status: 500 });
		}

		return NextResponse.json(result.data);
	} catch (error: any) {
		console.error("Failed to create hotspot user:", error);
		return NextResponse.json(
			{ error: error.message || "Failed to create hotspot user" },
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
				{ error: "User ID is required" },
				{ status: 400 },
			);
		}

		const config = await getRouterConfig(routerId);

		const result = await executeRestCommand(
			config,
			"DELETE",
			`/ip/hotspot/user/${id}`,
		);

		if (!result.success) {
			return NextResponse.json({ error: result.error }, { status: 500 });
		}

		return NextResponse.json({ success: true });
	} catch (error: any) {
		console.error("Failed to delete hotspot user:", error);
		return NextResponse.json(
			{ error: error.message || "Failed to delete hotspot user" },
			{ status: 500 },
		);
	}
}
