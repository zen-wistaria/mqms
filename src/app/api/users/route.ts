import { type NextRequest, NextResponse } from "next/server";
import { hash } from "bcrypt-ts";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";

// GET /api/users — list all users (admin only)
export async function GET() {
	try {
		await requireRole("admin");

		const users = await prisma.user.findMany({
			orderBy: { createdAt: "desc" },
			select: {
				id: true,
				name: true,
				email: true,
				username: true,
				role: true,
				createdAt: true,
				_count: { select: { assignedRouters: true } },
			},
		});

		return NextResponse.json(users);
	} catch (error: unknown) {
		if (error instanceof Response) return error;
		const msg = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}

// POST /api/users — Create new user (admin only)
export async function POST(request: NextRequest) {
	try {
		await requireRole("admin");
		const { name, email, password, username } = await request.json();

		if (!name?.trim() || !email?.trim() || !password?.trim()) {
			return NextResponse.json(
				{ error: "Name, email, and password are required" },
				{ status: 400 },
			);
		}

		// Check existing email
		const existingEmail = await prisma.user.findUnique({
			where: { email: email.trim() },
		});
		if (existingEmail) {
			return NextResponse.json(
				{ error: "Email already in use" },
				{ status: 409 },
			);
		}

		// Check existing username
		if (username?.trim()) {
			const existingUser = await prisma.user.findUnique({
				where: { username: username.trim() },
			});
			if (existingUser) {
				return NextResponse.json(
					{ error: "Username already in use" },
					{ status: 409 },
				);
			}
		}

		// Create user
		const user = await prisma.user.create({
			data: {
				name: name.trim(),
				email: email.trim(),
				username: username?.trim() || null,
				role: "user",
			},
		});

		// Create credential account records for better-auth
		const hashed = await hash(password.trim(), 12);

		// Email credential
		await prisma.account.create({
			data: {
				userId: user.id,
				providerId: "credential",
				accountId: email.trim(),
				password: hashed,
			},
		});

		// Username credential (if provided)
		if (user.username) {
			await prisma.account.create({
				data: {
					userId: user.id,
					providerId: "credential",
					accountId: user.username,
					password: hashed,
				},
			});
		}

		return NextResponse.json(
			{
				id: user.id,
				name: user.name,
				email: user.email,
				username: user.username,
				role: user.role,
			},
			{ status: 201 },
		);
	} catch (error: unknown) {
		if (error instanceof Response) return error;
		const msg = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
