"use client";

import {
	ArrowDown,
	ArrowLeft,
	ArrowUp,
	ArrowUpDown,
	Download,
} from "lucide-react";
import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { DailyUsageChart } from "@/components/charts/daily-usage-chart";
import { Button } from "@/components/ui/button";
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
import { formatBytes } from "@/lib/format";

interface QueueDetail {
	id: string;
	name: string;
	target: string;
	maxLimit: string | null;
	isDeleted: boolean;
	router: {
		id: string;
		name: string;
		ipAddress: string;
		status: string;
	};
	histories: Array<{
		uploadBytes: number;
		downloadBytes: number;
		totalBytes: number;
		rateUpload: string | null;
		rateDownload: string | null;
		timestamp: string;
	}>;
}

interface MonthlyUsage {
	month: number;
	year: number;
	uploadBytes: number;
	downloadBytes: number;
	totalBytes: number;
	recordCount: number;
}

const MONTHS = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];

export default function QueueDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	const [queue, setQueue] = useState<QueueDetail | null>(null);
	const [monthlyUsage, setMonthlyUsage] = useState<MonthlyUsage[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [selectedYear, setSelectedYear] = useState(
		new Date().getFullYear().toString(),
	);
	const [selectedMonth, setSelectedMonth] = useState(
		(new Date().getMonth() + 1).toString(),
	);

	const fetchQueue = useCallback(async () => {
		try {
			const res = await fetch(`/api/queues/${id}`);
			if (res.ok) setQueue(await res.json());
		} catch (error) {
			console.error("Failed to fetch queue:", error);
		} finally {
			setIsLoading(false);
		}
	}, [id]);

	const fetchMonthlyUsage = useCallback(async () => {
		try {
			const res = await fetch(`/api/queues/${id}/usage?year=${selectedYear}`);
			if (res.ok) setMonthlyUsage(await res.json());
		} catch (error) {
			console.error("Failed to fetch usage:", error);
		}
	}, [id, selectedYear]);

	useEffect(() => {
		fetchQueue();
	}, [fetchQueue]);

	useEffect(() => {
		fetchMonthlyUsage();
	}, [fetchMonthlyUsage]);

	const handleExport = () => {
		window.open(`/api/queues/${id}/export`, "_blank");
	};

	if (isLoading) {
		return (
			<div className="space-y-6">
				<Skeleton className="h-8 w-48" />
				<div className="grid gap-4 md:grid-cols-3">
					{Array.from({ length: 3 }).map((_, i) => (
						<Skeleton key={i} className="h-24 w-full" />
					))}
				</div>
				<Skeleton className="h-64 w-full" />
			</div>
		);
	}

	if (!queue) {
		return (
			<div className="flex flex-col items-center justify-center h-64 gap-4">
				<p className="text-muted-foreground">Queue not found</p>
				<Button variant="outline" render={<Link href="/" />}>
					<>
						<ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
					</>
				</Button>
			</div>
		);
	}

	const latest = queue.histories[0];
	const currentMonthUsage = monthlyUsage.find(
		(m) => m.month === new Date().getMonth() + 1,
	);

	const years = Array.from(
		{ length: 5 },
		(_, i) => new Date().getFullYear() - i,
	);

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-2">
				<Button variant="ghost" size="icon" render={<Link href={`/routers/${queue.router.id}`} />}>
					<ArrowLeft className="h-4 w-4" />
				</Button>
				<div className="flex-1">
					<h2 className="text-2xl font-bold tracking-tight">{queue.name}</h2>
					<p className="text-muted-foreground text-sm">
						Router: {queue.router.name} • Target: {queue.target}
					</p>
				</div>
				<Button variant="outline" size="sm" onClick={handleExport}>
					<Download className="mr-2 h-4 w-4" />
					Export CSV
				</Button>
			</div>

			{/* Summary Cards */}
			<div className="grid gap-4 md:grid-cols-4">
				<Card className="bg-linear-to-br from-orange-500/10 to-orange-500/5">
					<CardContent className="p-4">
						<div className="flex items-center gap-2 mb-1">
							<ArrowUp className="h-4 w-4 text-orange-400" />
							<p className="text-xs text-muted-foreground uppercase">
								Upload (MTD)
							</p>
						</div>
						<p className="text-2xl font-bold">
							{currentMonthUsage
								? formatBytes(currentMonthUsage.uploadBytes)
								: "—"}
						</p>
					</CardContent>
				</Card>
				<Card className="bg-linear-to-br from-emerald-500/10 to-emerald-500/5">
					<CardContent className="p-4">
						<div className="flex items-center gap-2 mb-1">
							<ArrowDown className="h-4 w-4 text-emerald-400" />
							<p className="text-xs text-muted-foreground uppercase">
								Download (MTD)
							</p>
						</div>
						<p className="text-2xl font-bold">
							{currentMonthUsage
								? formatBytes(currentMonthUsage.downloadBytes)
								: "—"}
						</p>
					</CardContent>
				</Card>
				<Card className="bg-linear-to-br from-violet-500/10 to-violet-500/5">
					<CardContent className="p-4">
						<div className="flex items-center gap-2 mb-1">
							<ArrowUpDown className="h-4 w-4 text-violet-400" />
							<p className="text-xs text-muted-foreground uppercase">
								Total (MTD)
							</p>
						</div>
						<p className="text-2xl font-bold">
							{currentMonthUsage
								? formatBytes(currentMonthUsage.totalBytes)
								: "—"}
						</p>
					</CardContent>
				</Card>
				<Card className="bg-linear-to-br from-blue-500/10 to-blue-500/5">
					<CardContent className="p-4">
						<div className="flex items-center gap-2 mb-1">
							<ArrowUpDown className="h-4 w-4 text-blue-400" />
							<p className="text-xs text-muted-foreground uppercase">
								Current Rate
							</p>
						</div>
						<div className="flex gap-2 mt-1">
							<span className="text-sm font-mono text-upload">
								↑ {latest?.rateUpload || "—"}
							</span>
							<span className="text-sm font-mono text-download">
								↓ {latest?.rateDownload || "—"}
							</span>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Daily Chart */}
			<Card>
				<CardHeader className="pb-2">
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="text-base">Daily Usage</CardTitle>
							<CardDescription>Upload and download per day</CardDescription>
						</div>
						<div className="flex gap-2">
							<Select value={selectedMonth} onValueChange={(val) => setSelectedMonth(val || "")}>
								<SelectTrigger className="w-[130px]">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{MONTHS.map((m, i) => (
										<SelectItem key={i} value={(i + 1).toString()}>
											{m}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Select value={selectedYear} onValueChange={(val) => setSelectedYear(val || "")}>
								<SelectTrigger className="w-[100px]">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{years.map((y) => (
										<SelectItem key={y} value={y.toString()}>
											{y}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<DailyUsageChart
						queueId={id}
						year={parseInt(selectedYear)}
						month={parseInt(selectedMonth)}
					/>
				</CardContent>
			</Card>

			{/* Monthly Usage Table */}
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-base">Monthly Usage Summary</CardTitle>
					<CardDescription>Year {selectedYear}</CardDescription>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Month</TableHead>
								<TableHead className="text-right">Upload</TableHead>
								<TableHead className="text-right">Download</TableHead>
								<TableHead className="text-right">Total</TableHead>
								<TableHead className="text-right">Records</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{monthlyUsage.map((m) => (
								<TableRow key={m.month}>
									<TableCell className="font-medium">
										{MONTHS[m.month - 1]}
									</TableCell>
									<TableCell className="text-right font-mono text-sm text-upload">
										{m.totalBytes > 0 ? formatBytes(m.uploadBytes) : "—"}
									</TableCell>
									<TableCell className="text-right font-mono text-sm text-download">
										{m.totalBytes > 0 ? formatBytes(m.downloadBytes) : "—"}
									</TableCell>
									<TableCell className="text-right font-mono text-sm font-semibold">
										{m.totalBytes > 0 ? formatBytes(m.totalBytes) : "—"}
									</TableCell>
									<TableCell className="text-right text-muted-foreground">
										{m.recordCount}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	);
}
