import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";

// DELETE /api/users/[id]/routers/[routerId] — remove router assignment
export async function DELETE(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string; routerId: string }> },
) {
	try {
		await requireRole("admin");
		const { id, routerId } = await params;

		const existing = await prisma.routerAssignment.findUnique({
			where: { userId_routerId: { userId: id, routerId } },
		});

		if (!existing) {
			return NextResponse.json(
				{ error: "Assignment not found" },
				{ status: 404 },
			);
		}

		await prisma.routerAssignment.delete({
			where: { userId_routerId: { userId: id, routerId } },
		});

		return NextResponse.json({ success: true });
	} catch (error: unknown) {
		if (error instanceof Response) return error;
		const msg = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
