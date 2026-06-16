import { type NextRequest, NextResponse } from "next/server";
import { testConnection, testConnectionPlain } from "@/lib/mikrotik";
import { prisma } from "@/lib/prisma";

interface RouteParams {
	params: Promise<{ id: string }>;
}

// POST /api/routers/:id/test — Test connection to router
export async function POST(request: NextRequest, { params }: RouteParams) {
	try {
		const { id } = await params;

		// Support testing with provided credentials (before saving) or existing router
		if (id === "new") {
			const body = await request.json();
			const result = await testConnectionPlain({
				ipAddress: body.ipAddress,
				port: body.port || 443,
				useSSL: body.useSSL ?? true,
				username: body.username,
				password: body.password,
			});
			return NextResponse.json(result);
		}

		const router = await prisma.router.findUnique({
			where: { id },
		});

		if (!router) {
			return NextResponse.json({ error: "Router not found" }, { status: 404 });
		}

		const result = await testConnection({
			ipAddress: router.ipAddress,
			port: router.port,
			useSSL: router.useSSL,
			username: router.username,
			password: router.password,
		});

		// Update router status based on test result
		await prisma.router.update({
			where: { id },
			data: {
				status: result.success ? "online" : "error",
				errorMessage: result.success ? null : result.message,
			},
		});

		return NextResponse.json(result);
	} catch (error) {
		console.error("Failed to test router connection:", error);
		return NextResponse.json(
			{ success: false, message: `Test failed: ${String(error)}` },
			{ status: 500 },
		);
	}
}
