"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Calendar,
	Clock,
	Database,
	Printer,
	Trash2,
	Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { VoucherPrintDialog } from "@/components/voucher/voucher-print-dialog";
import type { VoucherPrintData } from "@/components/voucher/voucher-print-templates";

interface Batch {
	batchComment: string;
	userMode: string;
	tag: string;
	date: string;
	adcomment: string;
	count: number;
	profiles: string[];
	timeLimit: string;
	dataLimit: string;
	server: string;
}

export default function HotspotBatchPage() {
	const queryClient = useQueryClient();
	const [routerId, setRouterId] = useState<string>("");
	const [search, setSearch] = useState("");
	const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
	const [printData, setPrintData] = useState<VoucherPrintData | null>(null);
	const [showPrint, setShowPrint] = useState(false);

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

	const { data: batches = [], isLoading } = useQuery({
		queryKey: ["hotspotBatches", routerId],
		queryFn: async () => {
			const res = await fetch(`/api/hotspot/batches?routerId=${routerId}`);
			if (!res.ok) throw new Error("Failed to fetch batches");
			return res.json();
		},
		enabled: !!routerId,
	});

	const deleteMutation = useMutation({
		mutationFn: async (comment: string) => {
			const res = await fetch(
				`/api/hotspot/batches/${encodeURIComponent(comment)}?routerId=${routerId}`,
				{ method: "DELETE" },
			);
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || "Failed to delete batch");
			}
			return res.json();
		},
		onSuccess: (data) => {
			toast.success(`Batch dihapus: ${data.deleted} user`);
			queryClient.invalidateQueries({ queryKey: ["hotspotBatches", routerId] });
			queryClient.invalidateQueries({ queryKey: ["hotspotUsers", routerId] });
			setDeleteConfirm(null);
		},
		onError: (error: any) => {
			toast.error(error.message || "Gagal hapus batch");
			setDeleteConfirm(null);
		},
	});

	const handlePrint = async (comment: string) => {
		const res = await fetch(
			`/api/hotspot/users?routerId=${routerId}&comment=${encodeURIComponent(comment)}`,
		);
		if (!res.ok) {
			toast.error("Gagal fetch user batch");
			return;
		}
		const users = await res.json();
		const batchUsers = (Array.isArray(users) ? users : []).filter(
			(u: any) => u.comment === comment,
		);

		setPrintData({
			users: batchUsers.map((u: any) => ({
				".id": u[".id"],
				name: u.name,
				password: u.password || "",
				profile: u.profile,
				server: u.server,
				"limit-uptime": u["limit-uptime"],
				"limit-bytes-total": u["limit-bytes-total"],
				comment: u.comment,
			})),
			title: "Hotspot Voucher",
			batchComment: comment,
			showPassword: true,
		});
		setShowPrint(true);
	};

	const filtered = (batches as Batch[]).filter(
		(b) =>
			b.batchComment.toLowerCase().includes(search.toLowerCase()) ||
			b.profiles.some((p) => p.toLowerCase().includes(search.toLowerCase())),
	);

	if (!routerId) {
		return <div className="p-4 text-muted-foreground">Pilih router dulu.</div>;
	}

	return (
		<>
			<div className="space-y-4">
				{/* Stats cards */}
				<div className="grid gap-4 md:grid-cols-3">
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium">Total Batch</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								{(batches as Batch[]).length}
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium">
								Total User (batch)
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								{(batches as Batch[]).reduce(
									(s: number, b: Batch) => s + b.count,
									0,
								)}
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium">
								Avg per Batch
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								{(batches as Batch[]).length > 0
									? Math.round(
											(batches as Batch[]).reduce(
												(s: number, b: Batch) => s + b.count,
												0,
											) / (batches as Batch[]).length,
										)
									: 0}
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Search */}
				<div className="w-full max-w-sm">
					<Input
						type="text"
						placeholder="Cari batch comment..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>
				</div>

				{/* Table */}
				<div className="rounded-md border overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Batch Comment</TableHead>
								<TableHead>Mode</TableHead>
								<TableHead>Date</TableHead>
								<TableHead>Count</TableHead>
								<TableHead>Profiles</TableHead>
								<TableHead>Limits</TableHead>
								<TableHead>Server</TableHead>
								<TableHead className="w-[120px]">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{isLoading ? (
								<TableRow>
									<TableCell colSpan={8} className="text-center py-8">
										Loading batches...
									</TableCell>
								</TableRow>
							) : filtered.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={8}
										className="text-center py-8 text-muted-foreground"
									>
										Tidak ada batch.
									</TableCell>
								</TableRow>
							) : (
								filtered.map((batch: Batch) => (
									<TableRow key={batch.batchComment}>
										<TableCell className="font-mono text-xs font-medium">
											{batch.batchComment}
										</TableCell>
										<TableCell>
											<Badge
												variant={
													batch.userMode === "up" ? "default" : "secondary"
												}
											>
												{batch.userMode === "up" ? "U&P" : "VC"}
											</Badge>
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-1 text-xs">
												<Calendar className="h-3 w-3" />
												{batch.date}
											</div>
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-1">
												<Users className="h-3 w-3 text-muted-foreground" />
												{batch.count}
											</div>
										</TableCell>
										<TableCell className="max-w-[200px] truncate">
											{batch.profiles.join(", ")}
										</TableCell>
										<TableCell className="text-xs text-muted-foreground">
											<div className="flex flex-col gap-0.5">
												{batch.timeLimit && (
													<span className="flex items-center gap-1">
														<Clock className="h-3 w-3" />
														{batch.timeLimit}
													</span>
												)}
												{batch.dataLimit && (
													<span className="flex items-center gap-1">
														<Database className="h-3 w-3" />
														{formatBytesSimple(Number(batch.dataLimit))}
													</span>
												)}
												{!batch.timeLimit && !batch.dataLimit && (
													<span>Unlimited</span>
												)}
											</div>
										</TableCell>
										<TableCell className="text-xs">{batch.server}</TableCell>
										<TableCell>
											<div className="flex items-center gap-1">
												<Button
													variant="ghost"
													size="icon"
													onClick={() => handlePrint(batch.batchComment)}
													title="Print"
												>
													<Printer className="h-4 w-4" />
												</Button>
												<Button
													variant="ghost"
													size="icon"
													onClick={() => setDeleteConfirm(batch.batchComment)}
													title="Hapus batch"
												>
													<Trash2 className="h-4 w-4 text-destructive" />
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</div>

				{!isLoading && (batches as Batch[]).length > 0 && (
					<div className="text-xs text-muted-foreground">
						Total: {(batches as Batch[]).length} batch
					</div>
				)}
			</div>

			{deleteConfirm && (
				<ConfirmModal
					open
					onClose={() => setDeleteConfirm(null)}
					onConfirm={() => deleteMutation.mutate(deleteConfirm)}
					title="Hapus Batch"
					message={`Yakin ingin menghapus semua user di batch "${deleteConfirm}"?`}
					confirmLabel="Hapus Batch"
					variant="destructive"
					isLoading={deleteMutation.isPending}
				/>
			)}

			{printData && (
				<VoucherPrintDialog
					data={printData}
					open={showPrint}
					onClose={() => setShowPrint(false)}
				/>
			)}
		</>
	);
}

function formatBytesSimple(bytes: number): string {
	if (!bytes) return "0";
	const units = ["B", "KB", "MB", "GB", "TB"];
	const k = 1024;
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${(bytes / k ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
