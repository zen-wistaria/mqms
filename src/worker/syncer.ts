import { fetchQueues } from "@/lib/mikrotik";
import { prisma } from "@/lib/prisma";

/**
 * Sync queues: detect deleted queues on routers and mark them in DB.
 */
export async function syncAllRouters(): Promise<void> {
	const routers = await prisma.router.findMany({
		where: { isActive: true, status: "online" },
	});

	console.log(`[Syncer] Syncing ${routers.length} online routers...`);

	for (const router of routers) {
		try {
			const queueData = await fetchQueues({
				ipAddress: router.ipAddress,
				port: router.port,
				useSSL: router.useSSL,
				username: router.username,
				password: router.password,
			});

			// Get current queue names from router
			const routerQueueNames = new Set(queueData.map((q) => q.name));

			// Get all active queues in DB for this router
			const dbQueues = await prisma.queue.findMany({
				where: {
					routerId: router.id,
					isDeleted: false,
				},
			});

			// Mark queues as deleted if not found on router
			let deletedCount = 0;
			for (const dbQueue of dbQueues) {
				if (!routerQueueNames.has(dbQueue.name)) {
					await prisma.queue.update({
						where: { id: dbQueue.id },
						data: { isDeleted: true },
					});
					deletedCount++;
				}
			}

			// Restore queues that reappeared
			let restoredCount = 0;
			const deletedDbQueues = await prisma.queue.findMany({
				where: {
					routerId: router.id,
					isDeleted: true,
				},
			});

			for (const deletedQueue of deletedDbQueues) {
				if (routerQueueNames.has(deletedQueue.name)) {
					await prisma.queue.update({
						where: { id: deletedQueue.id },
						data: { isDeleted: false, lastSeenAt: new Date() },
					});
					restoredCount++;
				}
			}

			if (deletedCount > 0 || restoredCount > 0) {
				console.log(
					`[Syncer] Router "${router.name}": ${deletedCount} deleted, ${restoredCount} restored`,
				);
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			console.error(`[Syncer] Router "${router.name}" failed: ${message}`);
		}

		await new Promise((resolve) => setTimeout(resolve, 100));
	}
}
