"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Edit, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

// ---------- types ----------

interface LocalProfile {
	id: string;
	name: string;
	routerId: string;
	sharedUsers: number;
	rateLimit: string | null;
	addressPool: string | null;
	macCookie: boolean;
	server: string;
	expiredMode: string;
	price: number;
	sellPrice: number;
	lockUser: boolean;
	validity: string;
	onLoginScript: string | null;
	onLogoutScript: string | null;
}

interface RouterOSProfile {
	".id": string;
	name: string;
	"shared-users"?: string;
	"rate-limit"?: string;
	"address-pool"?: string;
	"mac-cookie-timeout"?: string;
	server?: string;
}

const EXPIRED_MODE_LABELS: Record<string, string> = {
	remove: "Remove",
	notice: "Notice",
	remove_record: "Remove & Record",
	notice_record: "Notice & Record",
};

const EXPIRED_MODE_VARIANTS: Record<
	string,
	"destructive" | "secondary" | "outline" | "default"
> = {
	remove: "destructive",
	notice: "secondary",
	remove_record: "default",
	notice_record: "outline",
};

// ---------- default form state ----------

const defaultForm = {
	name: "",
	sharedUsers: 1,
	rateLimit: "",
	addressPool: "",
	macCookie: false,
	server: "all",
	expiredMode: "remove",
	price: 0,
	sellPrice: 0,
	lockUser: false,
	validity: "",
	onLoginScript: "",
	onLogoutScript: "",
};

// ---------- component ----------

export default function HotspotProfilesPage() {
	const queryClient = useQueryClient();
	const [routerId, setRouterId] = useState<string>("");
	const [search, setSearch] = useState("");

	// Dialogs
	const [isAddOpen, setIsAddOpen] = useState(false);
	const [isEditOpen, setIsEditOpen] = useState(false);
	const [editId, setEditId] = useState<string | null>(null);
	const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

	// Form state (shared between add & edit)
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

	// ---------- queries ----------

	const { data: routerosProfiles = [], isLoading: rosLoading } = useQuery({
		queryKey: ["hotspotProfiles", routerId],
		queryFn: async () => {
			const res = await fetch(`/api/hotspot/profiles?routerId=${routerId}`);
			if (!res.ok) throw new Error("Failed to fetch RouterOS profiles");
			return res.json() as Promise<RouterOSProfile[]>;
		},
		enabled: !!routerId,
	});

	const { data: localProfiles = [], isLoading: localLoading } = useQuery({
		queryKey: ["hotspotProfilesLocal", routerId],
		queryFn: async () => {
			const res = await fetch(
				`/api/hotspot/profiles/local?routerId=${routerId}`,
			);
			if (!res.ok) throw new Error("Failed to fetch local profiles");
			return res.json() as Promise<LocalProfile[]>;
		},
		enabled: !!routerId,
	});

	// ---------- mutations ----------

	const syncMutation = useMutation({
		mutationFn: async () => {
			const res = await fetch(
				`/api/hotspot/profiles/sync?routerId=${routerId}`,
				{ method: "POST" },
			);
			if (!res.ok) {
				const d = await res.json();
				throw new Error(d.error || "Sync failed");
			}
			return res.json();
		},
		onSuccess: (data) => {
			toast.success(data.message);
			queryClient.invalidateQueries({
				queryKey: ["hotspotProfilesLocal", routerId],
			});
		},
		onError: (error: any) => toast.error(error.message),
	});

	const createMutation = useMutation({
		mutationFn: async () => {
			const res = await fetch("/api/hotspot/profiles/local", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ ...form, routerId }),
			});
			if (!res.ok) {
				const d = await res.json();
				throw new Error(d.error || "Failed to create profile");
			}
			return res.json();
		},
		onSuccess: () => {
			toast.success("Profile created");
			setIsAddOpen(false);
			setForm(defaultForm);
			queryClient.invalidateQueries({
				queryKey: ["hotspotProfilesLocal", routerId],
			});
		},
		onError: (error: any) => toast.error(error.message),
	});

	const updateMutation = useMutation({
		mutationFn: async () => {
			const res = await fetch(`/api/hotspot/profiles/local/${editId}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(form),
			});
			if (!res.ok) {
				const d = await res.json();
				throw new Error(d.error || "Failed to update profile");
			}
			return res.json();
		},
		onSuccess: () => {
			toast.success("Profile updated");
			setIsEditOpen(false);
			setEditId(null);
			setForm(defaultForm);
			queryClient.invalidateQueries({
				queryKey: ["hotspotProfilesLocal", routerId],
			});
		},
		onError: (error: any) => toast.error(error.message),
	});

	const deleteMutation = useMutation({
		mutationFn: async (id: string) => {
			const res = await fetch(`/api/hotspot/profiles/local/${id}`, {
				method: "DELETE",
			});
			if (!res.ok) throw new Error("Failed to delete");
			return res.json();
		},
		onSuccess: () => {
			toast.success("Profile deleted");
			setDeleteConfirm(null);
			queryClient.invalidateQueries({
				queryKey: ["hotspotProfilesLocal", routerId],
			});
		},
		onError: (error: any) => toast.error(error.message),
	});

	// ---------- helpers ----------

	function openEdit(profile: LocalProfile) {
		setEditId(profile.id);
		setForm({
			name: profile.name,
			sharedUsers: profile.sharedUsers,
			rateLimit: profile.rateLimit || "",
			addressPool: profile.addressPool || "",
			macCookie: profile.macCookie,
			server: profile.server,
			expiredMode: profile.expiredMode,
			price: profile.price,
			sellPrice: profile.sellPrice,
			lockUser: profile.lockUser,
			validity: profile.validity,
			onLoginScript: profile.onLoginScript || "",
			onLogoutScript: profile.onLogoutScript || "",
		});
		setIsEditOpen(true);
	}

	// Merge RouterOS data with local metadata
	function mergeProfiles(): Array<{
		ros: RouterOSProfile | null;
		local: LocalProfile | null;
	}> {
		const allNames = new Set<string>();
		for (const p of routerosProfiles) allNames.add(p.name);
		for (const p of localProfiles) allNames.add(p.name);

		return Array.from(allNames)
			.sort()
			.filter((n) => !search || n.toLowerCase().includes(search.toLowerCase()))
			.map((name) => ({
				ros: routerosProfiles.find((p) => p.name === name) || null,
				local: localProfiles.find((p) => p.name === name) || null,
			}));
	}

	const merged = mergeProfiles();
	const isLoading = rosLoading || localLoading;

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
							placeholder="Cari profile..."
							className="pl-8"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
					</div>

					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => syncMutation.mutate()}
							disabled={syncMutation.isPending}
						>
							<RefreshCw
								className={`mr-1 h-4 w-4 ${syncMutation.isPending ? "animate-spin" : ""}`}
							/>
							Sync
						</Button>
						<Button
							onClick={() => {
								setForm(defaultForm);
								setIsAddOpen(true);
							}}
						>
							<Plus className="mr-2 h-4 w-4" /> Tambah Profile
						</Button>
					</div>
				</div>

				{/* Table */}
				<div className="rounded-md border overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Shared</TableHead>
								<TableHead>Rate Limit</TableHead>
								<TableHead>Expired Mode</TableHead>
								<TableHead>Price</TableHead>
								<TableHead>Sell Price</TableHead>
								<TableHead>Lock</TableHead>
								<TableHead>Validity</TableHead>
								<TableHead className="w-[100px]">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{isLoading ? (
								<TableRow>
									<TableCell colSpan={9} className="text-center py-8">
										Loading profiles...
									</TableCell>
								</TableRow>
							) : merged.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={9}
										className="text-center py-8 text-muted-foreground"
									>
										No profiles found. Sync from RouterOS or create one.
									</TableCell>
								</TableRow>
							) : (
								merged.map(({ ros, local }) => (
									<TableRow key={local?.id || ros?.[".id"]}>
										<TableCell className="font-medium">
											<div className="flex items-center gap-2">
												{local ? (
													ros ? null : (
														<Badge
															variant="outline"
															className="text-[10px] px-1"
														>
															new
														</Badge>
													)
												) : (
													<Badge
														variant="secondary"
														className="text-[10px] px-1"
													>
														need sync
													</Badge>
												)}
												{local?.name || ros?.name}
											</div>
										</TableCell>
										<TableCell>
											{local?.sharedUsers || ros?.["shared-users"] || "1"}
										</TableCell>
										<TableCell className="font-mono text-xs">
											{local?.rateLimit || ros?.["rate-limit"] || "Unlimited"}
										</TableCell>
										<TableCell>
											<Badge
												variant={
													local
														? EXPIRED_MODE_VARIANTS[local.expiredMode] ||
															"outline"
														: "secondary"
												}
											>
												{local
													? EXPIRED_MODE_LABELS[local.expiredMode] ||
														local.expiredMode
													: "-"}
											</Badge>
										</TableCell>
										<TableCell className="text-right">
											{local ? (
												local.price > 0 ? (
													`Rp ${local.price.toLocaleString("id-ID")}`
												) : (
													<span className="text-muted-foreground">-</span>
												)
											) : (
												<span className="text-muted-foreground">-</span>
											)}
										</TableCell>
										<TableCell className="text-right">
											{local ? (
												local.sellPrice > 0 ? (
													`Rp ${local.sellPrice.toLocaleString("id-ID")}`
												) : (
													<span className="text-muted-foreground">-</span>
												)
											) : (
												<span className="text-muted-foreground">-</span>
											)}
										</TableCell>
										<TableCell>
											{local ? (
												local.lockUser ? (
													<Badge
														variant="outline"
														className="border-amber-500/30 text-amber-500"
													>
														Locked
													</Badge>
												) : (
													<Badge variant="secondary">No</Badge>
												)
											) : (
												<span className="text-muted-foreground">-</span>
											)}
										</TableCell>
										<TableCell className="text-sm">
											{local?.validity || (
												<span className="text-muted-foreground">-</span>
											)}
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-1">
												{local ? (
													<>
														<Button
															variant="ghost"
															size="icon"
															onClick={() => openEdit(local)}
															title="Edit"
														>
															<Edit className="h-4 w-4" />
														</Button>
														<Button
															variant="ghost"
															size="icon"
															onClick={() => setDeleteConfirm(local.id)}
															title="Hapus"
														>
															<Trash2 className="h-4 w-4 text-destructive" />
														</Button>
													</>
												) : (
													<Button
														variant="ghost"
														size="icon"
														onClick={() => {
															setForm({ ...defaultForm, name: ros!.name });
															setIsAddOpen(true);
														}}
														title="Add local metadata"
													>
														<Copy className="h-4 w-4" />
													</Button>
												)}
											</div>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</div>
			</div>

			{/* Add Dialog */}
			<Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
				<DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto min-w-sm md:min-w-lg">
					<DialogHeader>
						<DialogTitle>Tambah Profile Metadata</DialogTitle>
					</DialogHeader>
					<ProfileForm form={form} setForm={setForm} routerId={routerId} />
					<Button
						className="w-full"
						onClick={() => createMutation.mutate()}
						disabled={createMutation.isPending}
					>
						{createMutation.isPending ? "Menyimpan..." : "Simpan Profile"}
					</Button>
				</DialogContent>
			</Dialog>

			{/* Edit Dialog */}
			<Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
				<DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Edit Profile: {form.name}</DialogTitle>
					</DialogHeader>
					<ProfileForm form={form} setForm={setForm} routerId={routerId} />
					<Button
						className="w-full"
						onClick={() => updateMutation.mutate()}
						disabled={updateMutation.isPending}
					>
						{updateMutation.isPending ? "Menyimpan..." : "Update Profile"}
					</Button>
				</DialogContent>
			</Dialog>

			{/* Delete confirm */}
			{deleteConfirm && (
				<ConfirmModal
					open
					onClose={() => setDeleteConfirm(null)}
					onConfirm={() => deleteMutation.mutate(deleteConfirm)}
					title="Hapus Profile"
					message="Yakin ingin menghapus metadata profile ini? Data RouterOS tidak akan terhapus."
					confirmLabel="Hapus"
					variant="destructive"
					isLoading={deleteMutation.isPending}
				/>
			)}
		</>
	);
}

// ---------- Profile Form Component ----------

function ProfileForm({
	form,
	setForm,
	routerId,
}: {
	form: typeof defaultForm;
	setForm: (f: typeof defaultForm) => void;
	routerId: string;
}) {
	const { data: scripts = [] } = useQuery({
		queryKey: ["hotspotScripts", routerId],
		queryFn: async () => {
			const res = await fetch(`/api/hotspot/scripts?routerId=${routerId}`);
			if (!res.ok) return [];
			return res.json();
		},
		enabled: !!routerId,
	});

	const loginScripts = (scripts as any[]).filter(
		(s: any) => s.type === "on-login",
	);
	const logoutScripts = (scripts as any[]).filter(
		(s: any) => s.type === "on-logout",
	);

	const update = (key: string, value: any) =>
		setForm({ ...form, [key]: value });

	return (
		<div className="space-y-4 py-4">
			{/* Basic */}
			<div className="space-y-2">
				<Label>Nama Profile *</Label>
				<Input
					value={form.name}
					onChange={(e) => update("name", e.target.value)}
					placeholder="nama profile di RouterOS"
				/>
			</div>

			<div className="grid grid-cols-2 gap-4">
				<div className="space-y-2">
					<Label>Shared Users</Label>
					<Input
						type="number"
						min={1}
						value={form.sharedUsers}
						onChange={(e) => update("sharedUsers", Number(e.target.value))}
					/>
				</div>
				<div className="space-y-2">
					<Label>Server</Label>
					<Select
						value={form.server}
						onValueChange={(v) => update("server", v || "all")}
					>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">all</SelectItem>
							<SelectItem value="hs-srv1">hs-srv1</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			<div className="space-y-2">
				<Label>Rate Limit (rx/tx)</Label>
				<Input
					value={form.rateLimit}
					onChange={(e) => update("rateLimit", e.target.value)}
					placeholder="Contoh: 1M/2M"
				/>
			</div>

			<div className="grid grid-cols-2 gap-4">
				<div className="space-y-2">
					<Label>Address Pool</Label>
					<Input
						value={form.addressPool}
						onChange={(e) => update("addressPool", e.target.value)}
						placeholder="dhcp_pool1"
					/>
				</div>
				<div className="space-y-2 flex items-end pb-2">
					<div className="flex items-center gap-2">
						<Switch
							checked={form.macCookie}
							onCheckedChange={(v) => update("macCookie", v)}
						/>
						<Label className="cursor-pointer">MAC Cookie</Label>
					</div>
				</div>
			</div>

			{/* Settings fields */}
			<div className="border-t pt-4">
				<h4 className="text-sm font-medium mb-3 text-muted-foreground">
					Settings
				</h4>

				<div className="space-y-2">
					<Label>Expired Mode</Label>
					<Select
						value={form.expiredMode}
						onValueChange={(v) => update("expiredMode", v || "remove")}
					>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="remove">Remove</SelectItem>
							<SelectItem value="notice">Notice</SelectItem>
							<SelectItem value="remove_record">Remove & Record</SelectItem>
							<SelectItem value="notice_record">Notice & Record</SelectItem>
						</SelectContent>
					</Select>
					<p className="text-xs text-muted-foreground">
						Control for hotspot user when expires. Remove: user deleted. Notice:
						notification only. Record: save price.
					</p>
				</div>

				<div className="grid grid-cols-2 gap-4 mt-3">
					<div className="space-y-2">
						<Label>Harga (Modal)</Label>
						<Input
							type="number"
							min={0}
							value={form.price}
							onChange={(e) => update("price", Number(e.target.value))}
						/>
					</div>
					<div className="space-y-2">
						<Label>Harga Jual</Label>
						<Input
							type="number"
							min={0}
							value={form.sellPrice}
							onChange={(e) => update("sellPrice", Number(e.target.value))}
						/>
					</div>
				</div>

				<div className="flex items-center gap-2 mt-3">
					<Switch
						checked={form.lockUser}
						onCheckedChange={(v) => update("lockUser", v)}
					/>
					<Label className="cursor-pointer">
						Lock User — username hanya bisa dipakai 1 device
					</Label>
				</div>

				<div className="space-y-2 mt-3">
					<Label>Validity</Label>
					<Input
						value={form.validity}
						onChange={(e) => update("validity", e.target.value)}
						placeholder="30d, 12h, 5h30m, 1d12h"
					/>
					<p className="text-xs text-muted-foreground">
						Format: [wdhm] — 30d = 30days, 12h = 12hours, 5h30m = 5hours
						30minutes
					</p>
				</div>

				<div className="space-y-2 mt-3">
					<Label>On-Login Script</Label>
					<Select
						value={form.onLoginScript}
						onValueChange={(v) => update("onLoginScript", v || "")}
					>
						<SelectTrigger>
							<SelectValue placeholder="None" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="">None</SelectItem>
							{loginScripts.map((s: any) => (
								<SelectItem key={s.id} value={s.name}>
									{s.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-2 mt-3">
					<Label>On-Logout Script</Label>
					<Select
						value={form.onLogoutScript}
						onValueChange={(v) => update("onLogoutScript", v || "")}
					>
						<SelectTrigger>
							<SelectValue placeholder="None" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="">None</SelectItem>
							{logoutScripts.map((s: any) => (
								<SelectItem key={s.id} value={s.name}>
									{s.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>
		</div>
	);
}
