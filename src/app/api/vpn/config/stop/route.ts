import { NextResponse } from "next/server";
import { requireRole } from "@/lib/permissions";
import { stopWireguard } from "@/lib/wireguard";

// POST /api/vpn/config/stop — stop wireguard
export async function POST() {
	try {
		await requireRole("admin");
		const result = stopWireguard();
		if (!result.success) {
			return NextResponse.json({ error: result.message }, { status: 500 });
		}
		return NextResponse.json({ success: true, message: result.message });
	} catch (error: unknown) {
		if (error instanceof Response) return error;
		const msg = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
