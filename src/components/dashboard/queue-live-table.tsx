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

interface QueueData {
	id: string;
	name: string;
	target: string;
	isDeleted: boolean;
	router: {
		id: string;
		name: string;
		status: string;
	};
	uploadBytes: number;
	downloadBytes: number;
	totalBytes: number;
	rateUpload: string | null;
	rateDownload: string | null;
}

export function QueueLiveTable() {
	const [queues, setQueues] = useState<QueueData[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	const fetchQueues = useCallback(async () => {
		try {
			const res = await fetch("/api/queues");
			if (res.ok) {
				const data = await res.json();
				setQueues(data);
			}
		} catch (error) {
			console.error("Failed to fetch queues:", error);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchQueues();
		const interval = setInterval(fetchQueues, 10000); // Refresh every 10s
		return () => clearInterval(interval);
	}, [fetchQueues]);

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<Skeleton className="h-5 w-32" />
					<Skeleton className="h-3 w-48" />
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						{Array.from({ length: 5 }).map((_, i) => (
							<Skeleton key={i} className="h-12 w-full" />
						))}
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader className="pb-2">
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className="text-base">Live Queues</CardTitle>
						<CardDescription>Auto-refreshing every 10 seconds</CardDescription>
					</div>
					<div className="flex items-center gap-1.5">
						<span className="h-2 w-2 rounded-full bg-green-500 status-online" />
						<span className="text-xs text-muted-foreground">Live</span>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				{queues.length === 0 ? (
					<div className="flex h-32 items-center justify-center text-muted-foreground text-sm">
						No queues found. Add a router to start monitoring.
					</div>
				) : (
					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Queue</TableHead>
									<TableHead>Router</TableHead>
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
									<TableHead className="text-right">Total Bytes</TableHead>
									<TableHead className="text-center">Status</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{queues.slice(0, 20).map((queue) => {
									return (
										<TableRow
											key={queue.id}
											className="group hover:bg-accent/50 transition-colors"
										>
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
												<p className="text-xs text-muted-foreground mt-0.5">
													{queue.target}
												</p>
											</TableCell>
											<TableCell>
												<Link
													href={`/routers/${queue.router.id}`}
													className="text-sm hover:text-primary transition-colors"
												>
													{queue.router.name}
												</Link>
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
	);
}
