"use client";

import { formatDistanceToNow } from "date-fns";
import {
	AlertTriangle,
	Edit,
	ExternalLink,
	Eye,
	EyeOff,
	Loader2,
	PlugZap,
	Plus,
	Trash2,
	Wifi,
	WifiOff,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

interface RouterData {
	id: string;
	name: string;
	ipAddress: string;
	port: number;
	useSSL: boolean;
	username: string;
	isActive: boolean;
	lastPollAt: string | null;
	status: string;
	errorMessage: string | null;
	createdAt: string;
	_count: { queues: number };
}

interface RouterFormData {
	name: string;
	ipAddress: string;
	port: number;
	useSSL: boolean;
	username: string;
	password: string;
}

const emptyForm: RouterFormData = {
	name: "",
	ipAddress: "",
	port: 443,
	useSSL: true,
	username: "admin",
	password: "",
};

export default function RoutersPage() {
	const [routers, setRouters] = useState<RouterData[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [deleteDialog, setDeleteDialog] = useState<string | null>(null);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [form, setForm] = useState<RouterFormData>(emptyForm);
	const [isSaving, setIsSaving] = useState(false);
	const [isTesting, setIsTesting] = useState<string | null>(null);
	const [showPassword, setShowPassword] = useState(false);

	const fetchRouters = useCallback(async () => {
		try {
			const res = await fetch("/api/routers");
			if (res.ok) {
				setRouters(await res.json());
			}
		} catch (error) {
			console.error("Failed to fetch routers:", error);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchRouters();
	}, [fetchRouters]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSaving(true);

		try {
			const url = editingId ? `/api/routers/${editingId}` : "/api/routers";
			const method = editingId ? "PUT" : "POST";

			const body =
				editingId && !form.password ? { ...form, password: undefined } : form;

			const res = await fetch(url, {
				method,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});

			if (!res.ok) {
				const error = await res.json();
				toast.error(error.error || "Failed to save router");
				return;
			}

			toast.success(editingId ? "Router updated" : "Router added");
			setDialogOpen(false);
			setForm(emptyForm);
			setEditingId(null);
			fetchRouters();
		} catch {
			toast.error("An error occurred");
		} finally {
			setIsSaving(false);
		}
	};

	const handleDelete = async (id: string) => {
		try {
			const res = await fetch(`/api/routers/${id}`, { method: "DELETE" });
			if (res.ok) {
				toast.success("Router deleted");
				fetchRouters();
			} else {
				toast.error("Failed to delete router");
			}
		} catch {
			toast.error("An error occurred");
		}
		setDeleteDialog(null);
	};

	const handleTestConnection = async (id: string) => {
		setIsTesting(id);
		try {
			let res: Response;
			if (id === "form") {
				// Test from form (new router)
				res = await fetch("/api/routers/new/test", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(form),
				});
			} else {
				res = await fetch(`/api/routers/${id}/test`, { method: "POST" });
			}

			const result = await res.json();
			if (result.success) {
				toast.success(result.message);
				if (id !== "form") fetchRouters();
			} else {
				toast.error(result.message);
			}
		} catch {
			toast.error("Test failed");
		} finally {
			setIsTesting(null);
		}
	};

	const openEditDialog = (router: RouterData) => {
		setEditingId(router.id);
		setForm({
			name: router.name,
			ipAddress: router.ipAddress,
			port: router.port,
			useSSL: router.useSSL,
			username: router.username,
			password: "",
		});
		setDialogOpen(true);
	};

	const openAddDialog = () => {
		setEditingId(null);
		setForm(emptyForm);
		setDialogOpen(true);
	};

	const getStatusBadge = (status: string) => {
		switch (status) {
			case "online":
				return (
					<Badge
						variant="outline"
						className="border-green-500/30 text-green-400 gap-1"
					>
						<Wifi className="h-3 w-3" />
						Online
					</Badge>
				);
			case "offline":
				return (
					<Badge
						variant="outline"
						className="border-red-500/30 text-red-400 gap-1"
					>
						<WifiOff className="h-3 w-3" />
						Offline
					</Badge>
				);
			case "error":
				return (
					<Badge
						variant="outline"
						className="border-yellow-500/30 text-yellow-400 gap-1"
					>
						<AlertTriangle className="h-3 w-3" />
						Error
					</Badge>
				);
			default:
				return (
					<Badge variant="outline" className="gap-1 text-muted-foreground">
						Unknown
					</Badge>
				);
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold tracking-tight">
						Router Management
					</h2>
					<p className="text-muted-foreground">Manage your MikroTik routers</p>
				</div>
				<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
					<DialogTrigger>
						<Button onClick={openAddDialog}>
							<Plus className="mr-2 h-4 w-4" />
							Add Router
						</Button>
					</DialogTrigger>
					<DialogContent className="sm:max-w-[500px]">
						<form onSubmit={handleSubmit}>
							<DialogHeader>
								<DialogTitle>
									{editingId ? "Edit Router" : "Add New Router"}
								</DialogTitle>
								<DialogDescription>
									{editingId
										? "Update router configuration. Leave password empty to keep current."
										: "Enter the MikroTik router details. Make sure REST API is enabled."}
								</DialogDescription>
							</DialogHeader>
							<div className="grid gap-4 py-4">
								<div className="grid gap-2">
									<Label htmlFor="r-name">Router Name</Label>
									<Input
										id="r-name"
										placeholder="Main Router"
										value={form.name}
										onChange={(e) => setForm({ ...form, name: e.target.value })}
										required
									/>
								</div>
								<div className="grid grid-cols-3 gap-3">
									<div className="col-span-2 grid gap-2">
										<Label htmlFor="r-ip">IP Address</Label>
										<Input
											id="r-ip"
											placeholder="192.168.88.1"
											value={form.ipAddress}
											onChange={(e) =>
												setForm({ ...form, ipAddress: e.target.value })
											}
											required
										/>
									</div>
									<div className="grid gap-2">
										<Label htmlFor="r-port">Port</Label>
										<Input
											id="r-port"
											type="number"
											value={form.port}
											onChange={(e) =>
												setForm({
													...form,
													port: Number(e.target.value) || 443,
												})
											}
											required
										/>
									</div>
								</div>
								<div className="flex items-center justify-between rounded-lg border p-3">
									<div className="space-y-0.5">
										<Label>Use HTTPS</Label>
										<p className="text-xs text-muted-foreground">
											{form.useSSL
												? "HTTPS with self-signed cert (recommended)"
												: "HTTP (not recommended for production)"}
										</p>
									</div>
									<Switch
										checked={form.useSSL}
										onCheckedChange={(checked) =>
											setForm({
												...form,
												useSSL: checked,
												port: checked ? 443 : 80,
											})
										}
									/>
								</div>
								<div className="grid gap-2">
									<Label htmlFor="r-user">Username</Label>
									<Input
										id="r-user"
										placeholder="admin"
										value={form.username}
										onChange={(e) =>
											setForm({ ...form, username: e.target.value })
										}
										required
									/>
								</div>
								<div className="grid gap-2">
									<Label htmlFor="r-pass">
										Password{editingId && " (leave empty to keep current)"}
									</Label>
									<div className="relative">
										<Input
											id="r-pass"
											type={showPassword ? "text" : "password"}
											placeholder={editingId ? "••••••••" : "Enter password"}
											value={form.password}
											onChange={(e) =>
												setForm({ ...form, password: e.target.value })
											}
											required={!editingId}
											className="pr-10"
										/>
										<button
											type="button"
											onClick={() => setShowPassword(!showPassword)}
											className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
										>
											{showPassword ? (
												<EyeOff className="h-4 w-4" />
											) : (
												<Eye className="h-4 w-4" />
											)}
										</button>
									</div>
								</div>
							</div>
							<DialogFooter className="gap-2 sm:gap-0">
								<Button
									type="button"
									variant="outline"
									onClick={() => handleTestConnection("form")}
									disabled={
										isTesting === "form" ||
										!form.ipAddress ||
										!form.username ||
										(!form.password && !editingId)
									}
								>
									{isTesting === "form" ? (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									) : (
										<PlugZap className="mr-2 h-4 w-4" />
									)}
									Test
								</Button>
								<Button type="submit" disabled={isSaving}>
									{isSaving ? (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									) : null}
									{editingId ? "Update" : "Add Router"}
								</Button>
							</DialogFooter>
						</form>
					</DialogContent>
				</Dialog>
			</div>

			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-base">Registered Routers</CardTitle>
					<CardDescription>
						{routers.length} router{routers.length !== 1 ? "s" : ""} registered
					</CardDescription>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<div className="space-y-3">
							{Array.from({ length: 3 }).map((_, i) => (
								<Skeleton key={i} className="h-14 w-full" />
							))}
						</div>
					) : routers.length === 0 ? (
						<div className="flex h-32 items-center justify-center text-muted-foreground">
							No routers added yet. Click &quot;Add Router&quot; to get started.
						</div>
					) : (
						<div className="overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Name</TableHead>
										<TableHead>IP Address</TableHead>
										<TableHead className="text-center">Status</TableHead>
										<TableHead className="text-center">Queues</TableHead>
										<TableHead>Last Poll</TableHead>
										<TableHead className="text-right">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{routers.map((router) => (
										<TableRow key={router.id} className="group">
											<TableCell>
												<Link
													href={`/routers/${router.id}`}
													className="font-medium hover:text-primary inline-flex items-center gap-1 transition-colors"
												>
													{router.name}
													<ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
												</Link>
												{!router.isActive && (
													<Badge variant="secondary" className="ml-2 text-xs">
														Disabled
													</Badge>
												)}
											</TableCell>
											<TableCell className="font-mono text-sm">
												{router.ipAddress}:{router.port}
												{router.useSSL && (
													<span className="ml-1 text-xs text-muted-foreground">
														(SSL)
													</span>
												)}
											</TableCell>
											<TableCell className="text-center">
												{getStatusBadge(router.status)}
											</TableCell>
											<TableCell className="text-center">
												<Badge variant="secondary">
													{router._count.queues}
												</Badge>
											</TableCell>
											<TableCell className="text-sm text-muted-foreground">
												{router.lastPollAt
													? formatDistanceToNow(new Date(router.lastPollAt), {
															addSuffix: true,
														})
													: "Never"}
											</TableCell>
											<TableCell className="text-right">
												<div className="flex items-center justify-end gap-1">
													<Button
														variant="ghost"
														size="icon"
														onClick={() => handleTestConnection(router.id)}
														disabled={isTesting === router.id}
														title="Test Connection"
													>
														{isTesting === router.id ? (
															<Loader2 className="h-4 w-4 animate-spin" />
														) : (
															<PlugZap className="h-4 w-4" />
														)}
													</Button>
													<Button
														variant="ghost"
														size="icon"
														onClick={() => openEditDialog(router)}
														title="Edit"
													>
														<Edit className="h-4 w-4" />
													</Button>
													<Button
														variant="ghost"
														size="icon"
														onClick={() => setDeleteDialog(router.id)}
														className="text-destructive hover:text-destructive"
														title="Delete"
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</div>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Delete confirmation dialog */}
			<AlertDialog
				open={!!deleteDialog}
				onOpenChange={() => setDeleteDialog(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Router?</AlertDialogTitle>
						<AlertDialogDescription>
							This will permanently delete this router and all its queue data
							and history. This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							onClick={() => deleteDialog && handleDelete(deleteDialog)}
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
