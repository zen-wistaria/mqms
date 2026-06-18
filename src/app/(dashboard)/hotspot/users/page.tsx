"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	CheckCircle2,
	MoreHorizontal,
	Plus,
	Printer,
	RotateCcw,
	Search,
	TimerReset,
	Trash2,
	X,
	XCircle,
} from "lucide-react";
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
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
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
import { formatBytes } from "@/lib/format";
import { VoucherPrintDialog } from "@/components/voucher/voucher-print-dialog";
import type { VoucherPrintData } from "@/components/voucher/voucher-print-templates";

export default function HotspotUsersPage() {
	const queryClient = useQueryClient();
	const [routerId, setRouterId] = useState<string>("");
	const [search, setSearch] = useState("");
	const [batchFilter, setBatchFilter] = useState("");
	const [isAddOpen, setIsAddOpen] = useState(false);
	const [printData, setPrintData] = useState<VoucherPrintData | null>(null);
	const [showPrint, setShowPrint] = useState(false);

	// Selection
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const toggle = (id: string) => {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};
	const selectAll = (ids: string[]) => setSelected(new Set(ids));
	const clearSelection = () => setSelected(new Set());

	// Confirm modal
	const [confirm, setConfirm] = useState<{
		type: "delete" | "deleteSelected" | "batchAction";
		userId?: string;
		userName?: string;
		actionName?: string;
	} | null>(null);

	const [newUser, setNewUser] = useState({
		name: "",
		password: "",
		profile: "default",
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

	const { data: users = [], isLoading } = useQuery({
		queryKey: ["hotspotUsers", routerId],
		queryFn: async () => {
			const res = await fetch(`/api/hotspot/users?routerId=${routerId}`);
			if (!res.ok) throw new Error("Failed to fetch users");
			return res.json();
		},
		enabled: !!routerId,
	});

	const { data: profiles = [] } = useQuery({
		queryKey: ["hotspotProfiles", routerId],
		queryFn: async () => {
			const res = await fetch(`/api/hotspot/profiles?routerId=${routerId}`);
			if (!res.ok) throw new Error("Failed to fetch profiles");
			return res.json();
		},
		enabled: !!routerId,
	});

	const userActionMutation = useMutation({
		mutationFn: async ({
			id,
			action,
		}: {
			id: string;
			action: string;
			name: string;
		}) => {
			const res = await fetch(
				`/api/hotspot/users/${encodeURIComponent(id)}?routerId=${routerId}&action=${action}`,
				{ method: "PATCH" },
			);
			if (!res.ok) {
				const d = await res.json();
				throw new Error(d.error || `Failed to ${action} user`);
			}
			return res.json();
		},
		onSuccess: (data) => {
			const labels: Record<string, string> = {
				enabled: "User diaktifkan",
				disabled: "User dinonaktifkan",
				"counters-reset": "Counter direset",
				"uptime-reset": "Uptime direset (session diputus)",
			};
			toast.success(labels[data.action] || `Action ${data.action} berhasil`);
			queryClient.invalidateQueries({ queryKey: ["hotspotUsers", routerId] });
		},
		onError: (error: any) => {
			toast.error(error.message || "Gagal");
		},
	});

	const batchActionMutation = useMutation({
		mutationFn: async ({
			ids,
			action,
		}: {
			ids: string[];
			action: string;
		}) => {
			const results = await Promise.allSettled(
				ids.map((id) =>
					fetch(
						`/api/hotspot/users/${encodeURIComponent(id)}?routerId=${routerId}&action=${action}`,
						{ method: "PATCH" },
					),
				),
			);
			const failed = results.filter((r) => r.status === "rejected").length;
			const succeeded = ids.length - failed;
			return { succeeded, failed, action };
		},
		onSuccess: (res) => {
			const labels: Record<string, string> = {
				enable: "diaktifkan",
				disable: "dinonaktifkan",
				"reset-counters": "di-reset counternya",
				"reset-uptime": "di-reset uptime-nya",
			};
			const label = labels[res.action] || res.action;
			toast.success(
				`${res.succeeded} user ${label}${res.failed > 0 ? `, ${res.failed} gagal` : ""}`,
			);
			clearSelection();
			queryClient.invalidateQueries({ queryKey: ["hotspotUsers", routerId] });
			setConfirm(null);
		},
		onError: () => {
			toast.error("Gagal");
			setConfirm(null);
		},
	});

	const deleteMutation = useMutation({
		mutationFn: async (id: string) => {
			const res = await fetch(
				`/api/hotspot/users?routerId=${routerId}&id=${encodeURIComponent(id)}`,
				{ method: "DELETE" },
			);
			if (!res.ok) throw new Error("Failed to delete user");
			return res.json();
		},
		onSuccess: () => {
			toast.success("User dihapus");
			queryClient.invalidateQueries({ queryKey: ["hotspotUsers", routerId] });
			setConfirm(null);
		},
		onError: (error: any) => {
			toast.error(error.message || "Gagal hapus user");
			setConfirm(null);
		},
	});

	const deleteSelectedMutation = useMutation({
		mutationFn: async (ids: string[]) => {
			const results = await Promise.allSettled(
				ids.map((id) =>
					fetch(
						`/api/hotspot/users?routerId=${routerId}&id=${encodeURIComponent(id)}`,
						{ method: "DELETE" },
					),
				),
			);
			const failed = results.filter((r) => r.status === "rejected").length;
			const succeeded = ids.length - failed;
			return { succeeded, failed };
		},
		onSuccess: (res) => {
			toast.success(
				`${res.succeeded} user dihapus${res.failed > 0 ? `, ${res.failed} gagal` : ""}`,
			);
			clearSelection();
			queryClient.invalidateQueries({ queryKey: ["hotspotUsers", routerId] });
			setConfirm(null);
		},
		onError: () => {
			toast.error("Gagal menghapus user terpilih");
			setConfirm(null);
		},
	});

	const addMutation = useMutation({
		mutationFn: async () => {
			const res = await fetch(`/api/hotspot/users?routerId=${routerId}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(newUser),
			});
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || "Failed to add user");
			}
			return res.json();
		},
		onSuccess: () => {
			toast.success("User ditambah");
			setIsAddOpen(false);
			setNewUser({ name: "", password: "", profile: "default", comment: "" });
			queryClient.invalidateQueries({ queryKey: ["hotspotUsers", routerId] });
		},
		onError: (error: any) => {
			toast.error(error.message || "Gagal tambah user");
		},
	});

	// Extract unique batch comments
	const batchComments = Array.from(
		new Set(
			(users as any[])
				.filter((u: any) => u.comment && u.comment.match(/^(up|vc)-\d{3}/))
				.map((u: any) => u.comment),
		),
	).sort().reverse() as string[];

	const filteredUsers = (users as any[]).filter((u) => {
		if (batchFilter && u.comment !== batchFilter) return false;
		return (
			(u.name && u.name.toLowerCase().includes(search.toLowerCase())) ||
			(u.comment && u.comment.toLowerCase().includes(search.toLowerCase()))
		);
	});

	const handlePrintBatch = (comment: string) => {
		const batchUsers = (users as any[]).filter((u) => u.comment === comment);
		setPrintData({
			users: batchUsers.map((u) => ({
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
			showQR: false,
		});
		setShowPrint(true);
	};

	const handlePrintSelected = () => {
		const selectedUsers = (users as any[]).filter((u) =>
			selected.has(u[".id"]),
		);
		if (selectedUsers.length === 0) {
			toast.error("Pilih user dulu");
			return;
		}
		setPrintData({
			users: selectedUsers.map((u) => ({
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
			showPassword: true,
			showQR: false,
		});
		setShowPrint(true);
	};

	if (!routerId) {
		return (
			<div className="p-4 text-muted-foreground">Pilih router dulu.</div>
		);
	}

	return (
		<>
			<div className="space-y-4">
				{/* Toolbar */}
				<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
					<div className="flex items-center gap-2 w-full sm:w-auto">
						<div className="relative w-full max-w-sm">
							<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
							<Input
								type="text"
								placeholder="Cari nama atau comment..."
								className="pl-8"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
							/>
						</div>
						{batchComments.length > 0 && (
							<div className="min-w-[180px]">
								<Select
									value={batchFilter}
									onValueChange={(v) => setBatchFilter(v ?? "")}
								>
									<SelectTrigger>
										<SelectValue>
											{batchFilter ? batchFilter : "Semua Batch"}
										</SelectValue>
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="">Semua Batch</SelectItem>
										{batchComments.slice(0, 30).map((c) => (
											<SelectItem key={c} value={c}>
												{c}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}
					</div>

					<div className="flex items-center gap-2">
						{selected.size > 0 && (
							<>
								<Button
									variant="outline"
									size="sm"
									onClick={() =>
										setConfirm({
											type: "batchAction",
											actionName: "enable",
										})
									}
								>
									<CheckCircle2 className="mr-1 h-4 w-4 text-green-500" />
									Enable ({selected.size})
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() =>
										setConfirm({
											type: "batchAction",
											actionName: "disable",
										})
									}
								>
									<XCircle className="mr-1 h-4 w-4 text-orange-500" />
									Disable ({selected.size})
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() =>
										setConfirm({
											type: "batchAction",
											actionName: "reset-counters",
										})
									}
								>
									<RotateCcw className="mr-1 h-4 w-4" />
									Reset ({selected.size})
								</Button>
								<Button
									variant="destructive"
									size="sm"
									onClick={() =>
										setConfirm({ type: "deleteSelected" })
									}
								>
									<Trash2 className="mr-1 h-4 w-4" />
									Hapus ({selected.size})
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={handlePrintSelected}
								>
									<Printer className="mr-1 h-4 w-4" />
									Print ({selected.size})
								</Button>
								<Button
									variant="ghost"
									size="sm"
									onClick={clearSelection}
								>
									<X className="mr-1 h-4 w-4" />
									Batal
								</Button>
							</>
						)}
						<Button onClick={() => setIsAddOpen(true)}>
							<Plus className="mr-2 h-4 w-4" /> Tambah User
						</Button>
						<Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>Tambah User Hotspot</DialogTitle>
								</DialogHeader>
								<div className="space-y-4 py-4">
									<div className="space-y-2">
										<Label>Username</Label>
										<Input
											value={newUser.name}
											onChange={(e) =>
												setNewUser({ ...newUser, name: e.target.value })
											}
										/>
									</div>
									<div className="space-y-2">
										<Label>Password</Label>
										<Input
											value={newUser.password}
											onChange={(e) =>
												setNewUser({ ...newUser, password: e.target.value })
											}
										/>
									</div>
									<div className="space-y-2">
										<Label>Profile</Label>
										<Select
											value={newUser.profile}
											onValueChange={(v) =>
												setNewUser({ ...newUser, profile: v || "default" })
											}
										>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="default">default</SelectItem>
												{profiles.map(
													(p: any) =>
														p.name !== "default" && (
															<SelectItem key={p[".id"]} value={p.name}>
																{p.name}
															</SelectItem>
														),
												)}
											</SelectContent>
										</Select>
									</div>
									<div className="space-y-2">
										<Label>Comment</Label>
										<Input
											value={newUser.comment}
											onChange={(e) =>
												setNewUser({ ...newUser, comment: e.target.value })
											}
										/>
									</div>
									<Button
										className="w-full"
										onClick={() => addMutation.mutate()}
										disabled={addMutation.isPending}
									>
										{addMutation.isPending ? "Menambah..." : "Tambah User"}
									</Button>
								</div>
							</DialogContent>
						</Dialog>
					</div>
				</div>

				{/* Batch quick print */}
				{batchComments.length > 0 && !search && !batchFilter && (
					<div className="flex flex-wrap gap-2">
						<span className="text-xs text-muted-foreground self-center">
							Batch:
						</span>
						{batchComments.slice(0, 10).map((comment) => (
							<Badge
								key={comment}
								variant="secondary"
								className="cursor-pointer hover:bg-secondary/80 gap-1"
								onClick={() => handlePrintBatch(comment)}
							>
								{comment}
								<Printer className="h-3 w-3" />
							</Badge>
						))}
					</div>
				)}

				{/* Table */}
				<div className="rounded-md border overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-[40px]">
									<input
										type="checkbox"
										className="h-4 w-4"
										checked={
											filteredUsers.length > 0 &&
											selected.size === filteredUsers.length
										}
										onChange={() => {
											if (selected.size === filteredUsers.length) {
												clearSelection();
											} else {
												selectAll(
													filteredUsers.map((u: any) => u[".id"]),
												);
											}
										}}
									/>
								</TableHead>
								<TableHead>Username</TableHead>
								<TableHead>Profile</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Uptime</TableHead>
								<TableHead>Bytes In/Out</TableHead>
								<TableHead>Comment</TableHead>
								<TableHead className="w-[80px]">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{isLoading ? (
								<TableRow>
									<TableCell colSpan={8} className="text-center py-8">
										Loading users...
									</TableCell>
								</TableRow>
							) : filteredUsers.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={8}
										className="text-center py-8 text-muted-foreground"
									>
										Tidak ada user.
									</TableCell>
								</TableRow>
							) : (
								filteredUsers.map((user: any) => {
									const isSelected = selected.has(user[".id"]);
									return (
										<TableRow
											key={user[".id"]}
											className={isSelected ? "bg-muted/50" : ""}
										>
											<TableCell>
												<input
													type="checkbox"
													className="h-4 w-4"
													checked={isSelected}
													onChange={() => toggle(user[".id"])}
												/>
											</TableCell>
											<TableCell className="font-medium">
												{user.name}
											</TableCell>
											<TableCell>
												<Badge variant="outline">
													{user.profile || "default"}
												</Badge>
											</TableCell>
											<TableCell>
												{user.disabled === "true" ? (
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
											<TableCell>{user.uptime || "0s"}</TableCell>
											<TableCell className="text-xs text-muted-foreground">
												{formatBytes(Number(user["bytes-in"]) || 0)} /{" "}
												{formatBytes(Number(user["bytes-out"]) || 0)}
											</TableCell>
											<TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
												{user.comment}
											</TableCell>
											<TableCell>
												<DropdownMenu>
													<DropdownMenuTrigger>
														<Button variant="ghost" size="icon">
															<MoreHorizontal className="h-4 w-4" />
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent
														align="end"
														className="w-48"
													>
														{user.disabled === "true" ? (
															<DropdownMenuItem
																onClick={() =>
																	userActionMutation.mutate({
																		id: user[".id"],
																		action: "enable",
																		name: user.name,
																	})
																}
															>
																<CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
																Enable
															</DropdownMenuItem>
														) : (
															<DropdownMenuItem
																onClick={() =>
																	userActionMutation.mutate({
																		id: user[".id"],
																		action: "disable",
																		name: user.name,
																	})
																}
															>
																<XCircle className="mr-2 h-4 w-4 text-orange-500" />
																Disable
															</DropdownMenuItem>
														)}
														<DropdownMenuItem
															onClick={() =>
																userActionMutation.mutate({
																	id: user[".id"],
																	action: "reset-counters",
																	name: user.name,
																})
															}
														>
															<RotateCcw className="mr-2 h-4 w-4" />
															Reset Counter
														</DropdownMenuItem>
														<DropdownMenuItem
															onClick={() =>
																userActionMutation.mutate({
																	id: user[".id"],
																	action: "reset-uptime",
																	name: user.name,
																})
															}
														>
															<TimerReset className="mr-2 h-4 w-4" />
															Reset Uptime
														</DropdownMenuItem>
														<DropdownMenuItem
															className="text-destructive focus:text-destructive"
															onClick={() =>
																setConfirm({
																	type: "delete",
																	userId: user[".id"],
																	userName: user.name,
																})
															}
														>
															<Trash2 className="mr-2 h-4 w-4" />
															Hapus
														</DropdownMenuItem>
													</DropdownMenuContent>
												</DropdownMenu>
											</TableCell>
										</TableRow>
									);
								})
							)}
						</TableBody>
					</Table>
				</div>

				{!isLoading && (
					<div className="text-xs text-muted-foreground">
						Total: {(users as any[]).length} user
						{selected.size > 0 &&
							` | ${selected.size} dipilih`}
					</div>
				)}
			</div>

			{/* Confirm modals */}
			{confirm?.type === "delete" && confirm.userId && (
				<ConfirmModal
					open
					onClose={() => setConfirm(null)}
					onConfirm={() => deleteMutation.mutate(confirm.userId!)}
					title="Hapus User"
					message={`Yakin ingin menghapus user "${confirm.userName}"?`}
					confirmLabel="Hapus"
					variant="destructive"
					isLoading={deleteMutation.isPending}
				/>
			)}

			{confirm?.type === "batchAction" && confirm.actionName && (
				<ConfirmModal
					open
					onClose={() => setConfirm(null)}
					onConfirm={() =>
						batchActionMutation.mutate({
							ids: Array.from(selected),
							action: confirm.actionName!,
						})
					}
					title="Konfirmasi Batch Action"
					message={`Yakin ingin ${confirm.actionName === "enable" ? "mengaktifkan" : confirm.actionName === "disable" ? "menonaktifkan" : "mereset counter"} ${selected.size} user?`}
					confirmLabel="Ya, jalankan"
					variant="default"
					isLoading={batchActionMutation.isPending}
				/>
			)}

			{confirm?.type === "deleteSelected" && (
				<ConfirmModal
					open
					onClose={() => setConfirm(null)}
					onConfirm={() =>
						deleteSelectedMutation.mutate(Array.from(selected))
					}
					title="Hapus User Terpilih"
					message={`Yakin ingin menghapus ${selected.size} user terpilih?`}
					confirmLabel={`Hapus ${selected.size} User`}
					variant="destructive"
					isLoading={deleteSelectedMutation.isPending}
				/>
			)}

			{printData && (
				<VoucherPrintDialog
					data={printData}
					open={showPrint}
					onClose={() => {
						setShowPrint(false);
						clearSelection();
					}}
				/>
			)}
		</>
	);
}
