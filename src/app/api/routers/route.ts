import { type NextRequest, NextResponse } from "next/server";
import { encrypt } from "@/lib/encryption";
import { serializeBigInt } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { routerCreateSchema } from "@/lib/validations/router";

// GET /api/routers — List all routers
export async function GET() {
	try {
		const routers = await prisma.router.findMany({
			orderBy: { createdAt: "desc" },
			include: {
				_count: {
					select: {
						queues: {
							where: { isDeleted: false },
						},
					},
				},
			},
		});

		// Remove password from response
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const safeRouters = routers.map(({ password: _, ...router }) => router);

		return NextResponse.json(serializeBigInt(safeRouters));
	} catch (error) {
		console.error("Failed to fetch routers:", error);
		return NextResponse.json(
			{ error: "Failed to fetch routers" },
			{ status: 500 },
		);
	}
}

// POST /api/routers — Create new router
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const parsed = routerCreateSchema.safeParse(body);

		if (!parsed.success) {
			return NextResponse.json(
				{ error: "Validation failed", details: parsed.error.issues },
				{ status: 400 },
			);
		}

		const { password, ...data } = parsed.data;

		// Check if name already exists
		const existing = await prisma.router.findUnique({
			where: { name: data.name },
		});
		if (existing) {
			return NextResponse.json(
				{ error: "A router with this name already exists" },
				{ status: 409 },
			);
		}

		const encryptedPassword = encrypt(password);

		const router = await prisma.router.create({
			data: {
				...data,
				password: encryptedPassword,
			},
		});

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { password: _, ...routerWithoutPassword } = router;

		return NextResponse.json(serializeBigInt(routerWithoutPassword), {
			status: 201,
		});
	} catch (error) {
		console.error("Failed to create router:", error);
		return NextResponse.json(
			{ error: "Failed to create router" },
			{ status: 500 },
		);
	}
}
