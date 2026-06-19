import { type NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

// PATCH /api/users/[id]/role — change user role (admin only)
export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		await requireRole("admin");
		const { id } = await params;
		const { role } = await request.json();

		if (!role || !["admin", "user"].includes(role)) {
			return NextResponse.json(
				{ error: "Role must be 'admin' or 'user'" },
				{ status: 400 },
			);
		}

		const user = await prisma.user.findUnique({ where: { id } });
		if (!user) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		await prisma.user.update({
			where: { id },
			data: { role },
		});

		return NextResponse.json({ success: true });
	} catch (error: unknown) {
		if (error instanceof Response) return error;
		const msg = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
