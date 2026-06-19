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

	for (const q of queueData) {
		// Upsert queue record
		const queue = await prisma.queue.upsert({
			where: {
				routerId_name: {
					routerId,
					name: q.name,
				},
			},
			create: {
				routerId,
				name: q.name,
				target: q.target,
				maxLimit: q["max-limit"] || "0/0",
				limitAt: q["limit-at"] || "0/0",
				parent: q.parent ?? "",
				isDeleted: false,
				lastSeenAt: new Date(),
			},
			update: {
				target: q.target,
				maxLimit: q["max-limit"] || "0/0",
				limitAt: q["limit-at"] || "0/0",
				parent: q.parent ?? "",
				isDeleted: false,
				lastSeenAt: new Date(),
			},
		});

		// Parse bytes and rate
		const bytes = parseMikrotikBytes(q.bytes);
		const rate = parseMikrotikRate(q.rate);
		const totalBytes = bytes.upload + bytes.download;

		historyRecords.push({
			queueId: queue.id,
			routerId,
			uploadBytes: bytes.upload,
			downloadBytes: bytes.download,
			totalBytes,
			rateUpload: rate.upload,
			rateDownload: rate.download,
			packetRate: q["packet-rate"] || null,
		});
	}

	// Batch insert history records
	if (historyRecords.length > 0) {
		await prisma.queueHistory.createMany({
			data: historyRecords,
		});
	}
}
