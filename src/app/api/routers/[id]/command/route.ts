import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { executeRestCommand } from "@/lib/mikrotik";
import { prisma } from "@/lib/prisma";

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		// Verify authentication
		const session = await auth.api.getSession({
			headers: await headers(),
		});

		if (!session) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { id } = await params;
		const body = await request.json();

		const { method, path, commandBody } = body;

		if (!method || !path) {
			return NextResponse.json(
				{ error: "Method and path are required" },
				{ status: 400 },
			);
		}

		// Fetch router details
		const router = await prisma.router.findUnique({
			where: { id },
		});

		if (!router) {
			return NextResponse.json({ error: "Router not found" }, { status: 404 });
		}

		// Execute the command on the router
		const result = await executeRestCommand(
			router,
			method as "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
			path,
			commandBody,
		);

		if (!result.success) {
			return NextResponse.json(
				{ error: result.error || "Execution failed" },
				{ status: 400 },
			);
		}

		return NextResponse.json({
			success: true,
			data: result.data,
		});
	} catch (error) {
		console.error("API error executing router command:", error);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 },
		);
	}
}
