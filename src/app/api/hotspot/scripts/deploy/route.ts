import { type NextRequest, NextResponse } from "next/server";
import { executeRestCommand } from "@/lib/mikrotik";
import { prisma } from "@/lib/prisma";

async function getRouterConfig(routerId: string) {
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

/**
 * POST /api/hotspot/scripts/deploy?scriptId=xxx
 * Deploy a saved script to RouterOS as a system script.
 */
export async function POST(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const scriptId = searchParams.get("scriptId");

		if (!scriptId) throw new Error("scriptId is required");

		const script = await prisma.hotspotRouterScript.findUnique({
			where: { id: scriptId },
		});
		if (!script) {
			return NextResponse.json(
				{ error: "Script not found" },
				{ status: 404 },
			);
		}

		const config = await getRouterConfig(script.routerId);

		// Push script to RouterOS /system/script
		const result = await executeRestCommand(config, "PUT", "/system/script", {
			name: `hs-${script.type}-${script.name}`,
			source: script.content,
			policy: "ftp,reboot,read,write,policy,test,password,sniff,sensitive,romon",
		});

		if (!result.success) {
			// If script exists, update it
			const listRes = await executeRestCommand(
				config,
				"GET",
				`/system/script?name=hs-${script.type}-${script.name}`,
			);
			if (listRes.success) {
				const scriptList = (listRes.data as any[]) || [];
				const existingScript = scriptList.find(
					(s: any) => s.name === `hs-${script.type}-${script.name}`,
				);
				if (existingScript) {
					const updateResult = await executeRestCommand(
						config,
						"PATCH",
						`/system/script/${encodeURIComponent(existingScript[".id"])}`,
						{ source: script.content },
					);
					if (!updateResult.success) {
						return NextResponse.json(
							{ error: updateResult.error },
							{ status: 500 },
						);
					}
				} else {
					return NextResponse.json(
						{ error: result.error },
						{ status: 500 },
					);
				}
			} else {
				return NextResponse.json({ error: result.error }, { status: 500 });
			}
		}

		// Mark as deployed
		await prisma.hotspotRouterScript.update({
			where: { id: scriptId },
			data: { deployed: true },
		});

		return NextResponse.json({
			success: true,
			message: `Script "${script.name}" deployed to RouterOS`,
		});
	} catch (error: unknown) {
		if (error instanceof Response) return error;
		const msg = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
