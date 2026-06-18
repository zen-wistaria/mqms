import { type NextRequest, NextResponse } from "next/server";
import { hash } from "bcrypt-ts";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";

// PATCH /api/users/[id] — Update user (name, email, password)
export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		await requireRole("admin");
		const { id } = await params;
		const { name, email, username, password } = await request.json();

		const user = await prisma.user.findUnique({ where: { id } });
		if (!user) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		const updateData: Record<string, string | null> = {};
		if (name?.trim()) updateData.name = name.trim();
		if (email?.trim()) {
			const existing = await prisma.user.findUnique({
				where: { email: email.trim() },
			});
			if (existing && existing.id !== id) {
				return NextResponse.json(
					{ error: "Email already in use" },
					{ status: 409 },
				);
			}
			updateData.email = email.trim();
		}
		if (username !== undefined) {
			const val = username?.trim() || null;
			if (val) {
				const existing = await prisma.user.findUnique({
					where: { username: val },
				});
				if (existing && existing.id !== id) {
					return NextResponse.json(
						{ error: "Username already in use" },
						{ status: 409 },
					);
				}
			}
			updateData.username = val;
		}

		if (Object.keys(updateData).length > 0) {
			await prisma.user.update({ where: { id }, data: updateData });
		}

		// Update password if provided
		if (password?.trim()) {
			const hashed = await hash(password.trim(), 12);
			await prisma.account.updateMany({
				where: { userId: id, providerId: "email" },
				data: { password: hashed },
			});
		}

		return NextResponse.json({ success: true });
	} catch (error: unknown) {
		if (error instanceof Response) return error;
		const msg = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}

// DELETE /api/users/[id] — Delete user
export async function DELETE(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		await requireRole("admin");
		const { id } = await params;

		const user = await prisma.user.findUnique({ where: { id } });
		if (!user) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		// Cascade delete accounts, sessions, assignments
		await prisma.user.delete({ where: { id } });

		return NextResponse.json({ success: true });
	} catch (error: unknown) {
		if (error instanceof Response) return error;
		const msg = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
