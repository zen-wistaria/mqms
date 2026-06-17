"use client";

import { formatDistanceToNow } from "date-fns";
import {
	AlertTriangle,
	ArrowLeft,
	ExternalLink,
	Loader2,
	RefreshCw,
	TerminalSquare,
	Wifi,
	WifiOff,
} from "lucide-react";
import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { formatBytes, parseMikrotikBytes } from "@/lib/format";

interface RouterDetail {
	id: string;
	name: string;
	ipAddress: string;
	port: number;
	useSSL: boolean;
	username: string;
	isActive: boolean;
	lastPollAt: string | null;
	status: string;
	errorMessage: string | null;
	queues: Array<{
		id: string;
		name: string;
		target: string;
		limitAt: string;
		maxLimit: string;
		parent: string;
		isDeleted: boolean;
		lastSeenAt: string;
	}>;
	_count: { queues: number };
}

export default function RouterDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	const [router, setRouter] = useState<RouterDetail | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSyncing, setIsSyncing] = useState(false);
	const [isPolling, setIsPolling] = useState(false);

	// Command Executor State
	const [cmdMethod, setCmdMethod] = useState("GET");
	const [cmdPath, setCmdPath] = useState("");
	const [cmdBody, setCmdBody] = useState("");
	const [isExecuting, setIsExecuting] = useState(false);
	const [cmdResponse, setCmdResponse] = useState<string | null>(null);

	const fetchRouter = useCallback(async () => {
		try {
			const res = await fetch(`/api/routers/${id}`);
			if (res.ok) {
				setRouter(await res.json());
			}
		} catch (error) {
			console.error("Failed to fetch router:", error);
		} finally {
			setIsLoading(false);
		}
	}, [id]);

	useEffect(() => {
		fetchRouter();
	}, [fetchRouter]);

	const handleSync = async () => {
		setIsSyncing(true);
		try {
			const res = await fetch("/api/cron/sync", { method: "POST" });
			if (res.ok) {
				toast.success("Sync completed");
				fetchRouter();
			} else {
				toast.error("Sync failed");
			}
		} catch {
			toast.error("Sync failed");
		} finally {
			setIsSyncing(false);
		}
	};

	const handlePoll = async () => {
		setIsPolling(true);
		try {
			const res = await fetch("/api/cron/poll", { method: "POST" });
			if (res.ok) {
				toast.success("Poll completed");
				fetchRouter();
			} else {
				toast.error("Poll failed");
			}
		} catch {
			toast.error("Poll failed");
		} finally {
			setIsPolling(false);
		}
	};

	const handleExecuteCommand = async () => {
		if (!cmdPath.trim()) {
			toast.error("Path is required");
			return;
		}

		setIsExecuting(true);
		setCmdResponse("Executing command...");

		try {
			let parsedBody: Record<string, unknown> | undefined;
			if (cmdBody.trim() && cmdMethod !== "GET" && cmdMethod !== "DELETE") {
				try {
					parsedBody = JSON.parse(cmdBody);
				} catch (_e) {
					toast.error("Invalid JSON body");
					setCmdResponse(
						JSON.stringify({ error: "Invalid JSON format in body" }, null, 2),
					);
					setIsExecuting(false);
					return;
				}
			}

			const res = await fetch(`/api/routers/${id}/command`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					method: cmdMethod,
					path: cmdPath,
					commandBody: parsedBody,
				}),
			});

			const data = await res.json();
			if (res.ok) {
				setCmdResponse(JSON.stringify(data.data || data, null, 2));
				toast.success("Command executed successfully");
			} else {
				setCmdResponse(JSON.stringify(data, null, 2));
				toast.error(data.error || "Command failed");
			}
		} catch (error) {
			setCmdResponse(String(error));
			toast.error("An unexpected error occurred");
		} finally {
			setIsExecuting(false);
		}
	};

	if (isLoading) {
		return (
			<div className="space-y-6">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-32 w-full" />
				<Skeleton className="h-64 w-full" />
			</div>
		);
	}

	if (!router) {
		return (
			<div className="flex flex-col items-center justify-center h-64 gap-4">
				<p className="text-muted-foreground">Router not found</p>
				<Button variant="outline" render={<Link href="/routers" />}>
					<ArrowLeft className="mr-2 h-4 w-4" /> Back to Routers
				</Button>
			</div>
		);
	}

	const statusIcon =
		router.status === "online" ? (
			<Wifi className="h-5 w-5 text-green-400" />
		) : router.status === "error" ? (
			<AlertTriangle className="h-5 w-5 text-yellow-400" />
		) : (
			<WifiOff className="h-5 w-5 text-red-400" />
		);

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-2">
				<Button variant="ghost" size="icon" render={<Link href="/routers" />}>
					<ArrowLeft className="h-4 w-4" />
				</Button>
				<div className="flex-1">
					<h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
						{statusIcon}
						{router.name}
					</h2>
					<p className="text-muted-foreground font-mono text-sm">
						{router.ipAddress}:{router.port}
						{router.useSSL ? " (SSL)" : ""}
					</p>
				</div>
				<div className="flex gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={handleSync}
						disabled={isSyncing}
					>
						{isSyncing ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : (
							<RefreshCw className="mr-2 h-4 w-4" />
						)}
						Sync Now
					</Button>
					<Button size="sm" onClick={handlePoll} disabled={isPolling}>
						{isPolling ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : (
							<RefreshCw className="mr-2 h-4 w-4" />
						)}
						Poll Now
					</Button>
				</div>
			</div>

			{/* Info Cards */}
			<div className="grid gap-4 md:grid-cols-4">
				<Card>
					<CardContent className="p-4">
						<p className="text-xs text-muted-foreground uppercase">Status</p>
						<p className="text-lg font-semibold capitalize mt-1">
							{router.status}
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4">
						<p className="text-xs text-muted-foreground uppercase">
							Active Queues
						</p>
						<p className="text-lg font-semibold mt-1">{router._count.queues}</p>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4">
						<p className="text-xs text-muted-foreground uppercase">Last Poll</p>
						<p className="text-lg font-semibold mt-1">
							{router.lastPollAt
								? formatDistanceToNow(new Date(router.lastPollAt), {
										addSuffix: true,
									})
								: "Never"}
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4">
						<p className="text-xs text-muted-foreground uppercase">Username</p>
						<p className="text-lg font-semibold mt-1">{router.username}</p>
					</CardContent>
				</Card>
			</div>

			{router.errorMessage && (
				<Card className="border-yellow-500/30 bg-yellow-500/5">
					<CardContent className="p-4">
						<p className="text-sm text-yellow-400">
							<AlertTriangle className="inline h-4 w-4 mr-1" />
							{router.errorMessage}
						</p>
					</CardContent>
				</Card>
			)}

			{/* Command Executor Card */}
			<Card className="border-primary/20 shadow-md">
				<CardHeader className="pb-3 bg-primary/5 rounded-t-xl border-b border-primary/10">
					<CardTitle className="text-base flex items-center gap-2">
						<TerminalSquare className="h-5 w-5 text-primary" />
						REST API Executor
					</CardTitle>
					<CardDescription>
						Execute arbitrary REST API commands directly on this router. <br />
						docs:{" "}
						<span className="text-blue-500">
							<Link
								target="_blank"
								className="hover:underline"
								href="https://manual.mikrotik.com/docs/developer-guides/rest-api"
							>
								https://manual.mikrotik.com/docs/developer-guides/rest-api
							</Link>
						</span>
					</CardDescription>
				</CardHeader>
				<CardContent className="pt-4 space-y-4">
					<div className="flex flex-col md:flex-row gap-3">
						<div className="w-full md:w-[150px]">
							<Select
								value={cmdMethod}
								onValueChange={(v) => setCmdMethod(v || "GET")}
							>
								<SelectTrigger>
									<SelectValue placeholder="Method" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="GET">GET</SelectItem>
									<SelectItem value="POST">POST</SelectItem>
									<SelectItem value="PUT">PUT</SelectItem>
									<SelectItem value="PATCH">PATCH</SelectItem>
									<SelectItem value="DELETE">DELETE</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="flex-1 flex gap-2 relative">
							<span className="absolute left-3 top-1.5 text-muted-foreground text-sm select-none">
								/rest/
							</span>
							<Input
								placeholder="system/identity"
								value={cmdPath}
								onChange={(e) => setCmdPath(e.target.value)}
								className="pl-14 font-mono text-sm"
								onKeyDown={(e) => {
									if (e.key === "Enter" && !e.shiftKey) {
										e.preventDefault();
										handleExecuteCommand();
									}
								}}
							/>
						</div>
						<Button
							onClick={handleExecuteCommand}
							disabled={isExecuting || !cmdPath.trim()}
							className="w-full md:w-auto"
						>
							{isExecuting ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : (
								<TerminalSquare className="mr-2 h-4 w-4" />
							)}
							Execute
						</Button>
					</div>

					{cmdMethod !== "GET" && cmdMethod !== "DELETE" && (
						<div className="space-y-1">
							<p className="text-xs font-medium text-muted-foreground mb-1">
								JSON Body (Optional)
							</p>
							<Textarea
								placeholder='{"name": "new-identity"}'
								value={cmdBody}
								onChange={(e) => setCmdBody(e.target.value)}
								className="font-mono text-xs min-h-[80px]"
							/>
						</div>
					)}

					{cmdResponse && (
						<div className="mt-4 rounded-md border bg-black/90 p-4 overflow-hidden relative group">
							<div className="absolute top-2 right-2 text-[10px] text-zinc-500 uppercase font-mono">
								Response Output
							</div>
							<pre className="text-xs text-green-400 font-mono whitespace-pre-wrap overflow-auto max-h-[400px]">
								{cmdResponse}
							</pre>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Queues Table */}
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-base">Queues</CardTitle>
					<CardDescription>
						{router.queues.length} queue{router.queues.length !== 1 ? "s" : ""}{" "}
						found on this router
					</CardDescription>
				</CardHeader>
				<CardContent>
					{router.queues.length === 0 ? (
						<div className="flex h-24 items-center justify-center text-muted-foreground text-sm">
							No queues found. Run a poll to discover queues.
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Queue Name</TableHead>
									<TableHead>Target</TableHead>
									<TableHead>Parent</TableHead>
									<TableHead>Limit At</TableHead>
									<TableHead>Max Limit</TableHead>
									<TableHead>Last Seen</TableHead>
									<TableHead className="text-center">Status</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{router.queues.map((queue) => (
									<TableRow key={queue.id} className="group">
										<TableCell>
											<Link
												href={`/queues/${queue.id}`}
												className="font-medium hover:text-primary inline-flex items-center gap-1 transition-colors"
											>
												{queue.name}
												<ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
											</Link>
										</TableCell>
										<TableCell className="font-mono text-sm">
											{queue.target}
										</TableCell>
										<TableCell className="font-mono text-sm">
											{queue.parent}
										</TableCell>
										<TableCell className="text-sm">
											{`${formatBytes(parseMikrotikBytes(queue.limitAt).upload)}/${formatBytes(parseMikrotikBytes(queue.limitAt).download)}`}
										</TableCell>
										<TableCell className="text-sm">
											{`${formatBytes(parseMikrotikBytes(queue.maxLimit).upload)}/${formatBytes(parseMikrotikBytes(queue.maxLimit).download)}`}
										</TableCell>
										<TableCell className="text-sm text-muted-foreground">
											{formatDistanceToNow(new Date(queue.lastSeenAt), {
												addSuffix: true,
											})}
										</TableCell>
										<TableCell className="text-center">
											{queue.isDeleted ? (
												<Badge variant="destructive" className="text-xs">
													Deleted
												</Badge>
											) : (
												<Badge
													variant="outline"
													className="text-xs border-green-500/30 text-green-400"
												>
													Active
												</Badge>
											)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
