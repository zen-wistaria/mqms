import { executeRestCommand } from "@/lib/mikrotik";
import { prisma } from "@/lib/prisma";
import { parseValidityToMinutes } from "@/lib/format";

interface RouterConfig {
	ipAddress: string;
	port: number;
	useSSL: boolean;
	username: string;
	password: string;
}

async function getRouterConfig(
	routerId: string,
): Promise<RouterConfig | null> {
	try {
		const router = await prisma.router.findUnique({
			where: { id: routerId },
		});
		if (!router || !router.isActive) return null;
		return {
			ipAddress: router.ipAddress,
			port: router.port,
			useSSL: router.useSSL,
			username: router.username,
			password: router.password,
		};
	} catch {
		return null;
	}
}

/**
 * Check and process expired hotspot users for all active routers.
 * Called periodically by the worker.
 */
export async function checkExpiredUsers(): Promise<void> {
	const routers = await prisma.router.findMany({
		where: { isActive: true },
	});

	for (const router of routers) {
		try {
			await processExpiredUsers(router.id);
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error);
			console.error(`[Expiry] Router "${router.name}" error: ${msg}`);
		}
	}
}

async function processExpiredUsers(routerId: string): Promise<void> {
	const config = await getRouterConfig(routerId);
	if (!config) return;

	// Get all hotspot users from RouterOS
	const result = await executeRestCommand(config, "GET", "/ip/hotspot/user");
	if (!result.success) {
		console.error(`[Expiry] Failed to fetch users for router ${routerId}`);
		return;
	}

	const users = (result.data as any[]) || [];

	// Get local profile metadata to know expired mode
	const localProfiles = await prisma.hotspotProfile.findMany({
		where: { routerId },
	});
	const profileMap = new Map(
		localProfiles.map((p) => [p.name, p]),
	);

	let processed = 0;

	for (const user of users) {
		const limitUptime = user["limit-uptime"];
		const uptime = user["uptime"] || "0s";
		const disabled = user.disabled === "true";

		// Skip disabled users or those without time limit
		if (disabled || !limitUptime) continue;

		// Parse limit-uptime (RouterOS format) to minutes
		const limitMinutes = parseRouterOSTimeLimit(limitUptime);
		const uptimeMinutes = parseRouterOSTimeLimit(uptime);
		if (limitMinutes <= 0 || uptimeMinutes <= limitMinutes) continue;

		// User is expired — process according to profile's expired mode
		const profile = profileMap.get(user.profile || "default");
		const expiredMode = profile?.expiredMode || "remove";

		try {
			await handleExpiredUser(
				config,
				routerId,
				user,
				expiredMode,
			);
			processed++;
		} catch (err) {
			console.error(
				`[Expiry] Failed to process user ${user.name}:`,
				err,
			);
		}
	}

	if (processed > 0) {
		console.log(`[Expiry] Router ${routerId}: ${processed} expired users processed`);
	}
}

async function handleExpiredUser(
	config: RouterConfig,
	routerId: string,
	user: any,
	expiredMode: string,
): Promise<void> {
	const userId = user[".id"];
	const userName = user.name;

	switch (expiredMode) {
		case "remove": {
			// Delete user from RouterOS
			await executeRestCommand(
				config,
				"DELETE",
				`/ip/hotspot/user/${encodeURIComponent(userId)}`,
			);
			// Update transaction status
			await prisma.hotspotTransaction.updateMany({
				where: { username: userName, routerId, status: "active" },
				data: { status: "removed" },
			});
			break;
		}

		case "remove_record": {
			// Delete user + mark transaction expired
			await executeRestCommand(
				config,
				"DELETE",
				`/ip/hotspot/user/${encodeURIComponent(userId)}`,
			);
			await prisma.hotspotTransaction.updateMany({
				where: { username: userName, routerId, status: "active" },
				data: { status: "expired" },
			});
			break;
		}

		case "notice": {
			// Set comment to EXPIRED, keep user
			const newComment = user.comment
				? `[EXPIRED ${new Date().toISOString().slice(0, 10)}] ${user.comment}`
				: `EXPIRED ${new Date().toISOString().slice(0, 10)}`;
			await executeRestCommand(
				config,
				"PATCH",
				`/ip/hotspot/user/${encodeURIComponent(userId)}`,
				{ comment: newComment },
			);
			break;
		}

		case "notice_record": {
			// Set comment to EXPIRED + mark transaction expired
			const newComment = user.comment
				? `[EXPIRED ${new Date().toISOString().slice(0, 10)}] ${user.comment}`
				: `EXPIRED ${new Date().toISOString().slice(0, 10)}`;
			await executeRestCommand(
				config,
				"PATCH",
				`/ip/hotspot/user/${encodeURIComponent(userId)}`,
				{ comment: newComment },
			);
			await prisma.hotspotTransaction.updateMany({
				where: { username: userName, routerId, status: "active" },
				data: { status: "expired" },
			});
			break;
		}
	}

	// Log the action
	console.log(
		`[Expiry] User "${userName}" — mode: ${expiredMode}`,
	);
}

/**
 * Parse RouterOS time limit format to total minutes.
 * RouterOS format: Xs, Xm, Xh, Xd, Xw, or combined 5h30m
 */
function parseRouterOSTimeLimit(input: string): number {
	if (!input) return 0;

	const regex = /(\d+)\s*([smhdw])/gi;
	let match;
	let totalMinutes = 0;

	while ((match = regex.exec(input)) !== null) {
		const value = Number.parseInt(match[1], 10);
		const unit = match[2].toLowerCase();

		switch (unit) {
			case "w":
				totalMinutes += value * 7 * 24 * 60;
				break;
			case "d":
				totalMinutes += value * 24 * 60;
				break;
			case "h":
				totalMinutes += value * 60;
				break;
			case "m":
				totalMinutes += value;
				break;
			case "s":
				totalMinutes += value / 60;
				break;
		}
	}

	return totalMinutes;
}
