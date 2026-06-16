"use client";

import {
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
	BarChart3,
	Router,
	Wifi,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBytes } from "@/lib/format";

interface StatsCardsProps {
	stats: {
		routerCount: number;
		queueCount: number;
		onlineRouterCount: number;
		monthlyUploadBytes: number;
		monthlyDownloadBytes: number;
		monthlyTotalBytes: number;
	} | null;
	isLoading: boolean;
	filter: string;
}

const cardConfig = [
	{
		key: "routers" as const,
		title: "Total Routers",
		icon: Router,
		getValue: (s: NonNullable<StatsCardsProps["stats"]>) =>
			`${s.onlineRouterCount}/${s.routerCount}`,
		getSubtext: () => "Online / Total",
		gradient: "from-violet-500/10 to-violet-500/5",
		iconColor: "text-violet-400",
	},
	{
		key: "queues" as const,
		title: "Active Queues",
		icon: BarChart3,
		getValue: (s: NonNullable<StatsCardsProps["stats"]>) =>
			s.queueCount.toString(),
		getSubtext: () => "Monitored queues",
		gradient: "from-blue-500/10 to-blue-500/5",
		iconColor: "text-blue-400",
	},
	{
		key: "upload" as const,
		title: (f: string) => (f === "total" ? "Total Upload" : "Upload"),
		icon: ArrowUp,
		getValue: (s: NonNullable<StatsCardsProps["stats"]>) =>
			formatBytes(s.monthlyUploadBytes),
		getSubtext: (_s: NonNullable<StatsCardsProps["stats"]>, f: string) =>
			f === "total" ? "Accumulated traffic" : "Selected month",
		gradient: "from-orange-500/10 to-orange-500/5",
		iconColor: "text-orange-400",
	},
	{
		key: "download" as const,
		title: (f: string) => (f === "total" ? "Total Download" : "Download"),
		icon: ArrowDown,
		getValue: (s: NonNullable<StatsCardsProps["stats"]>) =>
			formatBytes(s.monthlyDownloadBytes),
		getSubtext: (_s: NonNullable<StatsCardsProps["stats"]>, f: string) =>
			f === "total" ? "Accumulated traffic" : "Selected month",
		gradient: "from-emerald-500/10 to-emerald-500/5",
		iconColor: "text-emerald-400",
	},
	{
		key: "total" as const,
		title: (f: string) => (f === "total" ? "Total Traffic" : "Traffic"),
		icon: ArrowUpDown,
		getValue: (s: NonNullable<StatsCardsProps["stats"]>) =>
			formatBytes(s.monthlyTotalBytes),
		getSubtext: (_s: NonNullable<StatsCardsProps["stats"]>, f: string) =>
			f === "total" ? "Combined traffic" : "Selected month",
		gradient: "from-pink-500/10 to-pink-500/5",
		iconColor: "text-pink-400",
	},
	{
		key: "online" as const,
		title: "Online",
		icon: Wifi,
		getValue: (s: NonNullable<StatsCardsProps["stats"]>) =>
			`${s.onlineRouterCount}`,
		getSubtext: (s: NonNullable<StatsCardsProps["stats"]>) =>
			s.routerCount > 0
				? `${Math.round((s.onlineRouterCount / s.routerCount) * 100)}% uptime`
				: "No routers",
		gradient: "from-green-500/10 to-green-500/5",
		iconColor: "text-green-400",
	},
];

export function StatsCards({ stats, isLoading, filter }: StatsCardsProps) {
	if (isLoading) {
		return (
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
				{Array.from({ length: 6 }).map((_, i) => (
					<Card key={i} className="overflow-hidden">
						<CardContent className="p-4">
							<Skeleton className="h-4 w-24 mb-3" />
							<Skeleton className="h-8 w-16 mb-1" />
							<Skeleton className="h-3 w-20" />
						</CardContent>
					</Card>
				))}
			</div>
		);
	}

	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
			{cardConfig.map((card) => {
				const Icon = card.icon;
				const titleText =
					typeof card.title === "function" ? card.title(filter) : card.title;

				return (
					<Card
						key={card.key}
						className={`overflow-hidden bg-gradient-to-br ${card.gradient} border-border/50 hover:border-border transition-colors`}
					>
						<CardContent className="p-4">
							<div className="flex items-center justify-between mb-3">
								<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
									{titleText}
								</p>
								<Icon className={`h-4 w-4 ${card.iconColor}`} />
							</div>
							<div className="text-2xl font-bold tracking-tight">
								{stats ? card.getValue(stats) : "—"}
							</div>
							<p className="text-xs text-muted-foreground mt-1">
								{stats ? card.getSubtext(stats, filter) : ""}
							</p>
						</CardContent>
					</Card>
				);
			})}
		</div>
	);
}
