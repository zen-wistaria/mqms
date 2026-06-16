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
import { formatBytes } from "@/lib/format";

interface QueueData {
	id: string;
	name: string;
	target: string;
	isDeleted: boolean;
	router: { id: string; name: string; status: string };
	histories: Array<{
		uploadBytes: number;
		downloadBytes: number;
		totalBytes: number;
		rateUpload: string | null;
		rateDownload: string | null;
		timestamp: string;
	}>;
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

			const res = await fetch(`/api/queues?${params}`);
			if (res.ok) setQueues(await res.json());
		} catch (error) {
			console.error("Failed to fetch queues:", error);
		} finally {
			setIsLoading(false);
		}
	}, [routerFilter, showDeleted]);

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
					<Label className="text-sm text-muted-foreground">Router:</Label>
					<Select
						value={routerFilter}
						onValueChange={(val) => setRouterFilter(val || "all")}
					>
						<SelectTrigger className="w-[200px]">
							<SelectValue placeholder="All Routers" />
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
						Show deleted queues
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
										const latest = queue.histories[0];
										return (
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
													{latest?.rateUpload || "—"}
												</TableCell>
												<TableCell className="text-right font-mono text-sm text-download">
													{latest?.rateDownload || "—"}
												</TableCell>
												<TableCell className="text-right font-mono text-sm">
													{latest ? formatBytes(latest.totalBytes) : "—"}
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
