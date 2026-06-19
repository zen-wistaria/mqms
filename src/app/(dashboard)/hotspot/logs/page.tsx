"use client";

import { useQuery } from "@tanstack/react-query";
import { Download, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

interface ActivityLog {
	id: string;
	routerId: string;
	username: string;
	ipAddress: string | null;
	macAddress: string | null;
	profileName: string | null;
	validity: string | null;
	type: "login" | "logout";
	message: string | null;
	loggedAt: string;
}

export default function HotspotUserLogPage() {
	const [routerId, setRouterId] = useState<string>("");
	const [search, setSearch] = useState("");
	const [dateFrom, setDateFrom] = useState("");
	const [dateTo, setDateTo] = useState("");

	useEffect(() => {
		const saved = localStorage.getItem("hotspot_router_id");
		if (saved) setRouterId(saved);

		const handleRouterChange = () => {
			setRouterId(localStorage.getItem("hotspot_router_id") || "");
		};

		window.addEventListener("hotspotRouterChanged", handleRouterChange);
		return () =>
			window.removeEventListener("hotspotRouterChanged", handleRouterChange);
	}, []);

	const queryParams = new URLSearchParams();
	if (routerId) queryParams.set("routerId", routerId);
	if (dateFrom) queryParams.set("from", dateFrom);
	if (dateTo) queryParams.set("to", dateTo);
	if (search) queryParams.set("search", search);

	const { data, isLoading } = useQuery({
		queryKey: ["hotspotActivityLogs", routerId, dateFrom, dateTo, search],
		queryFn: async () => {
			const res = await fetch(
				`/api/hotspot/logs/activity?${queryParams.toString()}&limit=1000`,
			);
			if (!res.ok) throw new Error("Failed to fetch activity logs");
			return res.json() as Promise<{
				logs: ActivityLog[];
				total: number;
			}>;
		},
		enabled: !!routerId,
	});

	const logs = data?.logs || [];

	const handleExportCSV = () => {
		const params = new URLSearchParams(queryParams);
		window.open(
			`/api/hotspot/logs/activity/export?${params.toString()}`,
			"_blank",
		);
	};

	if (!routerId) {
		return <div className="p-4 text-muted-foreground">Pilih router dulu.</div>;
	}

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-end gap-4">
				<div className="space-y-1">
					<Label className="text-xs">Dari</Label>
					<Input
						type="date"
						value={dateFrom}
						onChange={(e) => setDateFrom(e.target.value)}
						className="h-8"
					/>
				</div>
				<div className="space-y-1">
					<Label className="text-xs">Ke</Label>
					<Input
						type="date"
						value={dateTo}
						onChange={(e) => setDateTo(e.target.value)}
						className="h-8"
					/>
				</div>
				<div className="space-y-1">
					<Label className="text-xs">Cari</Label>
					<div className="relative">
						<Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
						<Input
							type="text"
							placeholder="Username, IP, atau MAC..."
							className="pl-6 h-8 w-56"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
					</div>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={handleExportCSV}
					disabled={logs.length === 0}
				>
					<Download className="mr-1 h-4 w-4" />
					Export CSV
				</Button>
			</div>

			<div className="rounded-md border overflow-x-auto">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Date</TableHead>
							<TableHead>Username</TableHead>
							<TableHead>IP Address</TableHead>
							<TableHead>MAC Address</TableHead>
							<TableHead>Profile</TableHead>
							<TableHead>Validity</TableHead>
							<TableHead>Type</TableHead>
							<TableHead>Message</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							<TableRow>
								<TableCell colSpan={8} className="text-center py-8">
									Loading logs...
								</TableCell>
							</TableRow>
						) : logs.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={8}
									className="text-center py-8 text-muted-foreground"
								>
									Belum ada log aktivitas. Deploy on-login script untuk mulai
									mencatat.
								</TableCell>
							</TableRow>
						) : (
							logs.map((log) => (
								<TableRow key={log.id}>
									<TableCell className="text-xs text-muted-foreground whitespace-nowrap">
										{new Date(log.loggedAt).toLocaleString("id-ID", {
											day: "2-digit",
											month: "short",
											year: "2-digit",
											hour: "2-digit",
											minute: "2-digit",
										})}
									</TableCell>
									<TableCell className="font-medium">{log.username}</TableCell>
									<TableCell className="font-mono text-xs">
										{log.ipAddress || "-"}
									</TableCell>
									<TableCell className="font-mono text-xs">
										{log.macAddress || "-"}
									</TableCell>
									<TableCell>
										{log.profileName ? (
											<Badge variant="outline">{log.profileName}</Badge>
										) : (
											"-"
										)}
									</TableCell>
									<TableCell className="text-xs">
										{log.validity || "-"}
									</TableCell>
									<TableCell>
										{log.type === "login" ? (
											<Badge
												variant="outline"
												className="border-green-500/30 text-green-500"
											>
												Login
											</Badge>
										) : (
											<Badge variant="secondary">Logout</Badge>
										)}
									</TableCell>
									<TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
										{log.message || "-"}
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

			{!isLoading && data && (
				<div className="text-xs text-muted-foreground">
					{data.total} log entries
				</div>
			)}
		</div>
	);
}
