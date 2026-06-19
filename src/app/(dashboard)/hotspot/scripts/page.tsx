"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Code,
	Plus,
	Save,
	Search,
	Trash2,
	Upload,
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

interface HotspotScript {
	id: string;
	routerId: string;
	type: "on-login" | "on-logout";
	name: string;
	content: string;
	deployed: boolean;
	createdAt: string;
	updatedAt: string;
}

const defaultForm = {
	type: "on-login" as "on-login" | "on-logout",
	name: "",
	content: "",
};

const DEFAULT_ONLOGIN = `# Record login to hotspot log
:local username [/ip hotspot active get [find] user]
:local address [/ip hotspot active get [find] address]
:local macAddr [/ip hotspot active get [find] mac-address]
:local profile [/ip hotspot user get [find name=$username] profile]
:local limitUptime [/ip hotspot user get [find name=$username] limit-uptime]

:log info ("user-hotspot: $username login, IP: $address, MAC: $macAddr, Profile: $profile, Validity: $limitUptime")
`;

const DEFAULT_ONLOGOUT = `# Record logout to hotspot log
:local username [/ip hotspot active get [find] user]
:local address [/ip hotspot active get [find] address]
:local macAddr [/ip hotspot active get [find] mac-address]
:local uptime [/ip hotspot active get [find] uptime]

:log info ("user-hotspot: $username logout, IP: $address, MAC: $macAddr, Uptime: $uptime")
`;

export default function HotspotScriptsPage() {
	const queryClient = useQueryClient();
	const [routerId, setRouterId] = useState<string>("");
	const [search, setSearch] = useState("");
	const [filterType, setFilterType] = useState("");

	// Dialogs
	const [isAddOpen, setIsAddOpen] = useState(false);
	const [isEditOpen, setIsEditOpen] = useState(false);
	const [editId, setEditId] = useState<string | null>(null);
	const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

	const [form, setForm] = useState(defaultForm);

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

	// Queries
	const queryParams = new URLSearchParams();
	if (routerId) queryParams.set("routerId", routerId);
	if (filterType) queryParams.set("type", filterType);

	const { data: scripts = [], isLoading } = useQuery({
		queryKey: ["hotspotScripts", routerId, filterType],
		queryFn: async () => {
			const res = await fetch(
				`/api/hotspot/scripts?${queryParams.toString()}`,
			);
			if (!res.ok) throw new Error("Failed to fetch scripts");
			return res.json() as Promise<HotspotScript[]>;
		},
		enabled: !!routerId,
	});

	// Mutations
	const createMutation = useMutation({
		mutationFn: async () => {
			const res = await fetch("/api/hotspot/scripts", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ ...form, routerId }),
			});
			if (!res.ok) {
				const d = await res.json();
				throw new Error(d.error || "Failed to create script");
			}
			return res.json();
		},
		onSuccess: () => {
			toast.success("Script created");
			setIsAddOpen(false);
			setForm(defaultForm);
			queryClient.invalidateQueries({
				queryKey: ["hotspotScripts", routerId],
			});
		},
		onError: (error: any) => toast.error(error.message),
	});

	const updateMutation = useMutation({
		mutationFn: async () => {
			const res = await fetch(`/api/hotspot/scripts/${editId}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(form),
			});
			if (!res.ok) {
				const d = await res.json();
				throw new Error(d.error || "Failed to update script");
			}
			return res.json();
		},
		onSuccess: () => {
			toast.success("Script updated");
			setIsEditOpen(false);
			setEditId(null);
			setForm(defaultForm);
			queryClient.invalidateQueries({
				queryKey: ["hotspotScripts", routerId],
			});
		},
		onError: (error: any) => toast.error(error.message),
	});

	const deleteMutation = useMutation({
		mutationFn: async (id: string) => {
			const res = await fetch(`/api/hotspot/scripts/${id}`, {
				method: "DELETE",
			});
			if (!res.ok) throw new Error("Failed to delete script");
			return res.json();
		},
		onSuccess: () => {
			toast.success("Script deleted");
			setDeleteConfirm(null);
			queryClient.invalidateQueries({
				queryKey: ["hotspotScripts", routerId],
			});
		},
		onError: (error: any) => toast.error(error.message),
	});

	const deployMutation = useMutation({
		mutationFn: async (scriptId: string) => {
			const res = await fetch(
				`/api/hotspot/scripts/deploy?scriptId=${scriptId}`,
				{ method: "POST" },
			);
			if (!res.ok) {
				const d = await res.json();
				throw new Error(d.error || "Failed to deploy script");
			}
			return res.json();
		},
		onSuccess: (data) => {
			toast.success(data.message);
			queryClient.invalidateQueries({
				queryKey: ["hotspotScripts", routerId],
			});
		},
		onError: (error: any) => toast.error(error.message),
	});

	const filtered = (scripts as HotspotScript[]).filter(
		(s) =>
			s.name.toLowerCase().includes(search.toLowerCase()) &&
			(!filterType || s.type === filterType),
	);

	if (!routerId) {
		return <div className="p-4 text-muted-foreground">Pilih router dulu.</div>;
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
								placeholder="Cari script..."
								className="pl-8"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
							/>
						</div>
						<Select value={filterType} onValueChange={(v) => setFilterType(v || "")}>
							<SelectTrigger className="w-32">
								<SelectValue placeholder="All types" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="">All</SelectItem>
								<SelectItem value="on-login">On-Login</SelectItem>
								<SelectItem value="on-logout">On-Logout</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => {
								setForm({ type: "on-login", name: "record-login", content: DEFAULT_ONLOGIN });
								setIsAddOpen(true);
							}}
						>
							<Code className="mr-1 h-4 w-4" />
							Default On-Login
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => {
								setForm({ type: "on-logout", name: "record-logout", content: DEFAULT_ONLOGOUT });
								setIsAddOpen(true);
							}}
						>
							<Code className="mr-1 h-4 w-4" />
							Default On-Logout
						</Button>
						<Button onClick={() => { setForm(defaultForm); setIsAddOpen(true); }}>
							<Plus className="mr-2 h-4 w-4" /> Tambah Script
						</Button>
					</div>
				</div>

				{/* Table */}
				<div className="rounded-md border overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Type</TableHead>
								<TableHead>Deployed</TableHead>
								<TableHead>Content Preview</TableHead>
								<TableHead>Updated</TableHead>
								<TableHead className="w-[120px]">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{isLoading ? (
								<TableRow>
									<TableCell colSpan={6} className="text-center py-8">
										Loading scripts...
									</TableCell>
								</TableRow>
							) : filtered.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={6}
										className="text-center py-8 text-muted-foreground"
									>
										No scripts found.
									</TableCell>
								</TableRow>
							) : (
								filtered.map((script) => (
									<TableRow key={script.id}>
										<TableCell className="font-medium font-mono text-sm">
											{script.name}
										</TableCell>
										<TableCell>
											<Badge
												variant={
													script.type === "on-login" ? "default" : "secondary"
												}
											>
												{script.type === "on-login" ? "On-Login" : "On-Logout"}
											</Badge>
										</TableCell>
										<TableCell>
											{script.deployed ? (
												<Badge
													variant="outline"
													className="border-green-500/30 text-green-500"
												>
													Deployed
												</Badge>
											) : (
												<Badge variant="secondary">Pending</Badge>
											)}
										</TableCell>
										<TableCell className="max-w-xs truncate text-xs text-muted-foreground font-mono">
											{script.content.slice(0, 80)}
											{script.content.length > 80 ? "..." : ""}
										</TableCell>
										<TableCell className="text-xs text-muted-foreground">
											{new Date(script.updatedAt).toLocaleDateString("id-ID")}
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-1">
												<Button
													variant="ghost"
													size="icon"
													onClick={() => {
														setEditId(script.id);
														setForm({
															type: script.type,
															name: script.name,
															content: script.content,
														});
														setIsEditOpen(true);
													}}
													title="Edit"
												>
													<Save className="h-4 w-4" />
												</Button>
												<Button
													variant="ghost"
													size="icon"
													onClick={() => deployMutation.mutate(script.id)}
													disabled={deployMutation.isPending}
													title="Deploy to RouterOS"
												>
													<Upload className="h-4 w-4" />
												</Button>
												<Button
													variant="ghost"
													size="icon"
													onClick={() => setDeleteConfirm(script.id)}
													title="Hapus"
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
			</div>

			{/* Add/Edit Dialog */}
			<Dialog
				open={isAddOpen || isEditOpen}
				onOpenChange={(v) => {
					if (!v) {
						setIsAddOpen(false);
						setIsEditOpen(false);
						setEditId(null);
						setForm(defaultForm);
					}
				}}
			>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>
							{isEditOpen ? "Edit Script" : "Tambah Script"}
						</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label>Type</Label>
								<Select
									value={form.type}
									onValueChange={(v) =>
										setForm({
											...form,
											type: (v as "on-login" | "on-logout") || "on-login",
										})
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="on-login">On-Login</SelectItem>
										<SelectItem value="on-logout">On-Logout</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label>Nama Script</Label>
								<Input
									value={form.name}
									onChange={(e) =>
										setForm({ ...form, name: e.target.value })
									}
									placeholder="record-login"
								/>
							</div>
						</div>
						<div className="space-y-2">
							<Label>
								Content (RouterOS Script)
								<span className="text-muted-foreground text-xs ml-2">
									— Gunakan syntax RouterOS v7
								</span>
							</Label>
							<textarea
								className="w-full h-64 font-mono text-sm p-3 rounded-md border bg-background resize-y focus:outline-none focus:ring-2 focus:ring-ring"
								value={form.content}
								onChange={(e) =>
									setForm({ ...form, content: e.target.value })
								}
								placeholder="# RouterOS script here"
								spellCheck={false}
							/>
						</div>
						<Button
							className="w-full"
							onClick={() =>
								(isEditOpen ? updateMutation : createMutation).mutate()
							}
							disabled={
								(createMutation.isPending || updateMutation.isPending) ||
								!form.name ||
								!form.content
							}
						>
							{createMutation.isPending || updateMutation.isPending
								? "Menyimpan..."
								: "Simpan Script"}
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			{/* Delete confirm */}
			{deleteConfirm && (
				<ConfirmModal
					open
					onClose={() => setDeleteConfirm(null)}
					onConfirm={() => deleteMutation.mutate(deleteConfirm)}
					title="Hapus Script"
					message="Yakin ingin menghapus script ini?"
					confirmLabel="Hapus"
					variant="destructive"
					isLoading={deleteMutation.isPending}
				/>
			)}
		</>
	);
}
