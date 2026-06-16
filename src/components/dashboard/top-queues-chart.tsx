"use client";

import {
	Bar,
	BarChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBytes } from "@/lib/format";

interface TopQueuesChartProps {
	topQueues: Array<{
		id: string;
		name: string;
		uploadBytes: number;
		downloadBytes: number;
		totalBytes: number;
	}>;
	isLoading: boolean;
}

const COLORS = [
	"oklch(0.65 0.2 265)",
	"oklch(0.7 0.15 180)",
	"oklch(0.75 0.18 50)",
	"oklch(0.8 0.15 85)",
	"oklch(0.7 0.2 320)",
];

export function TopQueuesChart({ topQueues, isLoading }: TopQueuesChartProps) {
	if (isLoading) {
		return (
			<Card className="h-full">
				<CardHeader>
					<Skeleton className="h-5 w-32" />
					<Skeleton className="h-3 w-48" />
				</CardHeader>
				<CardContent>
					<Skeleton className="h-[280px] w-full" />
				</CardContent>
			</Card>
		);
	}

	const data = topQueues.map((q, index) => ({
		name: q.name.length > 15 ? `${q.name.substring(0, 15)}...` : q.name,
		fullName: q.name,
		total: q.totalBytes,
		upload: q.uploadBytes,
		download: q.downloadBytes,
		fill: COLORS[index % COLORS.length],
	}));

	return (
		<Card className="h-full">
			<CardHeader className="pb-2">
				<CardTitle className="text-base">Top 5 Queues</CardTitle>
				<CardDescription>By monthly usage (MTD)</CardDescription>
			</CardHeader>
			<CardContent>
				{data.length === 0 ? (
					<div className="flex h-[280px] items-center justify-center text-muted-foreground text-sm">
						No data available yet
					</div>
				) : (
					<ResponsiveContainer width="100%" height={280}>
						<BarChart
							data={data}
							layout="vertical"
							margin={{ left: 10, right: 10 }}
						>
							<XAxis
								type="number"
								tickFormatter={(v) => formatBytes(v)}
								tick={{ fill: "oklch(0.65 0.02 265)", fontSize: 11 }}
								axisLine={false}
								tickLine={false}
							/>
							<YAxis
								type="category"
								dataKey="name"
								width={100}
								tick={{ fill: "oklch(0.65 0.02 265)", fontSize: 11 }}
								axisLine={false}
								tickLine={false}
							/>
							<Tooltip<number, string>
								cursor={{ fill: "var(--muted)" }}
								contentStyle={{
									borderRadius: "8px",
									border: "none",
									backgroundColor: "var(--background)",
									boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
									color: "oklch(0.95 0.01 265)",
									fontSize: 12,
								}}
								formatter={(value) => [formatBytes(value), "Total"]}
								labelFormatter={(label) => `Queue: ${label}`}
							/>
							<Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={24} />
						</BarChart>
					</ResponsiveContainer>
				)}
			</CardContent>
		</Card>
	);
}
