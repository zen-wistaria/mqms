"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import {
	PrintTemplate1,
	PrintTemplate2,
	PrintTemplate3,
	PrintTemplate4,
	PrintTemplate5,
	type VoucherPrintData,
} from "./voucher-print-templates";

type TemplateKey = "t1" | "t2" | "t3" | "t4" | "t5" | "custom";

interface VoucherPrintDialogProps {
	data: VoucherPrintData;
	open: boolean;
	onClose: () => void;
}

const TEMPLATES: { key: TemplateKey; label: string; desc: string }[] = [
	{ key: "t1", label: "Classic Grid", desc: "6 voucher/halaman (2x3)" },
	{ key: "t2", label: "Modern Minimal", desc: "4 voucher, clean design" },
	{ key: "t3", label: "Dark Premium", desc: "4 voucher, dark theme" },
	{ key: "t4", label: "Voucher Strip", desc: "6 voucher horizontal" },
	{ key: "t5", label: "Coupon Premium", desc: "2 voucher, gold border" },
	{ key: "custom", label: "Custom HTML", desc: "Edit template sendiri" },
];

/** Default custom HTML template */
const DEFAULT_CUSTOM_HTML = `<div style="border:2px solid #000; padding:16px; text-align:center; font-family:Arial; margin-bottom:12px; page-break-inside:avoid;">
	<h2 style="margin:0 0 8px; font-size:16px; text-transform:uppercase;">{TITLE}</h2>
	<canvas data-qr-text="{QR_TEXT}" data-qr-size="80" class="qr-canvas" width="80" height="80" style="display:block; margin:4px auto;"></canvas>
	<div style="font-size:22px; font-weight:bold; letter-spacing:2px; margin:8px 0;">{USERNAME}</div>
	<div style="font-size:14px; margin:4px 0;">Password: {PASSWORD}</div>
	<div style="font-size:10px; color:#666; margin-top:6px;">
		<span style="margin:0 4px;">{PROFILE}</span>
		<span style="margin:0 4px;">{TIME_LIMIT}</span>
		<span style="margin:0 4px;">{DATA_LIMIT}</span>
	</div>
</div>`;

export function VoucherPrintDialog({
	data,
	open,
	onClose,
}: VoucherPrintDialogProps) {
	const [template, setTemplate] = useState<TemplateKey>("t1");
	const [showPassword, setShowPassword] = useState(true);
	const [showQR, setShowQR] = useState(false);
	const [qrDomain, setQrDomain] = useState("http://hotspot.local");
	const [customHtml, setCustomHtml] = useState(DEFAULT_CUSTOM_HTML);
	const previewRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		setTemplate("t1");
		setShowPassword(true);
		setShowQR(false);
		setQrDomain("http://hotspot.local");
		setCustomHtml(DEFAULT_CUSTOM_HTML);
	}, [open]);

	const handlePrint = async () => {
		if (!previewRef.current) return;

		// Convert QR canvases to data URLs so print window gets rendered images
		const previewClone = previewRef.current.cloneNode(true) as HTMLElement;
		const canvases = previewClone.querySelectorAll<HTMLCanvasElement>("canvas");
		await Promise.all(
			Array.from(canvases).map(async (canvas, idx) => {
				// Try to find matching original canvas that already has QR rendered
				const origCanvas =
					previewRef.current?.querySelectorAll<HTMLCanvasElement>("canvas")[
						idx
					];
				if (origCanvas) {
					try {
						const dataUrl = origCanvas.toDataURL();
						const img = document.createElement("img");
						img.src = dataUrl;
						img.width = canvas.width;
						img.height = canvas.height;
						img.style.cssText = canvas.style.cssText;
						canvas.parentNode?.replaceChild(img, canvas);
					} catch {
						// Fallback: render QR in the clone
						try {
							const QR = await import("qrcode");
							const text = canvas.dataset.qrText || "";
							const size = Number(canvas.dataset.qrSize) || canvas.width || 80;
							const dataUrl = await new Promise<string>((resolve, reject) => {
								QR.toDataURL(
									text,
									{ width: size, margin: 1 },
									(err: Error | null | undefined, url: string) => {
										if (err) reject(err);
										else resolve(url);
									},
								);
							});
							const img = document.createElement("img");
							img.src = dataUrl;
							img.width = canvas.width;
							img.height = canvas.height;
							img.style.cssText = canvas.style.cssText;
							canvas.parentNode?.replaceChild(img, canvas);
						} catch {
							/* skip */
						}
					}
				}
			}),
		);

		const printWindow = window.open("", "_blank");
		if (!printWindow) {
			alert("Popup diblokir. Izinkan popup untuk mencetak.");
			return;
		}

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
					${previewClone.innerHTML}
				</div>
				<script>
					window.onload = function() {
						setTimeout(function() {
							window.print();
							setTimeout(function() { window.close(); }, 500);
						}, 300);
					};
				</script>
			</body>
			</html>
		`);
		printWindow.document.close();
	};

	// Generate custom HTML for preview
	const renderCustom = () => {
		const domain = qrDomain || "http://hotspot.local";
		return data.users
			.map((u) => {
				const qrText = encodeURIComponent(
					`${domain}/login?username=${encodeURIComponent(u.name)}&password=${encodeURIComponent(u.password || "")}`,
				);
				let html = customHtml
					.replace(/\{TITLE\}/g, data.title)
					.replace(/\{USERNAME\}/g, u.name)
					.replace(
						/\{PASSWORD\}/g,
						data.showPassword && u.password ? u.password : "***",
					)
					.replace(/\{PROFILE\}/g, u.profile || "")
					.replace(/\{TIME_LIMIT\}/g, u["limit-uptime"] || "")
					.replace(
						/\{DATA_LIMIT\}/g,
						u["limit-bytes-total"]
							? formatBytesCustom(Number(u["limit-bytes-total"]))
							: "",
					)
					.replace(/\{QR_TEXT\}/g, qrText);

				if (!data.showQR) {
					// Remove img with QR
					html = html.replace(
						/<img[^>]*src="[^"]*qrserver[^"]*"[^>]*\/?>/gi,
						"",
					);
				}

				return html;
			})
			.join("\n");
	};

	if (!open) return null;

	const printData: VoucherPrintData = {
		...data,
		showPassword,
		showQR,
		qrDomain: showQR ? qrDomain : undefined,
	};

	const isCustom = template === "custom";

	return (
		<div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
			<div className="bg-background rounded-lg shadow-lg max-w-3xl w-full mx-4 max-h-[95vh] flex flex-col">
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
				<div className="p-4 space-y-4 overflow-y-auto flex-1">
					{/* Template selector */}
					<div className="space-y-2">
						<Label>Template Cetak</Label>
						<RadioGroup
							value={template}
							onValueChange={(v) => setTemplate(v as TemplateKey)}
							className="grid grid-cols-3 gap-2"
						>
							{TEMPLATES.map((t) => (
								<label
									key={t.key}
									className={`border rounded-lg p-2.5 cursor-pointer transition-colors ${
										template === t.key
											? "border-primary bg-primary/5 ring-1 ring-primary"
											: "hover:bg-muted"
									}`}
								>
									<RadioGroupItem
										value={t.key}
										id={`template-${t.key}`}
										className="sr-only"
									/>
									<div className="font-medium text-sm">{t.label}</div>
									<div className="text-xs text-muted-foreground mt-0.5">
										{t.desc}
									</div>
								</label>
							))}
						</RadioGroup>
					</div>

					{/* Options */}
					<div className="flex flex-wrap items-center gap-4">
						<div className="flex items-center gap-2">
							<input
								type="checkbox"
								id="showPassword"
								checked={showPassword}
								onChange={(e) => setShowPassword(e.target.checked)}
								className="h-4 w-4"
							/>
							<Label htmlFor="showPassword" className="cursor-pointer text-sm">
								Tampilkan Password
							</Label>
						</div>
						<div className="flex items-center gap-2">
							<input
								type="checkbox"
								id="showQR"
								checked={showQR}
								onChange={(e) => setShowQR(e.target.checked)}
								className="h-4 w-4"
							/>
							<Label htmlFor="showQR" className="cursor-pointer text-sm">
								QR Code
							</Label>
						</div>
						{showQR && (
							<div className="flex items-center gap-2">
								<Label className="text-sm whitespace-nowrap">
									Domain Hotspot:
								</Label>
								<Input
									type="text"
									value={qrDomain}
									onChange={(e) => setQrDomain(e.target.value)}
									className="h-8 w-64 text-sm"
									placeholder="http://hotspot.local"
								/>
							</div>
						)}
					</div>

					{/* Custom HTML editor */}
					{isCustom && (
						<div className="space-y-2">
							<Label>Custom HTML Template</Label>
							<Textarea
								value={customHtml}
								onChange={(e) => setCustomHtml(e.target.value)}
								rows={10}
								className="font-mono text-xs"
								placeholder="Gunakan {USERNAME}, {PASSWORD}, {QR_TEXT}, {TITLE}, {PROFILE}, {TIME_LIMIT}, {DATA_LIMIT}"
							/>
							<div className="text-xs text-muted-foreground">
								Variabel: <code>{"{USERNAME}"}</code>,{" "}
								<code>{"{PASSWORD}"}</code>, <code>{"{QR_TEXT}"}</code>,{" "}
								<code>{"{TITLE}"}</code>, <code>{"{PROFILE}"}</code>,{" "}
								<code>{"{TIME_LIMIT}"}</code>, <code>{"{DATA_LIMIT}"}</code>
							</div>
						</div>
					)}

					{/* Preview */}
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<Label className="text-sm font-medium">Preview</Label>
							<span className="text-xs text-muted-foreground">
								{data.users.length} voucher
							</span>
						</div>
						<div className="border rounded-lg p-3 bg-white overflow-auto max-h-[400px]">
							<div
								ref={previewRef}
								style={{
									transform: isCustom ? "none" : "scale(0.85)",
									transformOrigin: "top left",
								}}
							>
								{template === "t1" && <PrintTemplate1 data={printData} />}
								{template === "t2" && <PrintTemplate2 data={printData} />}
								{template === "t3" && <PrintTemplate3 data={printData} />}
								{template === "t4" && <PrintTemplate4 data={printData} />}
								{template === "t5" && <PrintTemplate5 data={printData} />}
								{isCustom && (
									<div dangerouslySetInnerHTML={{ __html: renderCustom() }} />
								)}
							</div>
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

function formatBytesCustom(bytes: number): string {
	if (!bytes) return "";
	const units = ["B", "KB", "MB", "GB", "TB"];
	const k = 1024;
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${(bytes / k ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
