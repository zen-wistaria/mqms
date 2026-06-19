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

/**
 * Parse Mikhmon-format validity string into total minutes.
 * Supports: "30d", "12h", "5h30m", "1d12h", "45m", "2w", etc.
 * Returns 0 for invalid/empty input.
 */
export function parseValidityToMinutes(input: string): number {
	if (!input) return 0;

	let totalMinutes = 0;
	// Match number + unit segments: 30d, 12h, 5h30m, 2w
	const regex = /(\d+)\s*([wdhm])/gi;
	let match;
	let found = false;

	while ((match = regex.exec(input)) !== null) {
		found = true;
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
		}
	}

	return found ? totalMinutes : 0;
}

/**
 * Convert validity from Mikhmon format to RouterOS limit-uptime format.
 * Examples: "5h30m" → "330m", "30d" → "30d", "12h" → "12h"
 * RouterOS natively supports: Xs, Xm, Xh, Xd, Xw
 */
export function formatValidityForRouterOS(input: string): string {
	const minutes = parseValidityToMinutes(input);
	if (minutes <= 0) return "";

	// Use the most appropriate unit
	if (minutes % (60 * 24 * 7) === 0) {
		return `${minutes / (60 * 24 * 7)}w`;
	}
	if (minutes % (60 * 24) === 0) {
		return `${minutes / (60 * 24)}d`;
	}
	if (minutes % 60 === 0) {
		return `${minutes / 60}h`;
	}
	return `${minutes}m`;
}
