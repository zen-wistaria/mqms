import { useEffect, useRef } from "react";
import { formatBytes } from "@/lib/format";

export interface VoucherUser {
	".id": string;
	name: string;
	password?: string;
	profile?: string;
	server?: string;
	"limit-uptime"?: string;
	"limit-bytes-total"?: string;
	comment?: string;
}

export interface VoucherPrintData {
	users: VoucherUser[];
	title: string;
	subtitle?: string;
	footer?: string;
	showPassword: boolean;
	showQR: boolean;
	qrDomain?: string;
	batchComment?: string;
}

function formatUptime(uptime?: string) {
	if (!uptime || uptime === "0") return "";
	return uptime;
}

function formatDataLimit(bytes?: string) {
	if (!bytes || bytes === "0") return "";
	return formatBytes(Number(bytes));
}

function qrUrl(domain: string | undefined, user: string, pass: string) {
	const d = domain || "http://hotspot.local";
	return `${d}/login?username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`;
}

// ============================================================
// SHARED STYLES
// ============================================================
const SHARED_STYLES = `
@media print {
	@page { margin: 8mm; size: A4; }
	body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
/* QR placeholder: rendered on the client before print, now inline via canvas/img */
.voucher-qr {
	margin: 4px auto;
	display: block;
}
.voucher-qr-large {
	margin: 6px auto;
	display: block;
}
`;

// ============================================================
// TEMPLATE 1: CLASSIC GRID — 6 voucher/halaman, 2x3 grid
// ============================================================
export function PrintTemplate1({ data }: { data: VoucherPrintData }) {
	return (
		<div>
			<style>{`
				${SHARED_STYLES}
				.t1-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; padding: 8px; font-family: 'Segoe UI', Arial, sans-serif; }
				.t1-card { border: 2px solid #222; border-radius: 8px; padding: 12px 14px; text-align: center; break-inside: avoid; page-break-inside: avoid; background: #fafafa; }
				.t1-title { font-size: 14px; font-weight: 800; color: #1a1a2e; letter-spacing: 1px; margin-bottom: 6px; text-transform: uppercase; }
				.t1-divider { height: 2px; background: linear-gradient(90deg, transparent, #1a1a2e, transparent); margin: 4px 0 8px; }
				.t1-user { font-size: 18px; font-weight: 700; letter-spacing: 1.5px; color: #16213e; margin: 4px 0; }
				.t1-pass { font-size: 13px; color: #0f3460; margin: 2px 0; font-weight: 600; }
				.t1-meta { font-size: 9px; color: #555; margin-top: 4px; }
				.t1-meta span { display: inline-block; margin: 0 4px; background: #eee; padding: 1px 6px; border-radius: 3px; }
			`}</style>
			<div className="t1-grid">
				{data.users.map((u) => (
					<div key={u[".id"]} className="t1-card">
						<div className="t1-title">{data.title}</div>
						<div className="t1-divider" />
						{data.showQR && (
							<QRPlaceholder text={qrUrl(data.qrDomain, u.name, u.password || "")} size={70} />
						)}
						<div className="t1-user">{u.name}</div>
						{data.showPassword && u.password && (
							<div className="t1-pass">Password: {u.password}</div>
						)}
						<div className="t1-meta">
							{u.profile && <span>{u.profile}</span>}
							{formatUptime(u["limit-uptime"]) && <span>{formatUptime(u["limit-uptime"])}</span>}
							{formatDataLimit(u["limit-bytes-total"]) && <span>{formatDataLimit(u["limit-bytes-total"])}</span>}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

// ============================================================
// TEMPLATE 2: MODERN MINIMAL — 4 voucher/halaman, clean design
// ============================================================
export function PrintTemplate2({ data }: { data: VoucherPrintData }) {
	return (
		<div>
			<style>{`
				${SHARED_STYLES}
				.t2-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; padding: 12px; font-family: 'Inter', 'Segoe UI', sans-serif; }
				.t2-card { border: 1px solid #ddd; border-radius: 12px; padding: 18px 16px; text-align: center; break-inside: avoid; page-break-inside: avoid; box-shadow: 0 2px 8px rgba(0,0,0,0.05); background: #fff; }
				.t2-title { font-size: 11px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 2px; }
				.t2-user { font-size: 24px; font-weight: 700; color: #111; letter-spacing: 2px; margin: 8px 0 4px; }
				.t2-pass { font-size: 14px; color: #555; margin: 2px 0; }
				.t2-badge { display: inline-block; background: #f0f0f0; border-radius: 20px; padding: 2px 10px; font-size: 9px; color: #333; margin: 2px; }
				.t2-footer { margin-top: 6px; font-size: 8px; color: #aaa; border-top: 1px solid #eee; padding-top: 4px; }
			`}</style>
			<div className="t2-grid">
				{data.users.map((u) => (
					<div key={u[".id"]} className="t2-card">
						<div className="t2-title">{data.title}</div>
						{data.showQR && (
							<QRPlaceholder text={qrUrl(data.qrDomain, u.name, u.password || "")} size={65} />
						)}
						<div className="t2-user">{u.name}</div>
						{data.showPassword && u.password && (
							<div className="t2-pass">{u.password}</div>
						)}
						<div>
							{u.profile && <span className="t2-badge">{u.profile}</span>}
							{formatUptime(u["limit-uptime"]) && <span className="t2-badge">{formatUptime(u["limit-uptime"])}</span>}
							{formatDataLimit(u["limit-bytes-total"]) && <span className="t2-badge">{formatDataLimit(u["limit-bytes-total"])}</span>}
						</div>
						<div className="t2-footer">{data.subtitle || "Hotspot Voucher"}</div>
					</div>
				))}
			</div>
		</div>
	);
}

// ============================================================
// TEMPLATE 3: DARK PREMIUM — 4 voucher, dark theme
// ============================================================
export function PrintTemplate3({ data }: { data: VoucherPrintData }) {
	return (
		<div>
			<style>{`
				${SHARED_STYLES}
				.t3-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; padding: 10px; font-family: 'Segoe UI', Arial, sans-serif; }
				.t3-card { background: #1a1a2e; border-radius: 10px; padding: 16px; text-align: center; break-inside: avoid; page-break-inside: avoid; color: #fff; }
				.t3-title { font-size: 12px; font-weight: 700; color: #e94560; text-transform: uppercase; letter-spacing: 2px; }
				.t3-user { font-size: 20px; font-weight: 700; letter-spacing: 2px; margin: 8px 0 4px; color: #fff; }
				.t3-pass { font-size: 13px; color: #a0a0b8; margin: 2px 0; }
				.t3-meta { margin-top: 6px; font-size: 9px; color: #8888aa; }
				.t3-meta span { display: inline-block; background: rgba(233,69,96,0.2); padding: 1px 8px; border-radius: 10px; margin: 2px; color: #e94560; }
			`}</style>
			<div className="t3-grid">
				{data.users.map((u) => (
					<div key={u[".id"]} className="t3-card">
						<div className="t3-title">{data.title}</div>
						{data.showQR && (
							<QRPlaceholder text={qrUrl(data.qrDomain, u.name, u.password || "")} size={65} invert />
						)}
						<div className="t3-user">{u.name}</div>
						{data.showPassword && u.password && (
							<div className="t3-pass">Password: {u.password}</div>
						)}
						<div className="t3-meta">
							{u.profile && <span>{u.profile}</span>}
							{formatUptime(u["limit-uptime"]) && <span>{formatUptime(u["limit-uptime"])}</span>}
							{formatDataLimit(u["limit-bytes-total"]) && <span>{formatDataLimit(u["limit-bytes-total"])}</span>}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

// ============================================================
// TEMPLATE 4: VOUCHER STRIP — 4 per page, 2x2 grid with clean horizontal layout
// ============================================================
export function PrintTemplate4({ data }: { data: VoucherPrintData }) {
	return (
		<div>
			<style>{`
				${SHARED_STYLES}
				.t4-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; padding: 8px; font-family: 'Segoe UI', Arial, sans-serif; }
				.t4-card { border: 1px solid #ccc; border-radius: 8px; padding: 10px 12px; display: flex; align-items: center; gap: 10px; break-inside: avoid; page-break-inside: avoid; background: #fff; }
				.t4-body { flex: 1; }
				.t4-title { font-size: 8px; font-weight: 700; color: #999; text-transform: uppercase; letter-spacing: 1px; }
				.t4-user { font-size: 16px; font-weight: 700; letter-spacing: 1px; color: #111; }
				.t4-pass { font-size: 11px; color: #555; }
				.t4-meta { font-size: 8px; color: #888; margin-top: 2px; }
				.t4-meta span { margin-right: 6px; }
			`}</style>
			<div className="t4-grid">
				{data.users.map((u) => (
					<div key={u[".id"]} className="t4-card">
						{data.showQR && (
							<QRPlaceholder text={qrUrl(data.qrDomain, u.name, u.password || "")} size={50} />
						)}
						<div className="t4-body">
							<div className="t4-title">{data.title}</div>
							<div className="t4-user">{u.name}</div>
							{data.showPassword && u.password && (
								<div className="t4-pass">Pass: {u.password}</div>
							)}
							<div className="t4-meta">
								{u.profile && <span>{u.profile}</span>}
								{formatUptime(u["limit-uptime"]) && <span>Masa: {formatUptime(u["limit-uptime"])}</span>}
								{formatDataLimit(u["limit-bytes-total"]) && <span>Kuota: {formatDataLimit(u["limit-bytes-total"])}</span>}
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

// ============================================================
// TEMPLATE 5: COUPON — 2 per page, premium style
// ============================================================
export function PrintTemplate5({ data }: { data: VoucherPrintData }) {
	return (
		<div>
			<style>{`
				${SHARED_STYLES}
				.t5-list { display: flex; flex-direction: column; gap: 16px; padding: 16px; font-family: 'Georgia', 'Times New Roman', serif; }
				.t5-card { border: 2px solid #c9a84c; border-radius: 16px; padding: 28px 24px; text-align: center; break-inside: avoid; page-break-inside: avoid; background: linear-gradient(135deg, #fefcf3, #fffdf7); box-shadow: 0 4px 16px rgba(0,0,0,0.06); position: relative; }
				.t5-card::before { content: ''; position: absolute; top: 8px; left: 8px; right: 8px; bottom: 8px; border: 1px dashed #c9a84c; border-radius: 12px; pointer-events: none; }
				.t5-title { font-size: 18px; font-weight: 700; color: #8b6914; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 4px; position: relative; z-index: 1; }
				.t5-subtitle { font-size: 10px; color: #b8952e; letter-spacing: 2px; margin-bottom: 10px; position: relative; z-index: 1; }
				.t5-divider { height: 1px; background: linear-gradient(90deg, transparent, #c9a84c, transparent); margin: 8px 0; position: relative; z-index: 1; }
				.t5-user { font-size: 26px; font-weight: 700; color: #1a1a2e; letter-spacing: 3px; margin: 8px 0; position: relative; z-index: 1; }
				.t5-pass { font-size: 16px; color: #555; margin: 4px 0; position: relative; z-index: 1; }
				.t5-meta { font-size: 11px; color: #777; margin-top: 8px; position: relative; z-index: 1; }
				.t5-meta span { display: inline-block; border: 1px solid #c9a84c; border-radius: 4px; padding: 2px 10px; margin: 2px 4px; color: #8b6914; }
				.t5-footer { margin-top: 8px; font-size: 9px; color: #aaa; font-style: italic; position: relative; z-index: 1; }
			`}</style>
			<div className="t5-list">
				{data.users.map((u) => (
					<div key={u[".id"]} className="t5-card">
						<div className="t5-title">{data.title}</div>
						<div className="t5-subtitle">{data.subtitle || "Hotspot Access"}</div>
						{data.showQR && (
							<QRPlaceholder
								text={qrUrl(data.qrDomain, u.name, u.password || "")}
								size={70}
							/>
						)}
						<div className="t5-divider" />
						<div className="t5-user">{u.name}</div>
						{data.showPassword && u.password && (
							<div className="t5-pass">{u.password}</div>
						)}
						<div className="t5-meta">
							{u.profile && <span>{u.profile}</span>}
							{formatUptime(u["limit-uptime"]) && <span>{formatUptime(u["limit-uptime"])}</span>}
							{formatDataLimit(u["limit-bytes-total"]) && <span>{formatDataLimit(u["limit-bytes-total"])}</span>}
						</div>
						<div className="t5-footer">{data.footer || "Terima kasih"}</div>
					</div>
				))}
			</div>
		</div>
	);
}

// ============================================================
// QR PLACEHOLDER — renders QR on mount (offline, no external API)
// ============================================================
function QRPlaceholder({
	text,
	size = 65,
	invert = false,
}: { text: string; size?: number; invert?: boolean }) {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		if (!canvasRef.current) return;
		let cancelled = false;
		import("qrcode").then((QR) => {
			if (cancelled || !canvasRef.current) return;
			QR.toCanvas(
				canvasRef.current,
				text,
				{ width: size, margin: 1 },
				() => {},
			);
		});
		return () => {
			cancelled = true;
		};
	}, [text, size]);

	return (
		<div
			style={{
				width: size,
				height: size,
				margin: "4px auto",
				background: invert ? "#fff" : "transparent",
				borderRadius: 4,
				overflow: "hidden",
			}}
		>
			<canvas
				ref={canvasRef}
				width={size}
				height={size}
				style={{ display: "block" }}
			/>
		</div>
	);
}
