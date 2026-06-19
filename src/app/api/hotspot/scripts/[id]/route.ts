import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PUT /api/hotspot/scripts/[id] — update script
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;
		const body = await request.json();

		const existing = await prisma.hotspotRouterScript.findUnique({
			where: { id },
		});
		if (!existing) {
			return NextResponse.json(
				{ error: "Script not found" },
				{ status: 404 },
			);
		}

		const data: Record<string, unknown> = {};
		if (body.name !== undefined) data.name = body.name;
		if (body.content !== undefined) data.content = body.content;
		if (body.deployed !== undefined) data.deployed = body.deployed;

		const script = await prisma.hotspotRouterScript.update({
			where: { id },
			data,
		});

		return NextResponse.json(script);
	} catch (error: unknown) {
		if (error instanceof Response) return error;
		const msg = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}

// DELETE /api/hotspot/scripts/[id] — delete script
export async function DELETE(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;

		const existing = await prisma.hotspotRouterScript.findUnique({
			where: { id },
		});
		if (!existing) {
			return NextResponse.json(
				{ error: "Script not found" },
				{ status: 404 },
			);
		}

		await prisma.hotspotRouterScript.delete({ where: { id } });

		return NextResponse.json({ success: true });
	} catch (error: unknown) {
		if (error instanceof Response) return error;
		const msg = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
