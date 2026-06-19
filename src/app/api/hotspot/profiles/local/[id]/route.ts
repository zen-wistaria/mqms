import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PUT /api/hotspot/profiles/local/[id] — update local profile metadata
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;
		const body = await request.json();

		const existing = await prisma.hotspotProfile.findUnique({
			where: { id },
		});
		if (!existing) {
			return NextResponse.json(
				{ error: "Profile not found" },
				{ status: 404 },
			);
		}

		const data: Record<string, unknown> = {};

		if (body.name !== undefined) data.name = body.name;
		if (body.sharedUsers !== undefined) data.sharedUsers = body.sharedUsers;
		if (body.rateLimit !== undefined) data.rateLimit = body.rateLimit || null;
		if (body.addressPool !== undefined)
			data.addressPool = body.addressPool || null;
		if (body.macCookie !== undefined) data.macCookie = body.macCookie;
		if (body.server !== undefined) data.server = body.server;
		if (body.expiredMode !== undefined) data.expiredMode = body.expiredMode;
		if (body.price !== undefined) data.price = body.price;
		if (body.sellPrice !== undefined) data.sellPrice = body.sellPrice;
		if (body.lockUser !== undefined) data.lockUser = body.lockUser;
		if (body.validity !== undefined) data.validity = body.validity;
		if (body.onLoginScript !== undefined)
			data.onLoginScript = body.onLoginScript || null;
		if (body.onLogoutScript !== undefined)
			data.onLogoutScript = body.onLogoutScript || null;

		const profile = await prisma.hotspotProfile.update({
			where: { id },
			data,
		});

		return NextResponse.json(profile);
	} catch (error: unknown) {
		if (error instanceof Response) return error;
		const msg = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}

// DELETE /api/hotspot/profiles/local/[id] — delete local profile metadata
export async function DELETE(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;

		const existing = await prisma.hotspotProfile.findUnique({
			where: { id },
		});
		if (!existing) {
			return NextResponse.json(
				{ error: "Profile not found" },
				{ status: 404 },
			);
		}

		await prisma.hotspotProfile.delete({ where: { id } });

		return NextResponse.json({ success: true });
	} catch (error: unknown) {
		if (error instanceof Response) return error;
		const msg = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
