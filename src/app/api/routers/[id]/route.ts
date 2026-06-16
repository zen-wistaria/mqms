import { type NextRequest, NextResponse } from "next/server";
import { encrypt } from "@/lib/encryption";
import { serializeBigInt } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { routerUpdateSchema } from "@/lib/validations/router";

interface RouteParams {
	params: Promise<{ id: string }>;
}

// GET /api/routers/:id — Get router details
export async function GET(_request: NextRequest, { params }: RouteParams) {
	try {
		const { id } = await params;
		const router = await prisma.router.findUnique({
			where: { id },
			include: {
				queues: {
					where: { isDeleted: false },
					orderBy: { name: "asc" },
				},
				_count: {
					select: {
						queues: {
							where: { isDeleted: false },
						},
					},
				},
			},
		});

		if (!router) {
			return NextResponse.json({ error: "Router not found" }, { status: 404 });
		}

		const { password: _, ...safeRouter } = router;
		return NextResponse.json(serializeBigInt(safeRouter));
	} catch (error) {
		console.error("Failed to fetch router:", error);
		return NextResponse.json(
			{ error: "Failed to fetch router" },
			{ status: 500 },
		);
	}
}

// PUT /api/routers/:id — Update router
export async function PUT(request: NextRequest, { params }: RouteParams) {
	try {
		const { id } = await params;
		const body = await request.json();
		const parsed = routerUpdateSchema.safeParse(body);

		if (!parsed.success) {
			return NextResponse.json(
				{ error: "Validation failed", details: parsed.error.issues },
				{ status: 400 },
			);
		}

		const { password, ...data } = parsed.data;

		const updateData: Record<string, unknown> = { ...data };
		if (password) {
			updateData.password = encrypt(password);
		}

		const router = await prisma.router.update({
			where: { id },
			data: updateData,
		});

		const { password: _, ...safeRouter } = router;
		return NextResponse.json(serializeBigInt(safeRouter));
	} catch (error) {
		console.error("Failed to update router:", error);
		return NextResponse.json(
			{ error: "Failed to update router" },
			{ status: 500 },
		);
	}
}

// DELETE /api/routers/:id — Delete router and all related data
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
	try {
		const { id } = await params;

		await prisma.router.delete({
			where: { id },
		});

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Failed to delete router:", error);
		return NextResponse.json(
			{ error: "Failed to delete router" },
			{ status: 500 },
		);
	}
}
