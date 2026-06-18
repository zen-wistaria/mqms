"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "./button";

interface ConfirmModalProps {
	open: boolean;
	onClose: () => void;
	onConfirm: () => void;
	title: string;
	message: string;
	confirmLabel?: string;
	cancelLabel?: string;
	variant?: "default" | "destructive";
	isLoading?: boolean;
}

export function ConfirmModal({
	open,
	onClose,
	onConfirm,
	title,
	message,
	confirmLabel = "Hapus",
	cancelLabel = "Batal",
	variant = "destructive",
	isLoading = false,
}: ConfirmModalProps) {
	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
			<div className="bg-background rounded-lg shadow-lg max-w-md w-full mx-4">
				<div className="p-6">
					<div className="flex items-start gap-4">
						<div
							className={`rounded-full p-2 ${
								variant === "destructive"
									? "bg-destructive/10 text-destructive"
									: "bg-primary/10 text-primary"
							}`}
						>
							<AlertTriangle className="h-5 w-5" />
						</div>
						<div className="space-y-2 flex-1">
							<h3 className="font-semibold text-lg">{title}</h3>
							<p className="text-sm text-muted-foreground">{message}</p>
						</div>
					</div>
				</div>
				<div className="flex items-center justify-end gap-2 px-6 pb-4">
					<Button variant="outline" onClick={onClose} disabled={isLoading}>
						{cancelLabel}
					</Button>
					<Button
						variant={variant}
						onClick={onConfirm}
						disabled={isLoading}
					>
						{isLoading ? "Memproses..." : confirmLabel}
					</Button>
				</div>
			</div>
		</div>
	);
}
