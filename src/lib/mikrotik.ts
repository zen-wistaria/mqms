import https from "node:https";
import axios, { type AxiosInstance } from "axios";
import { decrypt } from "./encryption";

export interface MikrotikQueueData {
	".id": string;
	name: string;
	target: string;
	"max-limit"?: string;
	bytes: string; // "upload/download" format
	rate: string; // "upload/download" format
	"packet-rate"?: string;
	disabled?: string;
	dynamic?: string;
	comment?: string;
}

interface RouterConfig {
	ipAddress: string;
	port: number;
	useSSL: boolean;
	username: string;
	password: string; // Encrypted
}

/**
 * Create an axios instance configured for a MikroTik router's REST API.
 */
function createClient(config: RouterConfig): AxiosInstance {
	const decryptedPassword = decrypt(config.password);
	const protocol = config.useSSL ? "https" : "http";
	const baseURL = `${protocol}://${config.ipAddress}:${config.port}/rest`;

	return axios.create({
		baseURL,
		auth: {
			username: config.username,
			password: decryptedPassword,
		},
		timeout: 30000,
		// Skip TLS verification for self-signed certs
		httpsAgent: config.useSSL
			? new https.Agent({ rejectUnauthorized: false })
			: undefined,
	});
}

/**
 * Test connection to a MikroTik router.
 * Returns true if connection is successful.
 */
export async function testConnection(
	config: RouterConfig,
): Promise<{ success: boolean; message: string }> {
	try {
		const client = createClient(config);
		const response = await client.get("/system/identity");
		const identity =
			response.data?.name || response.data?.[0]?.name || "Unknown";
		return {
			success: true,
			message: `Connected successfully. Router identity: ${identity}`,
		};
	} catch (error) {
		if (axios.isAxiosError(error)) {
			if (error.code === "ECONNREFUSED") {
				return {
					success: false,
					message: "Connection refused. Check IP and port.",
				};
			}
			if (error.code === "ETIMEDOUT" || error.code === "ECONNABORTED") {
				return { success: false, message: "Connection timed out." };
			}
			if (error.response?.status === 401) {
				return {
					success: false,
					message: "Authentication failed. Check username/password.",
				};
			}
			if (error.response?.status === 403) {
				return {
					success: false,
					message: "Access forbidden. Check user permissions.",
				};
			}
			return {
				success: false,
				message: `Connection error: ${error.message}`,
			};
		}
		return {
			success: false,
			message: `Unexpected error: ${String(error)}`,
		};
	}
}

/**
 * Test connection using plaintext password (for testing before saving).
 */
export async function testConnectionPlain(config: {
	ipAddress: string;
	port: number;
	useSSL: boolean;
	username: string;
	password: string; // Plaintext
}): Promise<{ success: boolean; message: string }> {
	try {
		const protocol = config.useSSL ? "https" : "http";
		const baseURL = `${protocol}://${config.ipAddress}:${config.port}/rest`;

		const client = axios.create({
			baseURL,
			auth: {
				username: config.username,
				password: config.password,
			},
			timeout: 30000,
			httpsAgent: config.useSSL
				? new https.Agent({ rejectUnauthorized: false })
				: undefined,
		});

		const response = await client.get("/system/identity");
		const identity =
			response.data?.name || response.data?.[0]?.name || "Unknown";
		return {
			success: true,
			message: `Connected successfully. Router identity: ${identity}`,
		};
	} catch (error) {
		if (axios.isAxiosError(error)) {
			if (error.code === "ECONNREFUSED") {
				return {
					success: false,
					message: "Connection refused. Check IP and port.",
				};
			}
			if (error.code === "ETIMEDOUT" || error.code === "ECONNABORTED") {
				return { success: false, message: "Connection timed out." };
			}
			if (error.response?.status === 401) {
				return {
					success: false,
					message: "Authentication failed. Check username/password.",
				};
			}
			return {
				success: false,
				message: `Connection error: ${error.message}`,
			};
		}
		return {
			success: false,
			message: `Unexpected error: ${String(error)}`,
		};
	}
}

/**
 * Fetch all Simple Queue data with statistics from a MikroTik router.
 */
export async function fetchQueues(
	config: RouterConfig,
): Promise<MikrotikQueueData[]> {
	const client = createClient(config);
	const response = await client.get("/queue/simple");
	return response.data as MikrotikQueueData[];
}

/**
 * Execute an arbitrary REST command on the MikroTik router.
 */
export async function executeRestCommand(
	config: RouterConfig,
	method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
	path: string,
	body?: Record<string, unknown>,
): Promise<{ success: boolean; data?: unknown; error?: string }> {
	try {
		const client = createClient(config);
		// Ensure path doesn't start with /rest since baseURL already has it
		const cleanPath = path.replace(/^\/?rest\//, "").replace(/^\//, "");

		const response = await client.request({
			method,
			url: `/${cleanPath}`,
			data: body,
		});

		return { success: true, data: response.data };
	} catch (error) {
		if (axios.isAxiosError(error)) {
			let errorMessage = error.message;
			if (error.response?.data) {
				errorMessage =
					typeof error.response.data === "string"
						? error.response.data
						: JSON.stringify(error.response.data);
			}
			return {
				success: false,
				error: `HTTP ${error.response?.status || "Unknown"}: ${errorMessage}`,
			};
		}
		return { success: false, error: String(error) };
	}
}
