"use client";

import { useQuery } from "@tanstack/react-query";
import { Download, Search, TrendingUp, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

// ---------- types ----------

interface RevenueStats {
	totalRevenue: number;
	totalSold: number;
	avgPrice: number;
	todayCount: number;
	perProfile: Array<{ profile: string; revenue: number; count: number }>;
	monthly: Array<{ month: string; revenue: number; count: number }>;
}

interface Transaction {
	id: string;
	routerId: string;
	username: string;
	profileName: string;
	price: number;
	batchComment: string | null;
	soldAt: string;
	recordedBy: string | null;
	status: string;
}

// ---------- component ----------

export default function HotspotRevenuePage() {
	const [routerId, setRouterId] = useState<string>("");
	const [search, setSearch] = useState("");
	const [filterProfile, setFilterProfile] = useState("");
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

	// Build query params
	const queryParams = new URLSearchParams();
	if (routerId) queryParams.set("routerId", routerId);
	if (dateFrom) queryParams.set("from", dateFrom);
	if (dateTo) queryParams.set("to", dateTo);

	const statsQuery = useQuery({
		queryKey: ["hotspotRevenueStats", routerId, dateFrom, dateTo],
		queryFn: async () => {
			const res = await fetch(
				`/api/hotspot/revenue/stats?${queryParams.toString()}`,
			);
			if (!res.ok) throw new Error("Failed to fetch revenue stats");
			return res.json() as Promise<RevenueStats>;
		},
		enabled: !!routerId,
	});

	const transactionsQuery = useQuery({
		queryKey: ["hotspotRevenue", routerId, dateFrom, dateTo, filterProfile],
		queryFn: async () => {
			const params = new URLSearchParams(queryParams);
			if (filterProfile) params.set("profile", filterProfile);
			const res = await fetch(
				`/api/hotspot/revenue?${params.toString()}&limit=500`,
			);
			if (!res.ok) throw new Error("Failed to fetch transactions");
			return res.json() as Promise<{
				transactions: Transaction[];
				total: number;
			}>;
		},
		enabled: !!routerId,
	});

	const stats = statsQuery.data;
	const transactions = transactionsQuery.data?.transactions || [];

	// Filter by search (username or batch)
	const filtered = transactions.filter(
		(t) =>
			t.username.toLowerCase().includes(search.toLowerCase()) ||
			(t.batchComment || "").toLowerCase().includes(search.toLowerCase()),
	);

	// Export CSV
	const handleExport = () => {
		const headers = [
			"Date",
			"Username",
			"Profile",
			"Price",
			"Batch",
			"Status",
			"Recorded By",
		];
		const rows = transactions.map((t) => [
			new Date(t.soldAt).toLocaleDateString("id-ID"),
			t.username,
			t.profileName,
			t.price.toString(),
			t.batchComment || "",
			t.status,
			t.recordedBy || "",
		]);

		const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join(
			"\n",
		);
		const blob = new Blob([csv], { type: "text/csv" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `revenue-${new Date().toISOString().slice(0, 10)}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};

	const formatRp = (val: number) =>
		`Rp ${val.toLocaleString("id-ID")}`;

	if (!routerId) {
		return <div className="p-4 text-muted-foreground">Pilih router dulu.</div>;
	}

	return (
		<div className="space-y-6">
			{/* Stats cards */}
			<div className="grid gap-4 md:grid-cols-4">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">Total Pendapatan</CardTitle>
					</CardHeader>
					<CardContent>
						{statsQuery.isLoading ? (
							<Skeleton className="h-8 w-24" />
						) : (
							<div className="text-2xl font-bold text-green-600">
								{formatRp(stats?.totalRevenue || 0)}
							</div>
						)}
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">Total Voucher Terjual</CardTitle>
					</CardHeader>
					<CardContent>
						{statsQuery.isLoading ? (
							<Skeleton className="h-8 w-16" />
						) : (
							<div className="text-2xl font-bold flex items-center gap-2">
								{stats?.totalSold || 0}
								<Users className="h-4 w-4 text-muted-foreground" />
							</div>
						)}
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">Rata-rata Harga</CardTitle>
					</CardHeader>
					<CardContent>
						{statsQuery.isLoading ? (
							<Skeleton className="h-8 w-20" />
						) : (
							<div className="text-2xl font-bold">
								{formatRp(stats?.avgPrice || 0)}
							</div>
						)}
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">Hari Ini</CardTitle>
					</CardHeader>
					<CardContent>
						{statsQuery.isLoading ? (
							<Skeleton className="h-8 w-16" />
						) : (
							<div className="text-2xl font-bold flex items-center gap-2">
								{stats?.todayCount || 0}
								<TrendingUp className="h-4 w-4 text-muted-foreground" />
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Revenue by Profile */}
			{stats && stats.perProfile.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Pendapatan per Profile</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							{stats.perProfile.map((p) => {
								const percentage =
									stats.totalRevenue > 0
										? ((p.revenue / stats.totalRevenue) * 100).toFixed(1)
										: "0";
								return (
									<div key={p.profile} className="flex items-center gap-4">
										<Badge variant="outline" className="w-32 truncate">
											{p.profile}
										</Badge>
										<div className="flex-1 h-4 bg-secondary rounded-full overflow-hidden">
											<div
												className="h-full bg-primary/60 rounded-full transition-all"
												style={{ width: `${percentage}%` }}
											/>
										</div>
										<span className="text-sm font-medium w-24 text-right">
											{formatRp(p.revenue)}
										</span>
										<span className="text-xs text-muted-foreground w-12 text-right">
											{p.count}x
										</span>
									</div>
								);
							})}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Filters & Table */}
			<Card>
				<CardHeader className="pb-3">
					<div className="flex items-center justify-between">
						<CardTitle className="text-base">Transaksi</CardTitle>
						<Button variant="outline" size="sm" onClick={handleExport}>
							<Download className="mr-1 h-4 w-4" />
							Export CSV
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					{/* Filters */}
					<div className="flex flex-wrap gap-4 mb-4">
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
							<Label className="text-xs">Profile</Label>
							<Select value={filterProfile} onValueChange={(v) => setFilterProfile(v || "")}>
								<SelectTrigger className="h-8 w-36">
									<SelectValue placeholder="All" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="">All</SelectItem>
									{stats?.perProfile.map((p) => (
										<SelectItem key={p.profile} value={p.profile}>
											{p.profile}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1">
							<Label className="text-xs">Cari</Label>
							<div className="relative">
								<Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
								<Input
									type="text"
									placeholder="Username atau batch..."
									className="pl-6 h-8 w-48"
									value={search}
									onChange={(e) => setSearch(e.target.value)}
								/>
							</div>
						</div>
					</div>

					{/* Table */}
					<div className="rounded-md border overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Date</TableHead>
									<TableHead>Username</TableHead>
									<TableHead>Profile</TableHead>
									<TableHead className="text-right">Price</TableHead>
									<TableHead>Batch</TableHead>
									<TableHead>Status</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{transactionsQuery.isLoading ? (
									<TableRow>
										<TableCell colSpan={6} className="text-center py-8">
											Loading...
										</TableCell>
									</TableRow>
								) : filtered.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={6}
											className="text-center py-8 text-muted-foreground"
										>
											Belum ada transaksi.
										</TableCell>
									</TableRow>
								) : (
									filtered.map((t) => (
										<TableRow key={t.id}>
											<TableCell className="text-sm text-muted-foreground">
												{new Date(t.soldAt).toLocaleDateString("id-ID", {
													day: "numeric",
													month: "short",
													year: "2-digit",
												})}
											</TableCell>
											<TableCell className="font-medium">{t.username}</TableCell>
											<TableCell>
												<Badge variant="outline">{t.profileName}</Badge>
											</TableCell>
											<TableCell className="text-right font-mono">
												{formatRp(t.price)}
											</TableCell>
											<TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">
												{t.batchComment || "-"}
											</TableCell>
											<TableCell>
												<StatusBadge status={t.status} />
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</div>

					{!transactionsQuery.isLoading && (
						<div className="text-xs text-muted-foreground mt-2">
							{transactionsQuery.data?.total || 0} transaksi
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

function StatusBadge({ status }: { status: string }) {
	switch (status) {
		case "active":
			return (
				<Badge
					variant="outline"
					className="border-green-500/30 text-green-500"
				>
					Active
				</Badge>
			);
		case "expired":
			return <Badge variant="secondary">Expired</Badge>;
		case "removed":
			return <Badge variant="destructive">Removed</Badge>;
		default:
			return <Badge variant="outline">{status}</Badge>;
	}
}
