"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Edit, Router, Shield, UserCog, UserPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { authClient } from "@/lib/auth-client";

interface UserData {
	id: string;
	name: string;
	email: string;
	role: string;
	createdAt: string;
	_count: { assignedRouters: number };
}

interface RouterOption {
	id: string;
	name: string;
}

interface UserForm {
	name: string;
	email: string;
	password: string;
}

const emptyForm: UserForm = { name: "", email: "", password: "" };

export default function UsersManagePage() {
	const queryClient = useQueryClient();
	const router = useRouter();
	const { data: session } = authClient.useSession();

	const [roleChange, setRoleChange] = useState<{
		user: UserData;
		role: string;
	} | null>(null);

	const [assignDialog, setAssignDialog] = useState<UserData | null>(null);
	const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set());

	const [editDialog, setEditDialog] = useState<UserData | null>(null);
	const [editForm, setEditForm] = useState<UserForm>(emptyForm);

	const [addDialog, setAddDialog] = useState(false);
	const [addForm, setAddForm] = useState<UserForm>(emptyForm);

	useEffect(() => {
		fetch("/api/users")
			.then((res) => {
				if (res.status === 403) {
					router.push("/");
					toast.error("Akses ditolak");
				}
			})
			.catch(() => {});
	}, [router]);

	const { data: users = [], isLoading } = useQuery({
		queryKey: ["users"],
		queryFn: async () => {
			const res = await fetch("/api/users");
			if (!res.ok) {
				if (res.status === 403) router.push("/");
				throw new Error("Failed to fetch users");
			}
			return res.json();
		},
	});

	const { data: allRouters = [] } = useQuery({
		queryKey: ["routers"],
		queryFn: async () => {
			const res = await fetch("/api/routers");
			if (!res.ok) throw new Error("Failed to fetch routers");
			return res.json();
		},
	});

	const { data: assignedRouterData } = useQuery({
		queryKey: ["userRouters", assignDialog?.id],
		queryFn: async () => {
			if (!assignDialog) return [];
			const res = await fetch(`/api/users/${assignDialog.id}/routers`);
			if (!res.ok) throw new Error("Failed to fetch assignments");
			return res.json();
		},
		enabled: !!assignDialog,
	});

	useEffect(() => {
		if (assignedRouterData) {
			setAssignedIds(
				new Set((assignedRouterData as any[]).map((a: any) => a.routerId)),
			);
		}
	}, [assignedRouterData]);

	const roleMutation = useMutation({
		mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
			const res = await fetch(`/api/users/${userId}/role`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ role }),
			});
			if (!res.ok) {
				const d = await res.json();
				throw new Error(d.error || "Failed to change role");
			}
			return res.json();
		},
		onSuccess: () => {
			toast.success("Role berhasil diubah");
			queryClient.invalidateQueries({ queryKey: ["users"] });
			setRoleChange(null);
		},
		onError: (error: any) => {
			toast.error(error.message || "Gagal ubah role");
			setRoleChange(null);
		},
	});

	const editMutation = useMutation({
		mutationFn: async ({ userId, data }: { userId: string; data: UserForm }) => {
			const res = await fetch(`/api/users/${userId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: data.name,
					email: data.email,
					password: data.password || undefined,
				}),
			});
			if (!res.ok) {
				const d = await res.json();
				throw new Error(d.error || "Failed to update user");
			}
			return res.json();
		},
		onSuccess: () => {
			toast.success("User berhasil diupdate");
			queryClient.invalidateQueries({ queryKey: ["users"] });
			setEditDialog(null);
			setEditForm(emptyForm);
		},
		onError: (error: any) => {
			toast.error(error.message || "Gagal update user");
		},
	});

	const addMutation = useMutation({
		mutationFn: async (data: UserForm) => {
			const res = await fetch("/api/users", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});
			if (!res.ok) {
				const d = await res.json();
				throw new Error(d.error || "Failed to create user");
			}
			return res.json();
		},
		onSuccess: () => {
			toast.success("User berhasil ditambah");
			queryClient.invalidateQueries({ queryKey: ["users"] });
			setAddDialog(false);
			setAddForm(emptyForm);
		},
		onError: (error: any) => {
			toast.error(error.message || "Gagal tambah user");
		},
	});

	const assignMutation = useMutation({
		mutationFn: async ({
			userId,
			routerId,
			assign,
		}: { userId: string; routerId: string; assign: boolean }) => {
			if (assign) {
				const res = await fetch(`/api/users/${userId}/routers`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ routerId }),
				});
				if (!res.ok && res.status !== 409) {
					const d = await res.json();
					throw new Error(d.error || "Failed to assign");
				}
			} else {
				const res = await fetch(`/api/users/${userId}/routers/${routerId}`, {
					method: "DELETE",
				});
				if (!res.ok) {
					const d = await res.json();
					throw new Error(d.error || "Failed to unassign");
				}
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["userRouters", assignDialog?.id] });
			queryClient.invalidateQueries({ queryKey: ["users"] });
		},
		onError: (error: any) => {
			toast.error(error.message || "Gagal");
		},
	});

	const openEdit = (user: UserData) => {
		setEditForm({ name: user.name, email: user.email, password: "" });
		setEditDialog(user);
	};

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-start">
				<div>
					<h2 className="text-2xl font-bold tracking-tight">Manage Users</h2>
					<p className="text-muted-foreground">Kelola user, role, dan akses router</p>
				</div>
				<Button onClick={() => setAddDialog(true)}>
					<UserPlus className="mr-2 h-4 w-4" /> Tambah User
				</Button>
			</div>

			<div className="rounded-md border overflow-x-auto">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Nama</TableHead>
							<TableHead>Email</TableHead>
							<TableHead>Role</TableHead>
							<TableHead>Router Assigned</TableHead>
							<TableHead className="w-[160px]">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							<TableRow>
								<TableCell colSpan={5} className="text-center py-8">
									Loading users...
								</TableCell>
							</TableRow>
						) : users.length === 0 ? (
							<TableRow>
								<TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
									Tidak ada user.
								</TableCell>
							</TableRow>
						) : (
							(users as UserData[]).map((user) => (
								<TableRow key={user.id}>
									<TableCell className="font-medium">{user.name}</TableCell>
									<TableCell className="text-muted-foreground">{user.email}</TableCell>
									<TableCell>
										<Badge variant={user.role === "admin" ? "default" : "secondary"}>
											{user.role === "admin" ? (
												<Shield className="mr-1 h-3 w-3" />
											) : (
												<UserCog className="mr-1 h-3 w-3" />
											)}
											{user.role}
										</Badge>
									</TableCell>
									<TableCell>{user._count.assignedRouters} router</TableCell>
									<TableCell>
										<div className="flex items-center gap-1">
											<Select
												value={user.role}
												onValueChange={(v) =>
													setRoleChange({ user, role: v ?? "user" })
												}
											>
												<SelectTrigger className="h-8 w-24 text-xs">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="admin">admin</SelectItem>
													<SelectItem value="user">user</SelectItem>
												</SelectContent>
											</Select>
											<Button variant="outline" size="icon" onClick={() => openEdit(user)} title="Edit">
												<Edit className="h-4 w-4" />
											</Button>
											<Button variant="outline" size="icon" onClick={() => setAssignDialog(user)} title="Router">
												<Router className="h-4 w-4" />
											</Button>
										</div>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

			{/* Role change confirm */}
			{roleChange && (
				<ConfirmModal
					open
					onClose={() => setRoleChange(null)}
					onConfirm={() =>
						roleMutation.mutate({ userId: roleChange.user.id, role: roleChange.role })
					}
					title="Ubah Role"
					message={`Yakin ingin mengubah role ${roleChange.user.name} menjadi ${roleChange.role}?`}
					confirmLabel="Ya, ubah"
					variant="default"
					isLoading={roleMutation.isPending}
				/>
			)}

			{/* Add user dialog */}
			<Dialog open={addDialog} onOpenChange={(open) => { if (!open) setAddDialog(false); }}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Tambah User Baru</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label>Nama</Label>
							<Input
								value={addForm.name}
								onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
								placeholder="Nama user"
							/>
						</div>
						<div className="space-y-2">
							<Label>Email</Label>
							<Input
								value={addForm.email}
								onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
								placeholder="user@example.com"
								type="email"
							/>
						</div>
						<div className="space-y-2">
							<Label>Password</Label>
							<Input
								value={addForm.password}
								onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
								type="password"
								placeholder="Password"
							/>
						</div>
						<Button
							className="w-full"
							onClick={() => addMutation.mutate(addForm)}
							disabled={addMutation.isPending || !addForm.name || !addForm.email || !addForm.password}
						>
							{addMutation.isPending ? "Menambah..." : "Tambah User"}
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			{/* Edit user dialog */}
			{editDialog && (
				<Dialog open={!!editDialog} onOpenChange={(open) => { if (!open) { setEditDialog(null); setEditForm(emptyForm); } }}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Edit User — {editDialog.name}</DialogTitle>
						</DialogHeader>
						<div className="space-y-4 py-4">
							<div className="space-y-2">
								<Label>Nama</Label>
								<Input
									value={editForm.name}
									onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
								/>
							</div>
							<div className="space-y-2">
								<Label>Email</Label>
								<Input
									value={editForm.email}
									onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
									type="email"
								/>
							</div>
							<div className="space-y-2">
								<Label>Password (biarkan kosong jika tidak ingin diganti)</Label>
								<Input
									value={editForm.password}
									onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
									type="password"
									placeholder="Kosongkan jika tidak diganti"
								/>
							</div>
							<Button
								className="w-full"
								onClick={() => editMutation.mutate({ userId: editDialog.id, data: editForm })}
								disabled={editMutation.isPending}
							>
								{editMutation.isPending ? "Menyimpan..." : "Simpan"}
							</Button>
						</div>
					</DialogContent>
				</Dialog>
			)}

			{/* Assign router dialog */}
			{assignDialog && (
				<Dialog open={!!assignDialog} onOpenChange={(open) => { if (!open) setAssignDialog(null); }}>
					<DialogContent className="max-w-md">
						<DialogHeader>
							<DialogTitle>Assign Router — {assignDialog.name}</DialogTitle>
						</DialogHeader>
						<div className="space-y-3 py-4">
							{(allRouters as RouterOption[]).length === 0 ? (
								<p className="text-sm text-muted-foreground">Tidak ada router.</p>
							) : (
								(allRouters as RouterOption[]).map((r) => {
									const isAssigned = assignedIds.has(r.id);
									return (
										<div key={r.id} className="flex items-center justify-between py-2 border-b last:border-0">
											<span className="text-sm">{r.name}</span>
											<Button
												variant={isAssigned ? "destructive" : "outline"}
												size="sm"
												onClick={() => {
													assignMutation.mutate({ userId: assignDialog.id, routerId: r.id, assign: !isAssigned });
													setAssignedIds((prev) => {
														const next = new Set(prev);
														if (isAssigned) next.delete(r.id);
														else next.add(r.id);
														return next;
													});
												}}
												disabled={assignMutation.isPending}
											>
												{isAssigned ? <><X className="mr-1 h-3 w-3" /> Hapus</> : <><Check className="mr-1 h-3 w-3" /> Tambah</>}
											</Button>
										</div>
									);
								})
							)}
						</div>
					</DialogContent>
				</Dialog>
			)}
		</div>
	);
}
