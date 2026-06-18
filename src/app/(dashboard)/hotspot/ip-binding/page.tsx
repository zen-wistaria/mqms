"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Trash2, Wifi } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

interface IpBinding {
	".id": string;
	"mac-address"?: string;
	address?: string;
	"to-address"?: string;
	type?: string;
	server?: string;
	disabled?: string;
	comment?: string;
}

const TYPE_LABELS: Record<string, string> = {
	regular: "Regular",
	bypassed: "Bypassed",
	blocked: "Blocked",
};

const TYPE_OPTS = [
	{ value: "regular", label: "Regular" },
	{ value: "bypassed", label: "Bypassed" },
	{ value: "blocked", label: "Blocked" },
];

export default function HotspotIpBindingPage() {
	const queryClient = useQueryClient();
	const [routerId, setRouterId] = useState<string>("");
	const [search, setSearch] = useState("");
	const [isAddOpen, setIsAddOpen] = useState(false);
	const [deleteConfirm, setDeleteConfirm] = useState<IpBinding | null>(null);

	const [form, setForm] = useState({
		"mac-address": "",
		address: "",
		"to-address": "",
		type: "bypassed",
		server: "all",
		comment: "",
	});

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

	const { data: bindings = [], isLoading } = useQuery({
		queryKey: ["hotspotBindings", routerId],
		queryFn: async () => {
			const res = await fetch(`/api/hotspot/bindings?routerId=${routerId}`);
			if (!res.ok) throw new Error("Failed to fetch bindings");
			return res.json();
		},
		enabled: !!routerId,
	});

	const deleteMutation = useMutation({
		mutationFn: async (id: string) => {
			const res = await fetch(
				`/api/hotspot/bindings?routerId=${routerId}&id=${encodeURIComponent(id)}`,
				{ method: "DELETE" },
			);
			if (!res.ok) throw new Error("Failed to delete binding");
			return res.json();
		},
		onSuccess: () => {
			toast.success("Binding dihapus");
			queryClient.invalidateQueries({
				queryKey: ["hotspotBindings", routerId],
			});
			setDeleteConfirm(null);
		},
		onError: (error: any) => {
			toast.error(error.message || "Gagal hapus binding");
			setDeleteConfirm(null);
		},
	});

	const addMutation = useMutation({
		mutationFn: async () => {
			const body: Record<string, string> = {};

			// Only send non-empty fields
			const mac = form["mac-address"].trim();
			const ip = form.address.trim();
			const toIp = form["to-address"].trim();

			if (mac) body["mac-address"] = mac;
			if (ip) body.address = ip;
			if (toIp) body["to-address"] = toIp;
			body.type = form.type;
			if (form.server && form.server !== "all") body.server = form.server;
			if (form.comment.trim()) body.comment = form.comment.trim();

			if (!mac && !ip) {
				throw new Error("MAC address atau IP address harus diisi");
			}

			const res = await fetch(`/api/hotspot/bindings?routerId=${routerId}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			if (!res.ok) {
				const d = await res.json();
				throw new Error(d.error || "Failed to add binding");
			}
			return res.json();
		},
		onSuccess: () => {
			toast.success("Binding ditambah");
			setIsAddOpen(false);
			setForm({
				"mac-address": "",
				address: "",
				"to-address": "",
				type: "bypassed",
				server: "all",
				comment: "",
			});
			queryClient.invalidateQueries({
				queryKey: ["hotspotBindings", routerId],
			});
		},
		onError: (error: any) => {
			toast.error(error.message || "Gagal tambah binding");
		},
	});

	const filtered = (bindings as IpBinding[]).filter(
		(b) =>
			(b["mac-address"] &&
				b["mac-address"].toLowerCase().includes(search.toLowerCase())) ||
			(b.address && b.address.toLowerCase().includes(search.toLowerCase())) ||
			(b.comment && b.comment.toLowerCase().includes(search.toLowerCase())),
	);

	if (!routerId) {
		return <div className="p-4 text-muted-foreground">Pilih router dulu.</div>;
	}

	return (
		<>
			<div className="space-y-4">
				{/* Toolbar */}
				<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
					<div className="relative w-full max-w-sm">
						<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
						<Input
							type="text"
							placeholder="Cari MAC, IP, atau comment..."
							className="pl-8"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
					</div>

					<Button onClick={() => setIsAddOpen(true)}>
						<Plus className="mr-2 h-4 w-4" /> Tambah Binding
					</Button>
					<Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Tambah IP Binding</DialogTitle>
							</DialogHeader>
							<div className="space-y-4 py-4">
								<div className="space-y-2">
									<Label>MAC Address</Label>
									<Input
										placeholder="XX:XX:XX:XX:XX:XX"
										maxLength={17}
										value={form["mac-address"]}
										onChange={(e) =>
											setForm({ ...form, "mac-address": e.target.value })
										}
									/>
								</div>
								<div className="space-y-2">
									<Label>IP Address (opsional)</Label>
									<Input
										placeholder="192.168.88.x"
										value={form.address}
										onChange={(e) =>
											setForm({ ...form, address: e.target.value })
										}
									/>
								</div>
								<div className="space-y-2">
									<Label>To IP Address (NAT, opsional)</Label>
									<Input
										placeholder="10.x.x.x"
										value={form["to-address"]}
										onChange={(e) =>
											setForm({ ...form, "to-address": e.target.value })
										}
									/>
								</div>
								<div className="space-y-2">
									<Label>Tipe</Label>
									<Select
										value={form.type}
										onValueChange={(v) =>
											setForm({ ...form, type: v ?? "bypassed" })
										}
									>
										<SelectTrigger>
											<SelectValue>
												{TYPE_LABELS[form.type] || form.type}
											</SelectValue>
										</SelectTrigger>
										<SelectContent>
											{TYPE_OPTS.map((t) => (
												<SelectItem key={t.value} value={t.value}>
													{t.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-2">
									<Label>Comment</Label>
									<Input
										value={form.comment}
										onChange={(e) =>
											setForm({ ...form, comment: e.target.value })
										}
									/>
								</div>
								<Button
									className="w-full"
									onClick={() => addMutation.mutate()}
									disabled={addMutation.isPending}
								>
									{addMutation.isPending ? "Menambah..." : "Tambah Binding"}
								</Button>
							</div>
						</DialogContent>
					</Dialog>
				</div>

				{/* Table */}
				<div className="rounded-md border overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>MAC Address</TableHead>
								<TableHead>IP Address</TableHead>
								<TableHead>To IP</TableHead>
								<TableHead>Type</TableHead>
								<TableHead>Server</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Comment</TableHead>
								<TableHead className="w-[80px]">Action</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{isLoading ? (
								<TableRow>
									<TableCell colSpan={8} className="text-center py-8">
										Loading bindings...
									</TableCell>
								</TableRow>
							) : filtered.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={8}
										className="text-center py-8 text-muted-foreground"
									>
										Tidak ada binding.
									</TableCell>
								</TableRow>
							) : (
								filtered.map((b: IpBinding) => (
									<TableRow key={b[".id"]}>
										<TableCell className="font-mono text-xs font-medium">
											{b["mac-address"] || "-"}
										</TableCell>
										<TableCell className="font-mono text-sm">
											{b.address || "-"}
										</TableCell>
										<TableCell className="font-mono text-xs text-muted-foreground">
											{b["to-address"] || "-"}
										</TableCell>
										<TableCell>
											<Badge
												variant={
													b.type === "bypassed"
														? "default"
														: b.type === "blocked"
															? "destructive"
															: "secondary"
												}
											>
												{b.type || "regular"}
											</Badge>
										</TableCell>
										<TableCell className="text-xs">
											{b.server || "all"}
										</TableCell>
										<TableCell>
											{b.disabled === "true" ? (
												<Badge variant="secondary">Disabled</Badge>
											) : (
												<Badge
													variant="outline"
													className="border-green-500/30 text-green-500"
												>
													Active
												</Badge>
											)}
										</TableCell>
										<TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
											{b.comment || "-"}
										</TableCell>
										<TableCell>
											<Button
												variant="ghost"
												size="icon"
												onClick={() => setDeleteConfirm(b)}
											>
												<Trash2 className="h-4 w-4 text-destructive" />
											</Button>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</div>

				{!isLoading && (
					<div className="text-xs text-muted-foreground">
						Total: {(bindings as IpBinding[]).length} binding
						{filtered.length < (bindings as IpBinding[]).length &&
							` (filtered: ${filtered.length})`}
					</div>
				)}
			</div>

			{deleteConfirm && (
				<ConfirmModal
					open
					onClose={() => setDeleteConfirm(null)}
					onConfirm={() => deleteMutation.mutate(deleteConfirm[".id"])}
					title="Hapus Binding"
					message={`Yakin ingin menghapus binding ${deleteConfirm["mac-address"] || deleteConfirm.address}?`}
					confirmLabel="Hapus"
					variant="destructive"
					isLoading={deleteMutation.isPending}
				/>
			)}
		</>
	);
}
