import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Validate Mikhmon-style expired mode value.
 */
const VALID_EXPIRED_MODES = [
	"remove",
	"notice",
	"remove_record",
	"notice_record",
] as const;

function validateProfileBody(body: Record<string, unknown>) {
	const errors: string[] = [];

	if (!body.name || typeof body.name !== "string") {
		errors.push("name is required");
	}
	if (!body.routerId || typeof body.routerId !== "string") {
		errors.push("routerId is required");
	}
	if (
		body.expiredMode &&
		!VALID_EXPIRED_MODES.includes(body.expiredMode as any)
	) {
		errors.push(
			`expiredMode must be one of: ${VALID_EXPIRED_MODES.join(", ")}`,
		);
	}
	if (body.sharedUsers !== undefined && (typeof body.sharedUsers !== "number" || body.sharedUsers < 1)) {
		errors.push("sharedUsers must be a positive number");
	}
	if (body.price !== undefined && typeof body.price !== "number") {
		errors.push("price must be a number");
	}
	if (body.sellPrice !== undefined && typeof body.sellPrice !== "number") {
		errors.push("sellPrice must be a number");
	}

	return errors;
}

// GET /api/hotspot/profiles/local?routerId=xxx — list local profile metadata
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const routerId = searchParams.get("routerId");
		const id = searchParams.get("id");

		if (id) {
			const profile = await prisma.hotspotProfile.findUnique({
				where: { id },
			});
			if (!profile) {
				return NextResponse.json(
					{ error: "Profile not found" },
					{ status: 404 },
				);
			}
			return NextResponse.json(profile);
		}

		const where = routerId ? { routerId } : {};
		const profiles = await prisma.hotspotProfile.findMany({
			where,
			orderBy: { name: "asc" },
		});

		return NextResponse.json(profiles);
	} catch (error: unknown) {
		if (error instanceof Response) return error;
		const msg = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}

// POST /api/hotspot/profiles/local — create local profile metadata
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const errors = validateProfileBody(body);
		if (errors.length > 0) {
			return NextResponse.json({ error: errors.join("; ") }, { status: 400 });
		}

		const existing = await prisma.hotspotProfile.findUnique({
			where: {
				routerId_name: {
					routerId: body.routerId,
					name: body.name,
				},
			},
		});

		if (existing) {
			return NextResponse.json(
				{ error: "Profile already exists for this router" },
				{ status: 409 },
			);
		}

		const profile = await prisma.hotspotProfile.create({
			data: {
				name: body.name,
				routerId: body.routerId,
				sharedUsers: body.sharedUsers ?? 1,
				rateLimit: body.rateLimit || null,
				addressPool: body.addressPool || null,
				macCookie: body.macCookie ?? false,
				server: body.server || "all",
				expiredMode: body.expiredMode ?? "remove",
				price: body.price ?? 0,
				sellPrice: body.sellPrice ?? 0,
				lockUser: body.lockUser ?? false,
				validity: body.validity ?? "",
				onLoginScript: body.onLoginScript || null,
				onLogoutScript: body.onLogoutScript || null,
			},
		});

		return NextResponse.json(profile, { status: 201 });
	} catch (error: unknown) {
		if (error instanceof Response) return error;
		const msg = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
