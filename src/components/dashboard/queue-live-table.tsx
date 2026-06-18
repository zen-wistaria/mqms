"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
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
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatBytes } from "@/lib/format";

interface LiveQueue {
	".id": string;
	name: string;
	target: string;
	uploadBytes: number;
	downloadBytes: number;
	totalBytes: number;
	rateUpload: string;
	rateDownload: string;
	maxLimit: string;
	disabled: boolean;
}

interface RouterOption {
	id: string;
	name: string;
}

const INTERVAL_OPTS = [
	{ value: "1000", label: "1 detik" },
	{ value: "2000", label: "2 detik" },
	{ value: "3000", label: "3 detik" },
	{ value: "4000", label: "4 detik" },
	{ value: "5000", label: "5 detik" },
];

function formatRate(raw: string | null): string {
	if (!raw || raw === "0") return "0 b/s";
	const num = Number(raw);
	if (!Number.isNaN(num)) {
		if (num === 0) return "0 b/s";
		const units = ["b/s", "Kb/s", "Mb/s", "Gb/s"];
		const k = 1000;
		const i = Math.floor(Math.log(Math.abs(num)) / Math.log(k));
		const val = num / k ** i;
		return `${val.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
	}
	// Already formatted like "108.9kbps" — beautify
	if (typeof raw === "string" && raw.match(/[a-z]/i)) {
		return raw.replace(/bps$/, "b/s");
	}
	return raw;
}

export function QueueLiveTable() {
	const [queues, setQueues] = useState<LiveQueue[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [intervalMs, setIntervalMs] = useState("1000");
	const [routers, setRouters] = useState<RouterOption[]>([]);
	const [selectedRouter, setSelectedRouter] = useState("");
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	// Fetch routers list once
	useEffect(() => {
		fetch("/api/routers")
			.then((res) => res.json())
			.then((data) => {
				setRouters(data || []);
				if (data?.length > 0) {
					setSelectedRouter(data[data.length - 1].id);
				}
			})
			.catch(console.error);
	}, []);

	const fetchQueues = useCallback(async () => {
		if (!selectedRouter) return;
		try {
			const res = await fetch(
				`/api/queues/live?routerId=${selectedRouter}`,
			);
			if (res.ok) {
				setQueues(await res.json());
			}
		} catch (error) {
			console.error("Failed to fetch live queues:", error);
		} finally {
			setIsLoading(false);
		}
	}, [selectedRouter]);

	// Reset interval on change
	useEffect(() => {
		if (!selectedRouter) return;
		if (intervalRef.current) clearInterval(intervalRef.current);
		fetchQueues();
		intervalRef.current = setInterval(fetchQueues, Number(intervalMs));
		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current);
		};
	}, [fetchQueues, intervalMs, selectedRouter]);

	if (!selectedRouter) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Live Queues</CardTitle>
					<CardDescription>Tidak ada router tersedia</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader className="pb-2">
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className="text-base">Live Queues</CardTitle>
						<CardDescription>
							Refresh setiap {Number(intervalMs) / 1000} detik
							{selectedRouter && (
								<span className="ml-1">
									—{" "}
									{routers.find((r) => r.id === selectedRouter)?.name || ""}
								</span>
							)}
						</CardDescription>
					</div>
					<div className="flex items-center gap-1.5">
						<span className="h-2 w-2 rounded-full bg-green-500 status-online" />
						<span className="text-xs text-muted-foreground">Live</span>
					</div>
				</div>
				<div className="flex flex-wrap items-center gap-2 mt-2">
					{/* Router filter */}
					<div className="min-w-[140px]">
						<Select
							value={selectedRouter}
							onValueChange={(v) =>
								setSelectedRouter(v ?? selectedRouter)
							}
						>
							<SelectTrigger className="h-7 text-xs">
								<SelectValue>
									{routers.find((r) => r.id === selectedRouter)?.name ||
										"Pilih Router"}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								{routers.map((r) => (
									<SelectItem key={r.id} value={r.id}>
										{r.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					{/* Interval selector */}
					<div className="min-w-[100px]">
						<Select
							value={intervalMs}
							onValueChange={(v) =>
								setIntervalMs(v ?? intervalMs)
							}
						>
							<SelectTrigger className="h-7 text-xs">
								<SelectValue>
									{INTERVAL_OPTS.find((o) => o.value === intervalMs)
										?.label || "1 detik"}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								{INTERVAL_OPTS.map((o) => (
									<SelectItem key={o.value} value={o.value}>
										{o.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<div className="space-y-3 py-4">
						{Array.from({ length: 3 }).map((_, i) => (
							<Skeleton key={i} className="h-10 w-full" />
						))}
					</div>
				) : queues.length === 0 ? (
					<div className="flex h-32 items-center justify-center text-muted-foreground text-sm">
						Tidak ada queue.
					</div>
				) : (
					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Queue</TableHead>
									<TableHead className="text-right">
										<span className="inline-flex items-center gap-1">
											<ArrowUp className="h-3 w-3 text-upload" /> Rate
										</span>
									</TableHead>
									<TableHead className="text-right">
										<span className="inline-flex items-center gap-1">
											<ArrowDown className="h-3 w-3 text-download" /> Rate
										</span>
									</TableHead>
									<TableHead className="text-right">Total</TableHead>
									<TableHead className="text-right">Max Limit</TableHead>
									<TableHead className="text-center">Status</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{queues.map((q) => (
									<TableRow
										key={q[".id"]}
										className="group hover:bg-accent/50 transition-colors"
									>
										<TableCell>
											<Tooltip>
												<TooltipTrigger>
													<span className="font-medium inline-flex items-center gap-1 cursor-help">
														{q.name}
													</span>
												</TooltipTrigger>
												<TooltipContent
													side="right"
													className="p-3 min-w-[150px]"
												>
													<p className="font-medium mb-2">{q.name}</p>
													<div className="space-y-1.5">
														<div className="flex justify-between items-center gap-4">
															<span className="text-muted-foreground text-xs">
																Target:
															</span>
															<span className="font-mono text-xs">
																{q.target}
															</span>
														</div>
														<div className="flex justify-between items-center gap-4">
															<span className="text-muted-foreground text-xs">
																Total:
															</span>
															<span className="font-mono font-medium text-xs">
																{formatBytes(q.totalBytes)}
															</span>
														</div>
														<div className="flex justify-between items-center gap-4">
															<span className="text-muted-foreground text-xs">
																Upload:
															</span>
															<span className="font-mono text-xs text-upload">
																{formatBytes(q.uploadBytes)}
															</span>
														</div>
														<div className="flex justify-between items-center gap-4">
															<span className="text-muted-foreground text-xs">
																Download:
															</span>
															<span className="font-mono text-xs text-download">
																{formatBytes(q.downloadBytes)}
															</span>
														</div>
													</div>
												</TooltipContent>
											</Tooltip>
										</TableCell>
										<TableCell className="text-right font-mono text-sm text-upload">
											{formatRate(q.rateUpload)}
										</TableCell>
										<TableCell className="text-right font-mono text-sm text-download">
											{formatRate(q.rateDownload)}
										</TableCell>
										<TableCell className="text-right font-mono text-sm">
											{formatBytes(q.totalBytes)}
										</TableCell>
										<TableCell className="text-right font-mono text-xs text-muted-foreground">
											{q.maxLimit}
										</TableCell>
										<TableCell className="text-center">
											{q.disabled ? (
												<Badge variant="secondary" className="text-xs">
													Disabled
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
					</div>
				)}
			</CardContent>
		</Card>
	);
}
