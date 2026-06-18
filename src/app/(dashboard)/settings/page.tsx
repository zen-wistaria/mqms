"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
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
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { authClient } from "@/lib/auth-client";

interface RouterOption {
	id: string;
	name: string;
}

export default function SettingsPage() {
	const { data: session } = authClient.useSession();
	const [isAdmin, setIsAdmin] = useState(false);

	const [deleteOlderThan, setDeleteOlderThan] = useState("1");
	const [selectedRouter, setSelectedRouter] = useState("all");
	const [isDeleting, setIsDeleting] = useState(false);
	const [deleteDialog, setDeleteDialog] = useState(false);
	const [routers, setRouters] = useState<RouterOption[]>([]);
	const [routersLoading, setRoutersLoading] = useState(true);

	// Fetch routers & check role
	useEffect(() => {
		fetch("/api/routers")
			.then((res) => {
				if (res.ok) setIsAdmin(true);
				return res.json();
			})
			.then((data) => {
				setRouters(data || []);
				setRoutersLoading(false);
			})
			.catch(() => {
				setRoutersLoading(false);
			});
	}, []);

	const handleDeleteHistory = async () => {
		setIsDeleting(true);
		try {
			const years = Number(deleteOlderThan);
			const cutoffDate = new Date();
			cutoffDate.setFullYear(cutoffDate.getFullYear() - years);

			const body: Record<string, unknown> = {
				before: cutoffDate.toISOString(),
			};

			// Admin can choose specific router, user always uses their accessible ones
			if (isAdmin && selectedRouter !== "all") {
				body.routerId = selectedRouter;
			} else if (!isAdmin) {
				body.routerId = "own";
			}

			const res = await fetch("/api/settings/cleanup", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});

			if (res.ok) {
				const data = await res.json();
				toast.success(`Deleted ${data.deletedCount} history records`);
			} else {
				const data = await res.json();
				toast.error(data.error || "Failed to delete history data");
			}
		} catch {
			toast.error("An error occurred");
		} finally {
			setIsDeleting(false);
			setDeleteDialog(false);
		}
	};

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-2xl font-bold tracking-tight">Settings</h2>
				<p className="text-muted-foreground">
					Application configuration and data management
				</p>
			</div>

			{/* Polling Configuration */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Polling Configuration</CardTitle>
					<CardDescription>
						These settings are configured via environment variables. Restart the
						worker process to apply changes.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-2 gap-4">
						<div className="rounded-lg border p-4">
							<p className="text-sm font-medium">Polling Interval</p>
							<p className="text-2xl font-bold font-mono mt-1">
								{Number(
									typeof process !== "undefined" &&
										process.env.NEXT_PUBLIC_POLL_INTERVAL
										? process.env.NEXT_PUBLIC_POLL_INTERVAL
										: "30000",
								) / 1000 || 30}
								s
							</p>
						</div>
						<div className="rounded-lg border p-4">
							<p className="text-sm font-medium">Sync Interval</p>
							<p className="text-2xl font-bold font-mono mt-1">
								{Number(
									typeof process !== "undefined" &&
										process.env.NEXT_PUBLIC_SYNC_INTERVAL
										? process.env.NEXT_PUBLIC_SYNC_INTERVAL
										: "60000",
								) / 1000 || 60}
								s
							</p>
						</div>
					</div>
				</CardContent>
			</Card>

			<Separator />

			{/* Data Retention */}
			<Card className="border-destructive/30">
				<CardHeader>
					<CardTitle className="text-base text-destructive">
						Data Management
					</CardTitle>
					<CardDescription>
						Manage historical queue data. Deleted data cannot be recovered.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex flex-wrap items-end gap-4">
						<div className="space-y-2">
							<p className="text-sm font-medium">Delete records older than</p>
							<Select
								value={deleteOlderThan}
								onValueChange={(v) => setDeleteOlderThan(v ?? "1")}
							>
								<SelectTrigger className="w-[180px]">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="1">1 year</SelectItem>
									<SelectItem value="2">2 years</SelectItem>
									<SelectItem value="3">3 years</SelectItem>
									<SelectItem value="5">5 years</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* Admin: show router filter */}
						{isAdmin && (
							<div className="space-y-2">
								<p className="text-sm font-medium">Router</p>
								<Select
									value={selectedRouter}
									onValueChange={(v) =>
										setSelectedRouter(v ?? "all")
									}
								>
									<SelectTrigger className="w-[200px]">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All Routers</SelectItem>
										{routers.map((r) => (
											<SelectItem key={r.id} value={r.id}>
												{r.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}

						<Button
							variant="destructive"
							onClick={() => setDeleteDialog(true)}
							disabled={isDeleting}
						>
							<Trash2 className="mr-2 h-4 w-4" />
							{isDeleting ? "Deleting..." : "Delete Old Data"}
						</Button>
					</div>
				</CardContent>
			</Card>

			<AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Confirm Data Deletion</AlertDialogTitle>
						<AlertDialogDescription>
							This will permanently delete queue history records older than{" "}
							{deleteOlderThan} year(s)
							{isAdmin && selectedRouter !== "all"
								? ` for the selected router.`
								: isAdmin
									? " for all routers."
									: " for your routers."}{" "}
							This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={handleDeleteHistory}>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
