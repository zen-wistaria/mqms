import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { pollAllRouters } from "./poller";
import { syncAllRouters } from "./syncer";
import { checkExpiredUsers } from "./expiry";

const POLLING_INTERVAL = Number(process.env.POLLING_INTERVAL_MS || "60000");
const SYNC_INTERVAL = Number(process.env.SYNC_INTERVAL_MS || "300000");
const EXPIRY_INTERVAL = Number(process.env.EXPIRY_INTERVAL_MS || "300000"); // 5 min
const RETENTION_DAYS = Number(process.env.HISTORY_RETENTION_DAYS || "7"); // 7 days retention
const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

let isShuttingDown = false;
let isPolling = false;
let isSyncing = false;
let isExpiring = false;
let isCleaning = false;

let pollTimer: ReturnType<typeof setTimeout> | null = null;
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let expiryTimer: ReturnType<typeof setTimeout> | null = null;
let cleanupTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Configure SQLite PRAGMAs for optimal concurrency and crash resilience.
 */
async function initDatabase() {
	try {
		await prisma.$queryRawUnsafe("PRAGMA journal_mode = WAL;");
		await prisma.$queryRawUnsafe("PRAGMA busy_timeout = 5000;");
		await prisma.$queryRawUnsafe("PRAGMA synchronous = NORMAL;");
		console.log("[Worker] SQLite configured: WAL mode, busy_timeout=5000ms, synchronous=NORMAL");
	} catch (error) {
		console.warn("[Worker] Warning: Failed to set SQLite PRAGMAs:", error);
	}
}

async function runPollCycle() {
	if (isShuttingDown) return;
	if (isPolling) {
		console.warn("[Worker] Previous poll cycle still running, skipping interval");
		return;
	}

	isPolling = true;
	try {
		console.log(`[Worker] Starting poll cycle at ${new Date().toISOString()}`);
		await pollAllRouters();
		console.log(`[Worker] Poll cycle completed`);
	} catch (error) {
		console.error("[Worker] Poll cycle error:", error);
	} finally {
		isPolling = false;
		if (!isShuttingDown) {
			pollTimer = setTimeout(runPollCycle, POLLING_INTERVAL);
		}
	}
}

async function runSyncCycle() {
	if (isShuttingDown) return;
	if (isSyncing) {
		console.warn("[Worker] Previous sync cycle still running, skipping interval");
		return;
	}

	isSyncing = true;
	try {
		console.log(`[Worker] Starting sync cycle at ${new Date().toISOString()}`);
		await syncAllRouters();
		console.log(`[Worker] Sync cycle completed`);
	} catch (error) {
		console.error("[Worker] Sync cycle error:", error);
	} finally {
		isSyncing = false;
		if (!isShuttingDown) {
			syncTimer = setTimeout(runSyncCycle, SYNC_INTERVAL);
		}
	}
}

async function runExpiryCycle() {
	if (isShuttingDown) return;
	if (isExpiring) {
		console.warn("[Worker] Previous expiry check still running, skipping interval");
		return;
	}

	isExpiring = true;
	try {
		console.log(`[Worker] Starting expiry check at ${new Date().toISOString()}`);
		await checkExpiredUsers();
		console.log(`[Worker] Expiry check completed`);
	} catch (error) {
		console.error("[Worker] Expiry cycle error:", error);
	} finally {
		isExpiring = false;
		if (!isShuttingDown) {
			expiryTimer = setTimeout(runExpiryCycle, EXPIRY_INTERVAL);
		}
	}
}

async function runCleanupCycle() {
	if (isShuttingDown) return;
	if (isCleaning) return;

	isCleaning = true;
	try {
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
		console.log(`[Worker] Running queue history cleanup (cutoff: ${cutoffDate.toISOString()})...`);

		const result = await prisma.queueHistory.deleteMany({
			where: {
				timestamp: { lt: cutoffDate },
			},
		});

		if (result.count > 0) {
			console.log(`[Worker] Cleaned up ${result.count} old history records`);
		}
	} catch (error) {
		console.error("[Worker] Cleanup cycle error:", error);
	} finally {
		isCleaning = false;
		if (!isShuttingDown) {
			cleanupTimer = setTimeout(runCleanupCycle, CLEANUP_INTERVAL);
		}
	}
}

async function shutdown() {
	if (isShuttingDown) return;
	isShuttingDown = true;
	console.log("[Worker] Shutting down gracefully...");

	if (pollTimer) clearTimeout(pollTimer);
	if (syncTimer) clearTimeout(syncTimer);
	if (expiryTimer) clearTimeout(expiryTimer);
	if (cleanupTimer) clearTimeout(cleanupTimer);

	try {
		await prisma.$disconnect();
	} catch {}

	process.exit(0);
}

async function main() {
	console.log("[Worker] MQMS Background Worker starting...");
	console.log(`[Worker] Polling interval: ${POLLING_INTERVAL}ms`);
	console.log(`[Worker] Sync interval: ${SYNC_INTERVAL}ms`);
	console.log(`[Worker] Expiry check interval: ${EXPIRY_INTERVAL}ms`);
	console.log(`[Worker] History retention: ${RETENTION_DAYS} days`);

	// Catch unhandled errors to avoid unhandled exits
	process.on("unhandledRejection", (reason, promise) => {
		console.error("[Worker] Unhandled Rejection at:", promise, "reason:", reason);
	});
	process.on("uncaughtException", (error) => {
		console.error("[Worker] Uncaught Exception:", error);
	});

	// Graceful shutdown handlers
	process.on("SIGINT", shutdown);
	process.on("SIGTERM", shutdown);

	// Initialize database settings
	await initDatabase();

	// Run initial cycles with staggered offsets to avoid simultaneous query bursts
	await runPollCycle();
	// Stagger initial sync by 2 seconds
	syncTimer = setTimeout(runSyncCycle, 2000);
	// Stagger initial expiry check by 4 seconds
	expiryTimer = setTimeout(runExpiryCycle, 4000);
	// Initial history cleanup after 15 seconds
	cleanupTimer = setTimeout(runCleanupCycle, 15000);

	console.log("[Worker] Background worker is running. Press Ctrl+C to stop.");
}

main().catch((error) => {
	console.error("[Worker] Fatal error:", error);
	process.exit(1);
});
