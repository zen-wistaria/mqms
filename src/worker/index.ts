import "dotenv/config";
import { pollAllRouters } from "./poller";
import { syncAllRouters } from "./syncer";
import { checkExpiredUsers } from "./expiry";

const POLLING_INTERVAL = Number(process.env.POLLING_INTERVAL_MS || "60000");
const SYNC_INTERVAL = Number(process.env.SYNC_INTERVAL_MS || "300000");
const EXPIRY_INTERVAL = Number(process.env.EXPIRY_INTERVAL_MS || "300000"); // 5 min

let isShuttingDown = false;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let syncTimer: ReturnType<typeof setInterval> | null = null;
let expiryTimer: ReturnType<typeof setInterval> | null = null;

async function runPollCycle() {
	if (isShuttingDown) return;
	try {
		console.log(`[Worker] Starting poll cycle at ${new Date().toISOString()}`);
		await pollAllRouters();
		console.log(`[Worker] Poll cycle completed`);
	} catch (error) {
		console.error("[Worker] Poll cycle error:", error);
	}
}

async function runSyncCycle() {
	if (isShuttingDown) return;
	try {
		console.log(`[Worker] Starting sync cycle at ${new Date().toISOString()}`);
		await syncAllRouters();
		console.log(`[Worker] Sync cycle completed`);
	} catch (error) {
		console.error("[Worker] Sync cycle error:", error);
	}
}

async function runExpiryCycle() {
	if (isShuttingDown) return;
	try {
		console.log(`[Worker] Starting expiry check at ${new Date().toISOString()}`);
		await checkExpiredUsers();
		console.log(`[Worker] Expiry check completed`);
	} catch (error) {
		console.error("[Worker] Expiry cycle error:", error);
	}
}

function shutdown() {
	if (isShuttingDown) return;
	isShuttingDown = true;
	console.log("[Worker] Shutting down gracefully...");

	if (pollTimer) clearInterval(pollTimer);
	if (syncTimer) clearInterval(syncTimer);
	if (expiryTimer) clearInterval(expiryTimer);

	process.exit(0);
}

async function main() {
	console.log("[Worker] MQMS Background Worker starting...");
	console.log(`[Worker] Polling interval: ${POLLING_INTERVAL}ms`);
	console.log(`[Worker] Sync interval: ${SYNC_INTERVAL}ms`);
	console.log(`[Worker] Expiry check interval: ${EXPIRY_INTERVAL}ms`);

	// Graceful shutdown handlers
	process.on("SIGINT", shutdown);
	process.on("SIGTERM", shutdown);

	// Run initial cycles
	await runPollCycle();
	await runSyncCycle();
	await runExpiryCycle();

	// Start interval loops
	pollTimer = setInterval(runPollCycle, POLLING_INTERVAL);
	syncTimer = setInterval(runSyncCycle, SYNC_INTERVAL);
	expiryTimer = setInterval(runExpiryCycle, EXPIRY_INTERVAL);

	console.log("[Worker] Background worker is running. Press Ctrl+C to stop.");
}

main().catch((error) => {
	console.error("[Worker] Fatal error:", error);
	process.exit(1);
});
