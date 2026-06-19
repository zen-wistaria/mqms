import { type NextRequest, NextResponse } from "next/server";
import { executeRestCommand } from "@/lib/mikrotik";
import { prisma } from "@/lib/prisma";

async function getRouterConfig(routerId: string | null) {
	if (!routerId) throw new Error("Router ID is required");
	const router = await prisma.router.findUnique({ where: { id: routerId } });
	if (!router) throw new Error("Router not found");
	return {
		ipAddress: router.ipAddress,
		port: router.port,
		useSSL: router.useSSL,
		username: router.username,
		password: router.password,
	};
}

// PATCH /api/hotspot/users/[id]?routerId=xxx&action=enable|disable|reset-counters|reset-uptime
export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { searchParams } = new URL(request.url);
		const routerId = searchParams.get("routerId");
		const action = searchParams.get("action");
		const { id } = await params;

		if (!action) {
			return NextResponse.json(
				{
					error:
						"Action is required (enable/disable/reset-counters/reset-uptime)",
				},
				{ status: 400 },
			);
		}

		const config = await getRouterConfig(routerId);
		const path = `/ip/hotspot/user/${encodeURIComponent(id)}`;

		switch (action) {
			case "enable": {
				const result = await executeRestCommand(config, "PATCH", path, {
					disabled: "no",
				});
				if (!result.success) {
					return NextResponse.json({ error: result.error }, { status: 500 });
				}
				return NextResponse.json({ success: true, action: "enabled" });
			}

			case "disable": {
				const result = await executeRestCommand(config, "PATCH", path, {
					disabled: "yes",
				});
				if (!result.success) {
					return NextResponse.json({ error: result.error }, { status: 500 });
				}
				return NextResponse.json({ success: true, action: "disabled" });
			}

			case "reset-counters": {
				// RouterOS v7 REST API: POST /ip/hotspot/user/reset-counters
				// with body { ".id": "..." } or { "numbers": "..." }
				const result = await executeRestCommand(
					config,
					"POST",
					"/ip/hotspot/user/reset-counters",
					{ ".id": id },
				);
				if (!result.success) {
					return NextResponse.json({ error: result.error }, { status: 500 });
				}
				return NextResponse.json({ success: true, action: "counters-reset" });
			}

			case "reset-uptime": {
				// Reset uptime = kick active session for this user
				// First get active sessions and find by user .id
				const activeRes = await executeRestCommand(
					config,
					"GET",
					"/ip/hotspot/active",
				);
				if (!activeRes.success) {
					return NextResponse.json({ error: activeRes.error }, { status: 500 });
				}

				const sessions = (activeRes.data as any[]) || [];

				// Get user name first to match session
				const userRes = await executeRestCommand(
					config,
					"GET",
					`/ip/hotspot/user/${encodeURIComponent(id)}`,
				);
				if (!userRes.success) {
					return NextResponse.json({ error: userRes.error }, { status: 500 });
				}

				const userData = (userRes.data as any) || {};
				const userName = userData.name || "";

				if (!userName) {
					return NextResponse.json(
						{ error: "User not found" },
						{ status: 404 },
					);
				}

				// Find session that matches this user's name
				const userSession = sessions.find((s: any) => s.user === userName);

				if (!userSession) {
					return NextResponse.json({
						success: true,
						action: "uptime-reset",
						note: "No active session to kick",
					});
				}

				// Kick the session
				const kickResult = await executeRestCommand(
					config,
					"DELETE",
					`/ip/hotspot/active/${encodeURIComponent(userSession[".id"])}`,
				);

				if (!kickResult.success) {
					return NextResponse.json(
						{ error: kickResult.error },
						{ status: 500 },
					);
				}

				return NextResponse.json({
					success: true,
					action: "uptime-reset",
				});
			}

			default:
				return NextResponse.json(
					{
						error:
							"Unknown action. Use: enable, disable, reset-counters, reset-uptime",
					},
					{ status: 400 },
				);
		}
	} catch (error) {
		const msg = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
