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
// SHARED STYLES — all sizing via CSS custom properties set by dialog
// ============================================================
const SHARED_STYLES = `
@media print {
	@page { margin: 4mm; }
	body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
.vc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(var(--vc-col-min), 1fr)); gap: var(--vc-gap); padding: var(--vc-pad); font-size: var(--vc-font); }
.vc-card { break-inside: avoid; page-break-inside: avoid; overflow: hidden; word-break: break-word; }
.vc-qr { margin: 2px auto; display: block; }
.vc-qr-large { margin: 3px auto; display: block; }
`;

// ============================================================
// TEMPLATE 1: CLASSIC GRID
// ============================================================
export function PrintTemplate1({ data }: { data: VoucherPrintData }) {
	return (
		<div>
			<style>{`
				${SHARED_STYLES}
				.vc-grid { font-family: 'Segoe UI', Arial, sans-serif; }
				.vc-card { border: calc(var(--vc-border, 2px)) solid #222; border-radius: 8px; padding: var(--vc-pad-card-v) var(--vc-pad-card-h); text-align: center; background: #fafafa; }
				.t1-title { font-size: inherit; font-weight: 800; color: #1a1a2e; letter-spacing: 1px; margin-bottom: 0.3em; text-transform: uppercase; }
				.t1-divider { height: 2px; background: linear-gradient(90deg, transparent, #1a1a2e, transparent); margin: 0.2em 0 0.4em; }
				.t1-user { font-size: 1.3em; font-weight: 700; letter-spacing: 1.5px; color: #16213e; margin: 0.2em 0; }
				.t1-pass { font-size: 0.95em; color: #0f3460; margin: 0.1em 0; font-weight: 600; }
				.t1-meta { font-size: 0.7em; color: #555; margin-top: 0.2em; }
				.t1-meta span { display: inline-block; margin: 0 0.3em; background: #eee; padding: 0.05em 0.5em; border-radius: 3px; }
			`}</style>
			<div className="vc-grid">
				{data.users.map((u) => (
					<div key={u[".id"]} className="vc-card">
						<div className="t1-title">{data.title}</div>
						<div className="t1-divider" />
						{data.showQR && (
							<QRPlaceholder
								text={qrUrl(data.qrDomain, u.name, u.password || "")}
								size={qrSize()}
							/>
						)}
						<div className="t1-user">{u.name}</div>
						{data.showPassword && u.password && (
							<div className="t1-pass">Password: {u.password}</div>
						)}
						<div className="t1-meta">
							{u.profile && <span>{u.profile}</span>}
							{formatUptime(u["limit-uptime"]) && (
								<span>{formatUptime(u["limit-uptime"])}</span>
							)}
							{formatDataLimit(u["limit-bytes-total"]) && (
								<span>{formatDataLimit(u["limit-bytes-total"])}</span>
							)}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

// ============================================================
// TEMPLATE 2: MODERN MINIMAL
// ============================================================
export function PrintTemplate2({ data }: { data: VoucherPrintData }) {
	return (
		<div>
			<style>{`
				${SHARED_STYLES}
				.vc-grid { font-family: 'Inter', 'Segoe UI', sans-serif; }
				.vc-card { border: calc(var(--vc-border, 1px)) solid #ddd; border-radius: 12px; padding: var(--vc-pad-card-v) var(--vc-pad-card-h); text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.05); background: #fff; }
				.t2-title { font-size: inherit; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 2px; }
				.t2-user { font-size: 1.5em; font-weight: 700; color: #111; letter-spacing: 2px; margin: 0.4em 0 0.2em; }
				.t2-pass { font-size: 1em; color: #555; margin: 0.1em 0; }
				.t2-badge { display: inline-block; background: #f0f0f0; border-radius: 20px; padding: 0.1em 0.7em; font-size: 0.7em; color: #333; margin: 0.1em; }
				.t2-footer { margin-top: 0.4em; font-size: 0.6em; color: #aaa; border-top: 1px solid #eee; padding-top: 0.3em; }
			`}</style>
			<div className="vc-grid">
				{data.users.map((u) => (
					<div key={u[".id"]} className="vc-card">
						<div className="t2-title">{data.title}</div>
						{data.showQR && (
							<QRPlaceholder
								text={qrUrl(data.qrDomain, u.name, u.password || "")}
								size={qrSize()}
							/>
						)}
						<div className="t2-user">{u.name}</div>
						{data.showPassword && u.password && (
							<div className="t2-pass">{u.password}</div>
						)}
						<div>
							{u.profile && <span className="t2-badge">{u.profile}</span>}
							{formatUptime(u["limit-uptime"]) && (
								<span className="t2-badge">{formatUptime(u["limit-uptime"])}</span>
							)}
							{formatDataLimit(u["limit-bytes-total"]) && (
								<span className="t2-badge">{formatDataLimit(u["limit-bytes-total"])}</span>
							)}
						</div>
						<div className="t2-footer">
							{data.subtitle || "Hotspot Voucher"}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

// ============================================================
// TEMPLATE 3: DARK PREMIUM
// ============================================================
export function PrintTemplate3({ data }: { data: VoucherPrintData }) {
	return (
		<div>
			<style>{`
				${SHARED_STYLES}
				.vc-grid { font-family: 'Segoe UI', Arial, sans-serif; }
				.vc-card { background: #1a1a2e; border-radius: 10px; padding: var(--vc-pad-card-v) var(--vc-pad-card-h); text-align: center; color: #fff; }
				.t3-title { font-size: inherit; font-weight: 700; color: #e94560; text-transform: uppercase; letter-spacing: 2px; }
				.t3-user { font-size: 1.4em; font-weight: 700; letter-spacing: 2px; margin: 0.4em 0 0.2em; color: #fff; }
				.t3-pass { font-size: 0.95em; color: #a0a0b8; margin: 0.1em 0; }
				.t3-meta { margin-top: 0.4em; font-size: 0.7em; color: #8888aa; }
				.t3-meta span { display: inline-block; background: rgba(233,69,96,0.2); padding: 0.05em 0.6em; border-radius: 10px; margin: 0.1em; color: #e94560; }
			`}</style>
			<div className="vc-grid">
				{data.users.map((u) => (
					<div key={u[".id"]} className="vc-card">
						<div className="t3-title">{data.title}</div>
						{data.showQR && (
							<QRPlaceholder
								text={qrUrl(data.qrDomain, u.name, u.password || "")}
								size={qrSize()}
								invert
							/>
						)}
						<div className="t3-user">{u.name}</div>
						{data.showPassword && u.password && (
							<div className="t3-pass">Password: {u.password}</div>
						)}
						<div className="t3-meta">
							{u.profile && <span>{u.profile}</span>}
							{formatUptime(u["limit-uptime"]) && (
								<span>{formatUptime(u["limit-uptime"])}</span>
							)}
							{formatDataLimit(u["limit-bytes-total"]) && (
								<span>{formatDataLimit(u["limit-bytes-total"])}</span>
							)}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

// ============================================================
// TEMPLATE 4: VOUCHER STRIP
// ============================================================
export function PrintTemplate4({ data }: { data: VoucherPrintData }) {
	return (
		<div>
			<style>{`
				${SHARED_STYLES}
				.vc-grid { font-family: 'Segoe UI', Arial, sans-serif; }
				.vc-card { border: calc(var(--vc-border, 1px)) solid #ccc; border-radius: 8px; padding: var(--vc-pad-card-v) var(--vc-pad-card-h); display: flex; align-items: center; gap: var(--vc-gap); }
				.t4-body { flex: 1; }
				.t4-title { font-size: inherit; font-weight: 700; color: #999; text-transform: uppercase; letter-spacing: 1px; }
				.t4-user { font-size: 1.3em; font-weight: 700; letter-spacing: 1px; color: #111; }
				.t4-pass { font-size: 0.9em; color: #555; }
				.t4-meta { font-size: 0.65em; color: #888; margin-top: 0.1em; }
				.t4-meta span { margin-right: 0.5em; }
			`}</style>
			<div className="vc-grid">
				{data.users.map((u) => (
					<div key={u[".id"]} className="vc-card">
						{data.showQR && (
							<QRPlaceholder
								text={qrUrl(data.qrDomain, u.name, u.password || "")}
								size={qrSize()}
							/>
						)}
						<div className="t4-body">
							<div className="t4-title">{data.title}</div>
							<div className="t4-user">{u.name}</div>
							{data.showPassword && u.password && (
								<div className="t4-pass">Pass: {u.password}</div>
							)}
							<div className="t4-meta">
								{u.profile && <span>{u.profile}</span>}
								{formatUptime(u["limit-uptime"]) && (
									<span>Masa: {formatUptime(u["limit-uptime"])}</span>
								)}
								{formatDataLimit(u["limit-bytes-total"]) && (
									<span>Kuota: {formatDataLimit(u["limit-bytes-total"])}</span>
								)}
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

// ============================================================
// TEMPLATE 5: COUPON — 1 column, stays stacked
// ============================================================
export function PrintTemplate5({ data }: { data: VoucherPrintData }) {
	return (
		<div>
			<style>{`
				@media print {
					@page { margin: 4mm; }
					body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
				}
				.t5-list { display: flex; flex-direction: column; gap: 16px; padding: 16px; font-family: 'Georgia', 'Times New Roman', serif; font-size: var(--vc-font); }
				.t5-card { border: 2px solid #c9a84c; border-radius: 16px; padding: var(--vc-pad-card-v) var(--vc-pad-card-h); text-align: center; break-inside: avoid; page-break-inside: avoid; background: linear-gradient(135deg, #fefcf3, #fffdf7); box-shadow: 0 4px 16px rgba(0,0,0,0.06); position: relative; overflow: hidden; }
				.t5-card::before { content: ''; position: absolute; top: 8px; left: 8px; right: 8px; bottom: 8px; border: 1px dashed #c9a84c; border-radius: 12px; pointer-events: none; }
				.t5-title { font-size: 1.2em; font-weight: 700; color: #8b6914; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 0.2em; position: relative; z-index: 1; }
				.t5-subtitle { font-size: 0.7em; color: #b8952e; letter-spacing: 2px; margin-bottom: 0.6em; position: relative; z-index: 1; }
				.t5-divider { height: 1px; background: linear-gradient(90deg, transparent, #c9a84c, transparent); margin: 0.5em 0; position: relative; z-index: 1; }
				.t5-user { font-size: 1.8em; font-weight: 700; color: #1a1a2e; letter-spacing: 3px; margin: 0.4em 0; position: relative; z-index: 1; word-break: break-word; }
				.t5-pass { font-size: 1.1em; color: #555; margin: 0.2em 0; position: relative; z-index: 1; }
				.t5-meta { font-size: 0.75em; color: #777; margin-top: 0.5em; position: relative; z-index: 1; }
				.t5-meta span { display: inline-block; border: 1px solid #c9a84c; border-radius: 4px; padding: 0.15em 0.7em; margin: 0.15em 0.3em; color: #8b6914; }
				.t5-footer { margin-top: 0.5em; font-size: 0.6em; color: #aaa; font-style: italic; position: relative; z-index: 1; }
			`}</style>
			<div className="t5-list">
				{data.users.map((u) => (
					<div key={u[".id"]} className="t5-card">
						<div className="t5-title">{data.title}</div>
						<div className="t5-subtitle">
							{data.subtitle || "Hotspot Access"}
						</div>
						{data.showQR && (
							<QRPlaceholder
								text={qrUrl(data.qrDomain, u.name, u.password || "")}
								size={qrSize(80)}
							/>
						)}
						<div className="t5-divider" />
						<div className="t5-user">{u.name}</div>
						{data.showPassword && u.password && (
							<div className="t5-pass">{u.password}</div>
						)}
						<div className="t5-meta">
							{u.profile && <span>{u.profile}</span>}
							{formatUptime(u["limit-uptime"]) && (
								<span>{formatUptime(u["limit-uptime"])}</span>
							)}
							{formatDataLimit(u["limit-bytes-total"]) && (
								<span>{formatDataLimit(u["limit-bytes-total"])}</span>
							)}
						</div>
						<div className="t5-footer">{data.footer || "Terima kasih"}</div>
					</div>
				))}
			</div>
		</div>
	);
}

// ============================================================
// QR PLACEHOLDER
// ============================================================
function QRPlaceholder({
	text,
	size = 65,
	invert = false,
}: {
	text: string;
	size?: number;
	invert?: boolean;
}) {
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
				margin: "2px auto",
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

/** QR size in px — reads --vc-qr custom property set by dialog */
function qrSize(def = 65) {
	if (typeof document === "undefined") return def;
	const el = document.querySelector(".vc-grid") as HTMLElement | null;
	if (!el) return def;
	const px = getComputedStyle(el).getPropertyValue("--vc-qr").trim();
	return px ? Number.parseInt(px, 10) : def;
}

// ============================================================
// TEMPLATE 6: NEON
// ============================================================
export function PrintTemplate6({ data }: { data: VoucherPrintData }) {
	return (
		<div>
			<style>{`
				${SHARED_STYLES}
				.vc-grid { font-family: 'Segoe UI', Arial, sans-serif; }
				.vc-card { background: #0d1117; border-radius: 8px; padding: var(--vc-pad-card-v) var(--vc-pad-card-h); text-align: center; color: #c9d1d9; border: calc(var(--vc-border, 1px)) solid #30363d; }
				.t6-title { font-size: inherit; font-weight: 800; color: #39d0c8; letter-spacing: 2px; text-transform: uppercase; text-shadow: 0 0 4px #39d0c8; margin-bottom: 0.2em; }
				.t6-user { font-size: 1.2em; font-weight: 700; color: #ff79c6; letter-spacing: 1px; margin: 0.2em 0; text-shadow: 0 0 3px #ff79c6; }
				.t6-pass { font-size: 0.85em; color: #8b949e; margin: 0.1em 0; }
				.t6-meta { font-size: 0.65em; color: #8b949e; margin-top: 0.2em; }
				.t6-meta span { display: inline-block; background: #161b22; border: 1px solid #30363d; border-radius: 3px; padding: 0.05em 0.5em; margin: 0.1em; color: #c9d1d9; }
			`}</style>
			<div className="vc-grid">
				{data.users.map((u) => (
					<div key={u[".id"]} className="vc-card">
						<div className="t6-title">{data.title}</div>
						{data.showQR && <QRPlaceholder text={qrUrl(data.qrDomain, u.name, u.password || "")} size={qrSize()} />}
						<div className="t6-user">{u.name}</div>
						{data.showPassword && u.password && <div className="t6-pass">Pass: {u.password}</div>}
						<div className="t6-meta">
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
// TEMPLATE 7: RETRO
// ============================================================
export function PrintTemplate7({ data }: { data: VoucherPrintData }) {
	return (
		<div>
			<style>{`
				${SHARED_STYLES}
				.vc-grid { font-family: 'Courier New', 'Courier', monospace; }
				.vc-card { background: #fdf6e3; border-radius: 0; padding: var(--vc-pad-card-v) var(--vc-pad-card-h); text-align: center; color: #333; border: calc(var(--vc-border, 2px)) double #d5b47a; }
				.t7-title { font-size: inherit; font-weight: 800; color: #8b4513; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 0.2em; }
				.t7-divider { border: 0; border-top: calc(var(--vc-border, 2px)) dashed #d5b47a; margin: 0.2em 0; }
				.t7-user { font-size: 1.3em; font-weight: 700; color: #2d1b0e; letter-spacing: 2px; margin: 0.2em 0; }
				.t7-pass { font-size: 0.9em; color: #665544; margin: 0.1em 0; }
				.t7-meta { font-size: 0.65em; color: #776655; margin-top: 0.2em; }
				.t7-meta span { display: inline-block; background: #efe4c8; padding: 0.05em 0.5em; margin: 0.1em; }
			`}</style>
			<div className="vc-grid">
				{data.users.map((u) => (
					<div key={u[".id"]} className="vc-card">
						<div className="t7-title">{data.title}</div>
						<div className="t7-divider" />
						{data.showQR && <QRPlaceholder text={qrUrl(data.qrDomain, u.name, u.password || "")} size={qrSize()} />}
						<div className="t7-user">{u.name}</div>
						{data.showPassword && u.password && <div className="t7-pass">Password: {u.password}</div>}
						<div className="t7-meta">
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
// TEMPLATE 8: RETRO MODERN
// ============================================================
export function PrintTemplate8({ data }: { data: VoucherPrintData }) {
	return (
		<div>
			<style>{`
				${SHARED_STYLES}
				.vc-grid { font-family: 'Segoe UI', Arial, sans-serif; }
				.vc-card { background: #faf4ed; border-radius: 4px; padding: var(--vc-pad-card-v) var(--vc-pad-card-h); text-align: center; color: #232136; border-left: calc(var(--vc-border, 3px)) solid #d7827e; box-shadow: 2px 2px 0 rgba(0,0,0,0.06); }
				.t8-title { font-size: inherit; font-weight: 700; color: #56949f; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 0.2em; }
				.t8-user { font-size: 1.3em; font-weight: 700; color: #232136; letter-spacing: 1px; margin: 0.2em 0; }
				.t8-pass { font-size: 0.9em; color: #655a7d; margin: 0.1em 0; }
				.t8-meta { font-size: 0.65em; color: #81759b; margin-top: 0.2em; }
				.t8-meta span { display: inline-block; background: #efe1d2; border-radius: 3px; padding: 0.05em 0.5em; margin: 0.1em; color: #232136; }
				.t8-footer { margin-top: 0.3em; font-size: 0.55em; color: #aaa; border-top: 1px solid #e0d4c5; padding-top: 0.2em; }
			`}</style>
			<div className="vc-grid">
				{data.users.map((u) => (
					<div key={u[".id"]} className="vc-card">
						<div className="t8-title">{data.title}</div>
						{data.showQR && <QRPlaceholder text={qrUrl(data.qrDomain, u.name, u.password || "")} size={qrSize()} />}
						<div className="t8-user">{u.name}</div>
						{data.showPassword && u.password && <div className="t8-pass">{u.password}</div>}
						<div className="t8-meta">
							{u.profile && <span>{u.profile}</span>}
							{formatUptime(u["limit-uptime"]) && <span>{formatUptime(u["limit-uptime"])}</span>}
							{formatDataLimit(u["limit-bytes-total"]) && <span>{formatDataLimit(u["limit-bytes-total"])}</span>}
						</div>
						<div className="t8-footer">{data.subtitle || "Hotspot Voucher"}</div>
					</div>
				))}
			</div>
		</div>
	);
}

// ============================================================
// TEMPLATE 9: CYBERPUNK
// ============================================================
export function PrintTemplate9({ data }: { data: VoucherPrintData }) {
	return (
		<div>
			<style>{`
				${SHARED_STYLES}
				.vc-grid { font-family: 'Segoe UI', Arial, sans-serif; }
				.vc-card { background: #120a2b; border-radius: 0; padding: var(--vc-pad-card-v) var(--vc-pad-card-h); text-align: center; color: #e0def4; border: calc(var(--vc-border, 2px)) solid; border-image: linear-gradient(135deg, #00f5d4, #7b2d8e) 1; }
				.t9-title { font-size: inherit; font-weight: 800; color: #00f5d4; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 0.1em; }
				.t9-sub { font-size: 0.6em; color: #7b2d8e; letter-spacing: 2px; margin-bottom: 0.3em; text-transform: uppercase; }
				.t9-user { font-size: 1.3em; font-weight: 700; color: #ff6b9d; letter-spacing: 1.5px; margin: 0.2em 0; }
				.t9-pass { font-size: 0.85em; color: #c0bae9; margin: 0.1em 0; }
				.t9-meta { font-size: 0.65em; color: #937bd3; margin-top: 0.2em; }
				.t9-meta span { display: inline-block; background: rgba(123,45,142,0.2); border: 1px solid #7b2d8e; padding: 0.05em 0.5em; margin: 0.1em; color: #00f5d4; }
			`}</style>
			<div className="vc-grid">
				{data.users.map((u) => (
					<div key={u[".id"]} className="vc-card">
						<div className="t9-title">{data.title}</div>
						<div className="t9-sub">{data.subtitle || "ACCESS TOKEN"}</div>
						{data.showQR && <QRPlaceholder text={qrUrl(data.qrDomain, u.name, u.password || "")} size={qrSize()} />}
						<div className="t9-user">{u.name}</div>
						{data.showPassword && u.password && <div className="t9-pass">// Pass: {u.password}</div>}
						<div className="t9-meta">
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
