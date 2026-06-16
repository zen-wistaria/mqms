/**
 * Format bytes into human-readable string (KB, MB, GB, TB)
 */
export function formatBytes(bytes: number | bigint): string {
	const num = typeof bytes === "bigint" ? Number(bytes) : bytes;
	if (num === 0) return "0 B";

	const units = ["B", "KB", "MB", "GB", "TB", "PB"];
	const k = 1024;
	const i = Math.floor(Math.log(Math.abs(num)) / Math.log(k));
	const value = num / k ** i;

	return `${value.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

/**
 * Format rate string (e.g. "108.9kbps" or "1.2Mbps")
 */
export function formatRate(rate: string | null | undefined): string {
	if (!rate) return "0 bps";
	return rate;
}

/**
 * Parse MikroTik bytes string "uploadBytes/downloadBytes" into separate values.
 * e.g. "6445155608/73597942054" → { upload: 6445155608n, download: 73597942054n }
 */
export function parseMikrotikBytes(bytesStr: string): {
	upload: bigint;
	download: bigint;
} {
	const parts = bytesStr.split("/");
	if (parts.length !== 2) {
		return { upload: BigInt(0), download: BigInt(0) };
	}
	return {
		upload: BigInt(parts[0]),
		download: BigInt(parts[1]),
	};
}

/**
 * Parse MikroTik rate string "uploadRate/downloadRate" into separate values.
 * e.g. "108.9kbps/1162.5kbps" → { upload: "108.9kbps", download: "1162.5kbps" }
 */
export function parseMikrotikRate(rateStr: string): {
	upload: string;
	download: string;
} {
	const parts = rateStr.split("/");
	if (parts.length !== 2) {
		return { upload: "0bps", download: "0bps" };
	}
	return {
		upload: parts[0],
		download: parts[1],
	};
}

/**
 * Convert BigInt to number for JSON serialization.
 * Safe for values up to Number.MAX_SAFE_INTEGER.
 */
export function bigIntToNumber(value: bigint): number {
	if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
		// For extremely large values, return as close as possible
		return Number(value);
	}
	return Number(value);
}

/**
 * Serialize an object that might contain BigInt values for JSON response.
 * Converts all BigInt values to numbers.
 */
export function serializeBigInt<T>(obj: T): T {
	return JSON.parse(
		JSON.stringify(obj, (_key, value) =>
			typeof value === "bigint" ? Number(value) : value,
		),
	) as T;
}
