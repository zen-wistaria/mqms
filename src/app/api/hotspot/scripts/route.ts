import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/hotspot/scripts?routerId=xxx&type=on-login|on-logout
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const routerId = searchParams.get("routerId");
		const type = searchParams.get("type");

		const where: Record<string, unknown> = {};
		if (routerId) where.routerId = routerId;
		if (type) where.type = type;

		const scripts = await prisma.hotspotRouterScript.findMany({
			where,
			orderBy: [{ type: "asc" }, { name: "asc" }],
		});

		return NextResponse.json(scripts);
	} catch (error: unknown) {
		if (error instanceof Response) return error;
		const msg = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}

// POST /api/hotspot/scripts — create a new script
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();

		if (!body.routerId || !body.type || !body.name || !body.content) {
			return NextResponse.json(
				{ error: "routerId, type, name, and content are required" },
				{ status: 400 },
			);
		}

		if (!["on-login", "on-logout"].includes(body.type)) {
			return NextResponse.json(
				{ error: 'type must be "on-login" or "on-logout"' },
				{ status: 400 },
			);
		}

		const existing = await prisma.hotspotRouterScript.findUnique({
			where: {
				routerId_type_name: {
					routerId: body.routerId,
					type: body.type,
					name: body.name,
				},
			},
		});

		if (existing) {
			return NextResponse.json(
				{ error: "Script with same name already exists" },
				{ status: 409 },
			);
		}

		const script = await prisma.hotspotRouterScript.create({
			data: {
				routerId: body.routerId,
				type: body.type,
				name: body.name,
				content: body.content,
			},
		});

		return NextResponse.json(script, { status: 201 });
	} catch (error: unknown) {
		if (error instanceof Response) return error;
		const msg = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
