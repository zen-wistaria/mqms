import { type NextRequest, NextResponse } from "next/server";
import { executeRestCommand } from "@/lib/mikrotik";
import { prisma } from "@/lib/prisma";

// GET /api/queues/live?routerId=xxx — fetch live queues directly from router REST API
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const routerId = searchParams.get("routerId");

		if (!routerId) {
			return NextResponse.json(
				{ error: "Router ID is required" },
				{ status: 400 },
			);
		}

		const router = await prisma.router.findUnique({
			where: { id: routerId },
		});

		if (!router) {
			return NextResponse.json({ error: "Router not found" }, { status: 404 });
		}

		const config = {
			ipAddress: router.ipAddress,
			port: router.port,
			useSSL: router.useSSL,
			username: router.username,
			password: router.password,
		};

		const queuesRes = await executeRestCommand(config, "GET", "/queue/simple");

		if (!queuesRes.success) {
			return NextResponse.json({ error: queuesRes.error }, { status: 500 });
		}

		const queues = (queuesRes.data as any[]) || [];

		const result = queues
			.filter((q: any) => q.dynamic !== "true")
			.map((q: any) => {
				const [rateUp, rateDn] = (q.rate || "0/0").split("/");
				const bytesIn = Number(q.bytes?.split("/")?.[0] || 0);
				const bytesOut = Number(q.bytes?.split("/")?.[1] || 0);

				return {
					".id": q[".id"],
					name: q.name,
					target: q.target || "",
					uploadBytes: bytesIn,
					downloadBytes: bytesOut,
					totalBytes: bytesIn + bytesOut,
					rateUpload: rateUp || "0",
					rateDownload: rateDn || "0",
					maxLimit: q["max-limit"] || "0/0",
					disabled: q.disabled === "true",
				};
			});

		return NextResponse.json(result);
	} catch (error) {
		const msg = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
