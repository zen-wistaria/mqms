"use client";

import { useCallback, useEffect, useState } from "react";
import {
	Area,
	AreaChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBytes } from "@/lib/format";

interface DailyUsageChartProps {
	queueId: string;
	year: number;
	month: number;
}

interface DailyData {
	date: string;
	day: number;
	uploadBytes: number;
	downloadBytes: number;
	totalBytes: number;
}

export function DailyUsageChart({
	queueId,
	year,
	month,
}: DailyUsageChartProps) {
	const [data, setData] = useState<DailyData[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	const fetchData = useCallback(async () => {
		setIsLoading(true);
		try {
			const res = await fetch(
				`/api/queues/${queueId}/daily?year=${year}&month=${month}`,
			);
			if (res.ok) {
				setData(await res.json());
			}
		} catch (error) {
			console.error("Failed to fetch daily usage:", error);
		} finally {
			setIsLoading(false);
		}
	}, [queueId, year, month]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	if (isLoading) {
		return <Skeleton className="h-[300px] w-full" />;
	}

	const hasData = data.some((d) => d.totalBytes > 0);

	if (!hasData) {
		return (
			<div className="flex h-[300px] items-center justify-center text-muted-foreground text-sm">
				No data available for this period
			</div>
		);
	}

	return (
		<ResponsiveContainer width="100%" height={300}>
			<AreaChart
				data={data}
				margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
			>
				<defs>
					<linearGradient id="uploadGradient" x1="0" y1="0" x2="0" y2="1">
						<stop
							offset="5%"
							stopColor="oklch(0.75 0.18 50)"
							stopOpacity={0.3}
						/>
						<stop
							offset="95%"
							stopColor="oklch(0.75 0.18 50)"
							stopOpacity={0}
						/>
					</linearGradient>
					<linearGradient id="downloadGradient" x1="0" y1="0" x2="0" y2="1">
						<stop
							offset="5%"
							stopColor="oklch(0.7 0.15 180)"
							stopOpacity={0.3}
						/>
						<stop
							offset="95%"
							stopColor="oklch(0.7 0.15 180)"
							stopOpacity={0}
						/>
					</linearGradient>
				</defs>
				<CartesianGrid
					strokeDasharray="3 3"
					stroke="oklch(0.28 0.02 265)"
					vertical={false}
				/>
				<XAxis
					dataKey="day"
					tick={{ fill: "oklch(0.65 0.02 265)", fontSize: 11 }}
					axisLine={false}
					tickLine={false}
				/>
				<YAxis
					tickFormatter={(v) => formatBytes(v)}
					tick={{ fill: "oklch(0.65 0.02 265)", fontSize: 11 }}
					axisLine={false}
					tickLine={false}
					width={70}
				/>
				<Tooltip
					contentStyle={{
						borderRadius: "8px",
						border: "1px solid var(--border)",
						backgroundColor: "var(--background)",
						color: "oklch(0.95 0.01 265)",
						fontSize: 12,
					}}
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					formatter={(value: any, name: any) => [
						formatBytes(value as number),
						name === "uploadBytes" ? "Upload" : "Download",
					]}
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					labelFormatter={(label: any) => `Day ${label}`}
				/>
				<Area
					type="monotone"
					dataKey="uploadBytes"
					stroke="oklch(0.75 0.18 50)"
					fill="url(#uploadGradient)"
					strokeWidth={2}
					name="uploadBytes"
				/>
				<Area
					type="monotone"
					dataKey="downloadBytes"
					stroke="oklch(0.7 0.15 180)"
					fill="url(#downloadGradient)"
					strokeWidth={2}
					name="downloadBytes"
				/>
			</AreaChart>
		</ResponsiveContainer>
	);
}
