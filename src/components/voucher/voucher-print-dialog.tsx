"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
	PrintTemplateBesar,
	PrintTemplateKecil,
	PrintTemplateSedang,
	PrintTemplateStruk,
	type VoucherPrintData,
} from "./voucher-print-templates";

type TemplateKey = "kecil" | "sedang" | "besar" | "struk";

interface VoucherPrintDialogProps {
	data: VoucherPrintData;
	open: boolean;
	onClose: () => void;
}

const TEMPLATES: { key: TemplateKey; label: string; desc: string }[] = [
	{ key: "kecil", label: "Kecil", desc: "10 voucher/halaman" },
	{ key: "sedang", label: "Sedang", desc: "4 voucher/halaman (2x2)" },
	{ key: "besar", label: "Besar", desc: "2 voucher/halaman" },
	{ key: "struk", label: "Struk", desc: "1 kolom memanjang" },
];

export function VoucherPrintDialog({
	data,
	open,
	onClose,
}: VoucherPrintDialogProps) {
	const [template, setTemplate] = useState<TemplateKey>("kecil");
	const [showPassword, setShowPassword] = useState(true);
	const previewRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		setTemplate("kecil");
		setShowPassword(true);
	}, [open]);

	const handlePrint = () => {
		if (!previewRef.current) return;

		const printWindow = window.open("", "_blank");
		if (!printWindow) {
			alert("Popup diblokir. Izinkan popup untuk mencetak.");
			return;
		}

		// Clone preview HTML + inline styles for print window
		const previewHtml = previewRef.current.innerHTML;
		const styles = Array.from(document.querySelectorAll("style"))
			.map((s) => s.outerHTML)
			.join("\n");

		printWindow.document.write(`
			<!DOCTYPE html>
			<html>
			<head>
				<title>Print Voucher - ${data.title}</title>
				${styles}
			</head>
			<body>
				<div class="print-wrapper">
					${previewHtml}
				</div>
				<script>
					window.onload = function() {
						window.print();
						setTimeout(function() { window.close(); }, 500);
					};
				</script>
			</body>
			</html>
		`);
		printWindow.document.close();
	};

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
			<div className="bg-background rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between p-4 border-b">
					<h2 className="text-lg font-semibold">Print Voucher</h2>
					<button
						type="button"
						onClick={onClose}
						className="p-1 hover:bg-muted rounded-md"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* Body */}
				<div className="p-4 space-y-6 overflow-y-auto">
					{/* Template selector */}
					<div className="space-y-3">
						<Label>Template Cetak</Label>
						<RadioGroup
							value={template}
							onValueChange={(v) => setTemplate(v as TemplateKey)}
							className="grid grid-cols-2 gap-3"
						>
							{TEMPLATES.map((t) => (
								<label
									key={t.key}
									className={`border rounded-lg p-3 cursor-pointer transition-colors ${
										template === t.key
											? "border-primary bg-primary/5"
											: "hover:bg-muted"
									}`}
								>
									<RadioGroupItem
										value={t.key}
										id={`template-${t.key}`}
										className="sr-only"
									/>
									<div className="font-medium text-sm">{t.label}</div>
									<div className="text-xs text-muted-foreground">{t.desc}</div>
								</label>
							))}
						</RadioGroup>
					</div>

					{/* Options */}
					<div className="flex items-center gap-2">
						<input
							type="checkbox"
							id="showPassword"
							checked={showPassword}
							onChange={(e) => setShowPassword(e.target.checked)}
							className="h-4 w-4"
						/>
						<Label htmlFor="showPassword" className="cursor-pointer">
							Tampilkan Password
						</Label>
					</div>

					{/* Preview */}
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<Label>Preview</Label>
							<span className="text-xs text-muted-foreground">
								{data.users.length} voucher
							</span>
						</div>
						<div
							ref={previewRef}
							className="border rounded-lg p-4 bg-white overflow-auto max-h-[400px]"
							style={{ transform: "scale(0.85)", transformOrigin: "top left" }}
						>
							{template === "kecil" && (
								<PrintTemplateKecil data={{ ...data, showPassword }} />
							)}
							{template === "sedang" && (
								<PrintTemplateSedang data={{ ...data, showPassword }} />
							)}
							{template === "besar" && (
								<PrintTemplateBesar data={{ ...data, showPassword }} />
							)}
							{template === "struk" && (
								<PrintTemplateStruk data={{ ...data, showPassword }} />
							)}
						</div>
					</div>
				</div>

				{/* Footer */}
				<div className="flex items-center justify-end gap-2 p-4 border-t">
					<Button variant="outline" onClick={onClose}>
						Batal
					</Button>
					<Button onClick={handlePrint}>Print</Button>
				</div>
			</div>
		</div>
	);
}
