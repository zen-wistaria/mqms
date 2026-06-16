"use client";

import { useCallback, useEffect, useState } from "react";
import { QueueLiveTable } from "@/components/dashboard/queue-live-table";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { TopQueuesChart } from "@/components/dashboard/top-queues-chart";

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

	const fetchStats = useCallback(async () => {
		try {
			const res = await fetch("/api/dashboard/stats");
			if (res.ok) {
				const data = await res.json();
				setStats(data);
			}
		} catch (error) {
			console.error("Failed to fetch stats:", error);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchStats();
		const interval = setInterval(fetchStats, 30000); // Refresh every 30s
		return () => clearInterval(interval);
	}, [fetchStats]);

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
				<p className="text-muted-foreground">
					Overview of all monitored MikroTik queues
				</p>
			</div>

			<StatsCards stats={stats} isLoading={isLoading} />

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
