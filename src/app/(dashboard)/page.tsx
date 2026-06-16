"use client";

import { useCallback, useEffect, useState } from "react";
import { QueueLiveTable } from "@/components/dashboard/queue-live-table";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { TopQueuesChart } from "@/components/dashboard/top-queues-chart";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

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

interface DashboardStats {
	routerCount: number;
	queueCount: number;
	onlineRouterCount: number;
	monthlyUploadBytes: number;
	monthlyDownloadBytes: number;
	monthlyTotalBytes: number;
	topQueues: Array<{
		id: string;
		name: string;
		uploadBytes: number;
		downloadBytes: number;
		totalBytes: number;
	}>;
}

export default function DashboardPage() {
	const [stats, setStats] = useState<DashboardStats | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	const months = getLast6Months();
	const [filter, setFilter] = useState<string>(months[0].value); // Default to current month

	const fetchStats = useCallback(async () => {
		try {
			setIsLoading(true);
			const res = await fetch(`/api/dashboard/stats?filter=${filter}`);
			if (res.ok) {
				const data = await res.json();
				setStats(data);
			}
		} catch (error) {
			console.error("Failed to fetch stats:", error);
		} finally {
			setIsLoading(false);
		}
	}, [filter]);

	useEffect(() => {
		fetchStats();
		const interval = setInterval(fetchStats, 30000); // Refresh every 30s
		return () => clearInterval(interval);
	}, [fetchStats]);

	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
				<div>
					<h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
					<p className="text-muted-foreground">
						Overview of all monitored MikroTik queues
					</p>
				</div>
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

			<StatsCards filter={filter} stats={stats} isLoading={isLoading} />

			<div className="grid gap-6 lg:grid-cols-5">
				<div className="lg:col-span-2">
					<TopQueuesChart
						topQueues={stats?.topQueues || []}
						isLoading={isLoading}
					/>
				</div>
				<div className="lg:col-span-3">
					<QueueLiveTable />
				</div>
			</div>
		</div>
	);
}
