"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
	PrintTemplate1,
	PrintTemplate2,
	PrintTemplate3,
	PrintTemplate4,
	PrintTemplate5,
	PrintTemplate6,
	PrintTemplate7,
	PrintTemplate8,
	PrintTemplate9,
	type VoucherPrintData,
} from "./voucher-print-templates";

type TemplateKey =
	| "t1"
	| "t2"
	| "t3"
	| "t4"
	| "t5"
	| "t6"
	| "t7"
	| "t8"
	| "t9"
	| "custom";

interface VoucherPrintDialogProps {
	data: VoucherPrintData;
	open: boolean;
	onClose: () => void;
}

const PAPER_SIZES = [
	{ value: "A4", label: "A4 (210×297mm)" },
	{ value: "A3", label: "A3 (297×420mm)" },
	{ value: "F4", label: "F4 (210×330mm)" },
	{ value: "Letter", label: "Letter (216×279mm)" },
];

const TEMPLATES: { key: TemplateKey; label: string; desc: string }[] = [
	{ key: "t1", label: "Classic Grid", desc: "Clean, professional" },
	{ key: "t2", label: "Modern Minimal", desc: "Simple, elegant" },
	{ key: "t3", label: "Dark Premium", desc: "Bold dark theme" },
	{ key: "t4", label: "Voucher Strip", desc: "Horizontal layout" },
	{ key: "t5", label: "Coupon Premium", desc: "Gold border coupon" },
	{ key: "t6", label: "Neon", desc: "Glowing vibrant colors" },
	{ key: "t7", label: "Retro", desc: "Vintage 80s vibe" },
	{ key: "t8", label: "Retro Modern", desc: "Retro-meets-modern" },
	{ key: "t9", label: "Cyberpunk", desc: "Synthwave edge" },
	{ key: "custom", label: "Custom HTML", desc: "Edit template sendiri" },
];

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

/** Compute CSS custom properties from scale (25–100) */
function vcVars(scale: number, isCustom: boolean): React.CSSProperties {
	const s = Math.max(25, Math.min(100, scale));
	const ratio = s / 100; // 1.0 at 100%, 0.25 at 25%

	// auto-fill grid column minimum width shrinks as scale shrinks
	const colMin = Math.round(220 * ratio);
	const gap = Math.max(2, Math.round(10 * ratio));
	const pad = Math.max(2, Math.round(12 * ratio));
	const border = ratio > 0.5 ? 2 : 1;
	const font = 14 * ratio; // base font px

	return {
		transform: isCustom ? "none" : `scale(${0.85 * ratio})`,
		transformOrigin: "top left",
		"--vc-font": `${Math.max(6, font)}px`,
		"--vc-col-min": `${Math.max(60, colMin)}px`,
		"--vc-gap": `${gap}px`,
		"--vc-pad": `${pad}px`,
		"--vc-pad-card-v": `${pad}px`,
		"--vc-pad-card-h": `${Math.max(2, Math.round(pad * 1.2))}px`,
		"--vc-border": `${border}px`,
		"--vc-qr": `${Math.max(20, Math.round(70 * ratio))}px`,
	} as React.CSSProperties;
}

/** Same vars as inline CSS string for print window */
function toVars(scale: number): string {
	const s = Math.max(25, Math.min(100, scale));
	const ratio = s / 100;
	const colMin = Math.round(220 * ratio);
	const gap = Math.max(2, Math.round(10 * ratio));
	const pad = Math.max(2, Math.round(12 * ratio));
	const border = ratio > 0.5 ? 2 : 1;
	const font = 14 * ratio;
	const qr = Math.max(20, Math.round(70 * ratio));
	return [
		`--vc-font: ${Math.max(6, font)}px;`,
		`--vc-col-min: ${Math.max(60, colMin)}px;`,
		`--vc-gap: ${gap}px;`,
		`--vc-pad: ${gap}px;`,
		`--vc-pad-card-v: ${pad}px;`,
		`--vc-pad-card-h: ${Math.max(2, Math.round(pad * 1.2))}px;`,
		`--vc-border: ${border}px;`,
		`--vc-qr: ${qr}px;`,
	].join(" ");
}

export function VoucherPrintDialog({
	data,
	open,
	onClose,
}: VoucherPrintDialogProps) {
	const [template, setTemplate] = useState<TemplateKey>("t1");
	const [showPassword, setShowPassword] = useState(true);
	const [showQR, setShowQR] = useState(false);
	const [qrDomain, setQrDomain] = useState("");
	const [paperSize, setPaperSize] = useState("A4");
	const [customHtml, setCustomHtml] = useState(DEFAULT_CUSTOM_HTML);
	const [voucherScale, setVoucherScale] = useState(100);
	const previewRef = useRef<HTMLDivElement>(null);

	// Auto-detect domain from hotspot server dns-name
	useEffect(() => {
		if (!open) return;
		const routerId = localStorage.getItem("hotspot_router_id");
		if (!routerId) return;
		fetch(`/api/hotspot/servers?routerId=${routerId}`)
			.then((r) => r.json())
			.then((servers) => {
				if (!Array.isArray(servers) || servers.length === 0) return;
				const srv = servers[1];
				const addr = srv["dns-name"] || srv.dnsName || "";
				if (addr) {
					if (addr.startsWith("http://") || addr.startsWith("https://")) {
						setQrDomain(addr);
					} else {
						setQrDomain(`http://${addr}`);
					}
				}
			})
			.catch(() => {});
	}, [open]);

	// Reset state on open
	useEffect(() => {
		if (!open) return;
		setTemplate("t1");
		setShowPassword(true);
		setShowQR(false);
		setPaperSize("A4");
		setVoucherScale(100);
		setCustomHtml(DEFAULT_CUSTOM_HTML);
	}, [open]);

	// Render QR codes on custom HTML canvases
	useEffect(() => {
		if (!open) return;
		if (template !== "custom" || !showQR || !previewRef.current) return;
		let cancelled = false;
		const canvases = previewRef.current.querySelectorAll<HTMLCanvasElement>(
			"canvas[data-qr-text]",
		);
		if (canvases.length === 0) return;
		import("qrcode").then((QR) => {
			if (cancelled) return;
			canvases.forEach((canvas) => {
				const text = canvas.dataset.qrText || "";
				if (!text) return;
				const size = Number(canvas.dataset.qrSize) || canvas.width || 80;
				QR.toCanvas(canvas, text, { width: size, margin: 1 }, () => {});
			});
		});
		return () => {
			cancelled = true;
		};
	}, [open, template, showQR]);

	const handlePrint = async () => {
		if (!previewRef.current) return;

		const previewClone = previewRef.current.cloneNode(true) as HTMLElement;
		const canvases = previewClone.querySelectorAll<HTMLCanvasElement>("canvas");
		await Promise.all(
			Array.from(canvases).map(async (canvas, idx) => {
				const origCanvas =
					previewRef.current?.querySelectorAll<HTMLCanvasElement>("canvas")[
						idx
					];
				if (origCanvas) {
					try {
						const dataUrl = origCanvas.toDataURL();
						const blank = await isBlankCanvas(origCanvas);
						if (blank) throw new Error("blank canvas");
						const img = document.createElement("img");
						img.src = dataUrl;
						img.width = canvas.width;
						img.height = canvas.height;
						img.style.cssText = canvas.style.cssText;
						canvas.parentNode?.replaceChild(img, canvas);
					} catch {
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

		printWindow.document.write(
			[
				"<!DOCTYPE html><html><head>",
				`<title>Print Voucher - ${data.title}</title>`,
				"<style>",
				"@media print {",
				`@page { margin: 4mm; size: ${paperSize}; }`,
				"body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }",
				".print-wrapper {",
				toVars(voucherScale),
				"}",
				"}",
				"</style>",
				styles,
				"</head><body>",
				'<div class="print-wrapper">',
				previewClone.innerHTML,
				"</div>",
				"<script>window.onload=function(){setTimeout(function(){window.print();setTimeout(function(){window.close()},500)},300)}</script>",
				"</body></html>",
			].join("\n"),
		);
		printWindow.document.close();
	};

	// Generate custom HTML for preview
	const renderCustom = () => {
		const domain = qrDomain || "http://hotspot.local";
		return data.users
			.map((u) => {
				const qrText = `${domain}/login?username=${encodeURIComponent(u.name)}&password=${encodeURIComponent(u.password || "")}`;
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

				if (!showQR) {
					html = html.replace(
						/<canvas[^>]*data-qr-text[^>]*>[^<]*<\/canvas>/gi,
						"",
					);
					html = html.replace(/<canvas[^>]*data-qr-text[^>]*\/?>/gi, "");
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
								// biome-ignore lint/a11y/noLabelWithoutControl: ...
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
								<Label className="text-sm whitespace-nowrap">Domain:</Label>
								<Input
									type="text"
									value={qrDomain}
									onChange={(e) => setQrDomain(e.target.value)}
									className="h-8 w-56 text-sm"
									placeholder="http://hotspot.local"
								/>
							</div>
						)}
						<div className="flex items-center gap-2">
							<Label className="text-sm whitespace-nowrap">Kertas:</Label>
							<Select
								value={paperSize}
								onValueChange={(v) => v && setPaperSize(v)}
							>
								<SelectTrigger className="h-8 w-44 text-sm">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{PAPER_SIZES.map((p) => (
										<SelectItem key={p.value} value={p.value}>
											{p.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="flex items-center gap-2">
							<Label className="text-sm whitespace-nowrap">
								Scale: {voucherScale}%
							</Label>
							<input
								type="range"
								min="25"
								max="100"
								step="5"
								value={voucherScale}
								onChange={(e) => setVoucherScale(Number(e.target.value))}
								className="w-24 h-2"
							/>
						</div>
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
							<div ref={previewRef} style={vcVars(voucherScale, isCustom)}>
								{template === "t1" && <PrintTemplate1 data={printData} />}
								{template === "t2" && <PrintTemplate2 data={printData} />}
								{template === "t3" && <PrintTemplate3 data={printData} />}
								{template === "t4" && <PrintTemplate4 data={printData} />}
								{template === "t5" && <PrintTemplate5 data={printData} />}
								{template === "t6" && <PrintTemplate6 data={printData} />}
								{template === "t7" && <PrintTemplate7 data={printData} />}
								{template === "t8" && <PrintTemplate8 data={printData} />}
								{template === "t9" && <PrintTemplate9 data={printData} />}
								{isCustom && (
									<div
										dangerouslySetInnerHTML={{
											__html: renderCustom(),
										}}
									/>
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

function isBlankCanvas(canvas: HTMLCanvasElement): Promise<boolean> {
	return new Promise((resolve) => {
		const ctx = canvas.getContext("2d");
		if (!ctx) return resolve(true);
		const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
		const data = imageData.data;
		let hasContent = false;
		for (let i = 3; i < data.length; i += 4) {
			if (data[i] > 0) {
				hasContent = true;
				break;
			}
		}
		resolve(!hasContent);
	});
}

function formatBytesCustom(bytes: number): string {
	if (!bytes) return "";
	const units = ["B", "KB", "MB", "GB", "TB"];
	const k = 1024;
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${(bytes / k ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
