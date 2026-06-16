"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
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

export default function SettingsPage() {
	const [deleteOlderThan, setDeleteOlderThan] = useState("1");
	const [isDeleting, setIsDeleting] = useState(false);
	const [deleteDialog, setDeleteDialog] = useState(false);

	const handleDeleteHistory = async () => {
		setIsDeleting(true);
		try {
			const years = Number(deleteOlderThan);
			const cutoffDate = new Date();
			cutoffDate.setFullYear(cutoffDate.getFullYear() - years);

			const res = await fetch("/api/settings/cleanup", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ before: cutoffDate.toISOString() }),
			});

			if (res.ok) {
				const data = await res.json();
				toast.success(`Deleted ${data.deletedCount} history records`);
			} else {
				toast.error("Failed to delete history data");
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
									process.env.NEXT_PUBLIC_POLLING_INTERVAL_MS || "60000",
								) / 1000}
								s
							</p>
							<p className="text-xs text-muted-foreground mt-1">
								POLLING_INTERVAL_MS
							</p>
						</div>
						<div className="rounded-lg border p-4">
							<p className="text-sm font-medium">Sync Interval</p>
							<p className="text-2xl font-bold font-mono mt-1">
								{Number(process.env.NEXT_PUBLIC_SYNC_INTERVAL_MS || "300000") /
									1000}
								s
							</p>
							<p className="text-xs text-muted-foreground mt-1">
								SYNC_INTERVAL_MS
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
							<p className="text-sm font-medium">
								Delete history records older than:
							</p>
							<Select
								value={deleteOlderThan}
								onValueChange={(val) => setDeleteOlderThan(val || "1")}
							>
								<SelectTrigger className="w-[200px]">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="1">1 Year</SelectItem>
									<SelectItem value="2">2 Years</SelectItem>
									<SelectItem value="3">3 Years</SelectItem>
									<SelectItem value="5">5 Years</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<Button
							variant="destructive"
							onClick={() => setDeleteDialog(true)}
							disabled={isDeleting}
						>
							{isDeleting ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : (
								<Trash2 className="mr-2 h-4 w-4" />
							)}
							Delete Old Data
						</Button>
					</div>
					<p className="text-xs text-muted-foreground">
						This will permanently delete all QueueHistory records older than the
						selected period. Queue and Router records will not be affected.
					</p>
				</CardContent>
			</Card>

			<AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Historical Data?</AlertDialogTitle>
						<AlertDialogDescription>
							This will permanently delete all queue history records older than{" "}
							{deleteOlderThan} year{Number(deleteOlderThan) > 1 ? "s" : ""}.
							This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							onClick={handleDeleteHistory}
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
