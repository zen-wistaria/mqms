"use client";

import { ArrowDown, ArrowUp, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
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

// Generate last 6 months
function getLast6Months() {
	const months = [];
	const d = new Date();
	for (let i = 0; i < 6; i++) {
		const month = new Date(d.getFullYear(), d.getMonth() - i, 1);
		const value = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
		const label = month.toLocaleDateString("en-US", {
			month: "long",
			year: "numeric",
		});
		months.push({ value, label });
	}
	return months;
}

interface QueueData {
	id: string;
	name: string;
	target: string;
	isDeleted: boolean;
	router: { id: string; name: string; status: string };
	uploadBytes: number;
	downloadBytes: number;
	totalBytes: number;
	rateUpload: string | null;
	rateDownload: string | null;
}

interface RouterOption {
	id: string;
	name: string;
}

export default function QueuesPage() {
	const [queues, setQueues] = useState<QueueData[]>([]);
	const [routers, setRouters] = useState<RouterOption[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [routerFilter, setRouterFilter] = useState("all");
	const [showDeleted, setShowDeleted] = useState(false);

	const months = getLast6Months();
	const [filter, setFilter] = useState<string>("total");

	const fetchRouters = useCallback(async () => {
		try {
			const res = await fetch("/api/routers");
			if (res.ok) {
				const data = await res.json();
				setRouters(data.map((r: RouterOption) => ({ id: r.id, name: r.name })));
			}
		} catch (error) {
			console.error("Failed to fetch routers:", error);
		}
	}, []);

	const fetchQueues = useCallback(async () => {
		try {
			const params = new URLSearchParams();
			if (routerFilter !== "all") params.set("routerId", routerFilter);
			if (showDeleted) params.set("showDeleted", "true");
			if (filter) params.set("filter", filter);

			const res = await fetch(`/api/queues?${params}`);
			if (res.ok) setQueues(await res.json());
		} catch (error) {
			console.error("Failed to fetch queues:", error);
		} finally {
			setIsLoading(false);
		}
	}, [routerFilter, showDeleted, filter]);

	useEffect(() => {
		fetchRouters();
	}, [fetchRouters]);

	useEffect(() => {
		fetchQueues();
		const interval = setInterval(fetchQueues, 10000);
		return () => clearInterval(interval);
	}, [fetchQueues]);

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-2xl font-bold tracking-tight">All Queues</h2>
				<p className="text-muted-foreground">
					Browse and filter all monitored queues
				</p>
			</div>

			{/* Filters */}
			<div className="flex flex-wrap items-center gap-4">
				<div className="flex items-center gap-2">
					<Label className="text-sm text-muted-foreground">Period:</Label>
					<Select value={filter} onValueChange={(val) => val && setFilter(val)}>
						<SelectTrigger className="w-[180px]">
							<SelectValue placeholder="Select period" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="total">Total Accumulated</SelectItem>
							{months.map((m) => (
								<SelectItem key={m.value} value={m.value}>
									{m.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="flex items-center gap-2">
					<Label className="text-sm text-muted-foreground">Router:</Label>
					<Select
						value={routerFilter}
						onValueChange={(val) => setRouterFilter(val || "all")}
					>
						<SelectTrigger className="w-[180px]">
							<SelectValue placeholder="All Routers">
								{routerFilter === "all"
									? "All Routers"
									: routers.find((r) => r.id === routerFilter)?.name ||
										"All Routers"}
							</SelectValue>
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Routers</SelectItem>
							{routers.map((r) => (
								<SelectItem key={r.id} value={r.id}>
									{r.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="flex items-center gap-2">
					<Switch
						id="show-deleted"
						checked={showDeleted}
						onCheckedChange={setShowDeleted}
					/>
					<Label htmlFor="show-deleted" className="text-sm">
						Show deleted
					</Label>
				</div>
			</div>

			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-base">Queues</CardTitle>
					<CardDescription>
						{queues.length} queue{queues.length !== 1 ? "s" : ""} found
					</CardDescription>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<div className="space-y-3">
							{Array.from({ length: 5 }).map((_, i) => (
								<Skeleton key={i} className="h-12 w-full" />
							))}
						</div>
					) : queues.length === 0 ? (
						<div className="flex h-32 items-center justify-center text-muted-foreground text-sm">
							No queues found.
						</div>
					) : (
						<div className="overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Queue</TableHead>
										<TableHead>Router</TableHead>
										<TableHead>Target</TableHead>
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
										<TableHead className="text-center">Status</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{queues.map((queue) => {
										return (
											<TableRow key={queue.id} className="group">
												<TableCell>
													<Tooltip>
														<TooltipTrigger>
															<Link
																href={`/queues/${queue.id}`}
																className="font-medium hover:text-primary inline-flex items-center gap-1 transition-colors cursor-help"
															>
																{queue.name}
																<ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
															</Link>
														</TooltipTrigger>
														<TooltipContent
															side="right"
															className="p-3 min-w-[150px]"
														>
															<p className="font-medium mb-2">{queue.name}</p>
															<div className="space-y-1.5">
																<div className="flex justify-between items-center gap-4">
																	<span className="text-muted-foreground text-xs">
																		Total:
																	</span>
																	<span className="font-mono font-medium text-xs">
																		{formatBytes(queue.totalBytes)}
																	</span>
																</div>
																<div className="flex justify-between items-center gap-4">
																	<span className="text-muted-foreground text-xs">
																		Upload:
																	</span>
																	<span className="font-mono text-xs text-upload">
																		{formatBytes(queue.uploadBytes)}
																	</span>
																</div>
																<div className="flex justify-between items-center gap-4">
																	<span className="text-muted-foreground text-xs">
																		Download:
																	</span>
																	<span className="font-mono text-xs text-download">
																		{formatBytes(queue.downloadBytes)}
																	</span>
																</div>
															</div>
														</TooltipContent>
													</Tooltip>
												</TableCell>
												<TableCell>
													<Link
														href={`/routers/${queue.router.id}`}
														className="text-sm hover:text-primary transition-colors"
													>
														{queue.router.name}
													</Link>
												</TableCell>
												<TableCell className="font-mono text-xs text-muted-foreground">
													{queue.target}
												</TableCell>
												<TableCell className="text-right font-mono text-sm text-upload">
													{queue.rateUpload || "—"}
												</TableCell>
												<TableCell className="text-right font-mono text-sm text-download">
													{queue.rateDownload || "—"}
												</TableCell>
												<TableCell className="text-right font-mono text-sm">
													{formatBytes(queue.totalBytes)}
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
										);
									})}
								</TableBody>
							</Table>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
