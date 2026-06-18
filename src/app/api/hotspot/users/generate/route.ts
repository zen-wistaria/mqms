import { type NextRequest, NextResponse } from "next/server";
import { executeRestCommand } from "@/lib/mikrotik";
import { requireRouterAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

// Helper to get router config
async function getRouterConfig(routerId: string | null) {
	if (!routerId) {
		throw new Error("Router ID is required");
	}

	const router = await prisma.router.findUnique({
		where: { id: routerId },
	});

	if (!router) {
		throw new Error("Router not found");
	}

	return {
		ipAddress: router.ipAddress,
		port: router.port,
		useSSL: router.useSSL,
		username: router.username,
		password: router.password,
	};
}

// Helper to generate random string
function generateRandomString(length: number, chars: string) {
	let result = "";
	for (let i = 0; i < length; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
}

export async function POST(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const routerId = searchParams.get("routerId");

		if (!routerId) throw new Error("Router ID is required");
		await requireRouterAccess(routerId);

		const config = await getRouterConfig(routerId);

		const {
			qty,
			server,
			userMode,
			length,
			prefix = "",
			charType,
			profile,
			timeLimit = "0",
			dataLimit = "0",
			adcomment = "",
		} = await request.json();

		if (!qty || !profile || !userMode || !length || !charType) {
			return NextResponse.json(
				{ error: "Missing required fields" },
				{ status: 400 },
			);
		}

		const count = Number.parseInt(qty, 10);
		const len = Number.parseInt(length, 10);

		const lower = "abcdefghijklmnopqrstuvwxyz";
		const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
		const num = "0123456789";

		let uChars = "";

		switch (charType) {
			case "lower":
				uChars = lower;
				break;
			case "upper":
				uChars = upper;
				break;
			case "upplow":
				uChars = lower + upper;
				break;
			case "mix":
				uChars = lower + num;
				break;
			case "mix1":
				uChars = upper + num;
				break;
			case "mix2":
				uChars = lower + upper + num;
				break;
			case "num":
				uChars = num;
				break;
			default:
				uChars = lower + num;
		}

		const pChars = charType === "num" ? num : uChars;

		const dateStr = new Date()
			.toLocaleDateString("en-US", {
				month: "2-digit",
				day: "2-digit",
				year: "2-digit",
			})
			.replace(/\//g, ".");
		const randTag = Math.floor(100 + Math.random() * 900);
		const batchComment = `${userMode}-${randTag}-${dateStr}-${adcomment}`;

		const usersToCreate = [];

		for (let i = 0; i < count; i++) {
			let uName = "";
			let uPass = "";

			if (userMode === "up") {
				uName = prefix + generateRandomString(len, uChars);
				uPass = generateRandomString(len, pChars);
			} else {
				const sharedStr = generateRandomString(len, uChars);
				uName = prefix + sharedStr;
				uPass = uName;
			}

			const body: Record<string, string> = {
				name: uName,
				password: uPass,
				profile,
				comment: batchComment,
			};

			if (server && server !== "all") {
				body.server = server;
			}

			if (timeLimit !== "0" && timeLimit !== "") {
				body["limit-uptime"] = timeLimit;
			}

			if (dataLimit !== "0" && dataLimit !== "") {
				body["limit-bytes-total"] = dataLimit;
			}

			usersToCreate.push(body);
		}

		let successes = 0;
		let failures = 0;
		const errors: string[] = [];

		for (const u of usersToCreate) {
			const result = await executeRestCommand(
				config,
				"PUT",
				"/ip/hotspot/user",
				u,
			);
			if (result.success) {
				successes++;
			} else {
				failures++;
				errors.push(result.error || "Unknown error");
				console.error(`[generate] Failed to create user ${u.name}:`, result.error);
			}
		}

		return NextResponse.json({
			success: true,
			message: `Generated ${successes} users. ${failures > 0 ? `Failed: ${failures}. ${errors[0] || ""}` : ""}`,
			batchComment,
		});
	} catch (error) {
		const msg = error instanceof Error ? error.message : "Unknown error";
		console.error("Failed to generate hotspot users:", error);
		return NextResponse.json(
			{ error: msg || "Failed to generate hotspot users" },
			{ status: 500 },
		);
	}
}
