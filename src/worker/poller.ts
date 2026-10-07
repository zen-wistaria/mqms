import { parseMikrotikBytes, parseMikrotikRate } from "@/lib/format";
import { fetchQueues, type MikrotikQueueData } from "@/lib/mikrotik";
import { prisma } from "@/lib/prisma";

/**
 * Poll all active routers and save queue statistics.
 */
export async function pollAllRouters(): Promise<void> {
	const routers = await prisma.router.findMany({
		where: { isActive: true },
	});

	console.log(`[Poller] Polling ${routers.length} active routers...`);

	for (const router of routers) {
		try {
			const queueData = await fetchQueues({
				ipAddress: router.ipAddress,
				port: router.port,
				useSSL: router.useSSL,
				username: router.username,
				password: router.password,
			});

			await processQueueData(router.id, queueData);

			// Update router status to online
			await prisma.router.update({
				where: { id: router.id },
				data: {
					status: "online",
					lastPollAt: new Date(),
					errorMessage: null,
				},
			});

			console.log(
				`[Poller] Router "${router.name}": ${queueData.length} queues polled`,
			);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			console.error(`[Poller] Router "${router.name}" failed: ${message}`);

			await prisma.router.update({
				where: { id: router.id },
				data: {
					status: "error",
					errorMessage: message,
					lastPollAt: new Date(),
				},
			});
		}

		// Small delay between routers to prevent overload
		await new Promise((resolve) => setTimeout(resolve, 100));
	}
}

/**
 * Process queue data from a single router.
 */
async function processQueueData(
	routerId: string,
	queueData: MikrotikQueueData[],
): Promise<void> {
	if (queueData.length === 0) return;

	// Pre-fetch all existing queues for this router to avoid N upsert queries
	const existingQueues = await prisma.queue.findMany({
		where: { routerId },
	});
	const queueMap = new Map(existingQueues.map((q) => [q.name, q]));

	const now = new Date();
	const historyRecords: Array<{
		queueId: string;
		routerId: string;
		uploadBytes: bigint;
		downloadBytes: bigint;
		totalBytes: bigint;
		rateUpload: string | null;
		rateDownload: string | null;
		packetRate: string | null;
	}> = [];

	const activeNames: string[] = [];

	for (const q of queueData) {
		activeNames.push(q.name);
		let queueId: string;
		const maxLimit = q["max-limit"] || "0/0";
		const limitAt = q["limit-at"] || "0/0";
		const parent = q.parent ?? "";

		const existing = queueMap.get(q.name);
		if (!existing) {
			const created = await prisma.queue.create({
				data: {
					routerId,
					name: q.name,
					target: q.target,
					maxLimit,
					limitAt,
					parent,
					isDeleted: false,
					lastSeenAt: now,
				},
			});
			queueId = created.id;
			queueMap.set(q.name, created);
		} else {
			queueId = existing.id;
			// Only update queue definition if attributes changed
			const hasChanged =
				existing.target !== q.target ||
				existing.maxLimit !== maxLimit ||
				existing.limitAt !== limitAt ||
				existing.parent !== parent ||
				existing.isDeleted;

			if (hasChanged) {
				await prisma.queue.update({
					where: { id: existing.id },
					data: {
						target: q.target,
						maxLimit,
						limitAt,
						parent,
						isDeleted: false,
						lastSeenAt: now,
					},
				});
			}
		}

		// Parse bytes and rate
		const bytes = parseMikrotikBytes(q.bytes);
		const rate = parseMikrotikRate(q.rate);
		const totalBytes = bytes.upload + bytes.download;

		historyRecords.push({
			queueId,
			routerId,
			uploadBytes: bytes.upload,
			downloadBytes: bytes.download,
			totalBytes,
			rateUpload: rate.upload,
			rateDownload: rate.download,
			packetRate: q["packet-rate"] || null,
		});
	}

	// Single batch update for lastSeenAt and active state
	if (activeNames.length > 0) {
		await prisma.queue.updateMany({
			where: {
				routerId,
				name: { in: activeNames },
			},
			data: {
				lastSeenAt: now,
				isDeleted: false,
			},
		});
	}

	// Batch insert history records
	if (historyRecords.length > 0) {
		await prisma.queueHistory.createMany({
			data: historyRecords,
		});
	}
}
