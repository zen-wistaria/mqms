import { type NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

// GET /api/users/[id]/routers — list routers assigned to a user
export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		await requireRole("admin");
		const { id } = await params;

		const assignments = await prisma.routerAssignment.findMany({
			where: { userId: id },
			include: {
				router: {
					select: { id: true, name: true, ipAddress: true, status: true },
				},
			},
			orderBy: { createdAt: "desc" },
		});

		return NextResponse.json(assignments);
	} catch (error: unknown) {
		if (error instanceof Response) return error;
		const msg = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}

// POST /api/users/[id]/routers — assign a router to a user
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		await requireRole("admin");
		const { id } = await params;
		const { routerId } = await request.json();

		if (!routerId) {
			return NextResponse.json(
				{ error: "routerId is required" },
				{ status: 400 },
			);
		}

		// Check user exists
		const user = await prisma.user.findUnique({ where: { id } });
		if (!user) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		// Check router exists
		const router = await prisma.router.findUnique({
			where: { id: routerId },
		});
		if (!router) {
			return NextResponse.json({ error: "Router not found" }, { status: 404 });
		}

		// Check duplicate
		const existing = await prisma.routerAssignment.findUnique({
			where: { userId_routerId: { userId: id, routerId } },
		});
		if (existing) {
			return NextResponse.json({ error: "Already assigned" }, { status: 409 });
		}

		const assignment = await prisma.routerAssignment.create({
			data: { userId: id, routerId },
		});

		return NextResponse.json(assignment, { status: 201 });
	} catch (error: unknown) {
		if (error instanceof Response) return error;
		const msg = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
