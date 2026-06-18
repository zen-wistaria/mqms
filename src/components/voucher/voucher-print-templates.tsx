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
	batchComment?: string;
}

function formatUptime(uptime?: string) {
	if (!uptime || uptime === "0") return "";
	// Convert MikroTik time (1d, 2h, 30m) to readable
	return uptime;
}

function formatDataLimit(bytes?: string) {
	if (!bytes || bytes === "0") return "";
	return formatBytes(Number(bytes));
}

// ============================================================
// Template: 10 voucher per page (Mikhmon "Kecil" style)
// ============================================================
export function PrintTemplateKecil({ data }: { data: VoucherPrintData }) {
	const { users, title } = data;
	return (
		<div className="print-template-kecil">
			<style>{`
				@media print {
					@page { margin: 8mm; size: A4; }
					body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
				}
				.print-template-kecil {
					display: grid;
					grid-template-columns: repeat(3, 1fr);
					gap: 6px;
					padding: 4px;
					font-family: 'Courier New', monospace;
				}
				.voucher-card-kecil {
					border: 1.5px dashed #000;
					padding: 6px 8px;
					text-align: center;
					font-size: 10px;
					line-height: 1.3;
					break-inside: avoid;
					page-break-inside: avoid;
				}
				.voucher-title-kecil {
					font-size: 12px;
					font-weight: bold;
					border-bottom: 1px solid #000;
					margin-bottom: 4px;
					padding-bottom: 2px;
					text-transform: uppercase;
				}
				.voucher-user-kecil {
					font-size: 14px;
					font-weight: bold;
					letter-spacing: 1px;
					margin: 2px 0;
				}
				.voucher-pass-kecil {
					font-size: 11px;
					margin: 2px 0;
				}
				.voucher-meta-kecil {
					font-size: 8px;
					color: #333;
				}
			`}</style>
			{users.map((u) => (
				<div key={u[".id"]} className="voucher-card-kecil">
					<div className="voucher-title-kecil">{title}</div>
					<div className="voucher-user-kecil">User: {u.name}</div>
					{data.showPassword && u.password && (
						<div className="voucher-pass-kecil">Pass: {u.password}</div>
					)}
					<div className="voucher-meta-kecil">
						{u.profile && <div>Profile: {u.profile}</div>}
						{formatUptime(u["limit-uptime"]) && (
							<div>Masa: {formatUptime(u["limit-uptime"])}</div>
						)}
						{formatDataLimit(u["limit-bytes-total"]) && (
							<div>Kuota: {formatDataLimit(u["limit-bytes-total"])}</div>
						)}
					</div>
				</div>
			))}
		</div>
	);
}

// ============================================================
// Template: 4 voucher per page (Mikhmon "Sedang" style — 2x2)
// ============================================================
export function PrintTemplateSedang({ data }: { data: VoucherPrintData }) {
	const { users, title } = data;
	return (
		<div className="print-template-sedang">
			<style>{`
				@media print {
					@page { margin: 10mm; size: A4; }
					body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
				}
				.print-template-sedang {
					display: grid;
					grid-template-columns: repeat(2, 1fr);
					gap: 10px;
					padding: 8px;
					font-family: 'Courier New', monospace;
				}
				.voucher-card-sedang {
					border: 2px dashed #000;
					padding: 12px 16px;
					text-align: center;
					break-inside: avoid;
					page-break-inside: avoid;
					border-radius: 4px;
				}
				.voucher-title-sedang {
					font-size: 16px;
					font-weight: bold;
					border-bottom: 2px solid #000;
					margin-bottom: 8px;
					padding-bottom: 4px;
					text-transform: uppercase;
				}
				.voucher-user-sedang {
					font-size: 20px;
					font-weight: bold;
					letter-spacing: 2px;
					margin: 6px 0;
				}
				.voucher-pass-sedang {
					font-size: 16px;
					margin: 4px 0;
				}
				.voucher-meta-sedang {
					font-size: 10px;
					color: #444;
					margin-top: 6px;
				}
				.voucher-meta-sedang div {
					display: inline-block;
					margin: 0 6px;
				}
			`}</style>
			{users.map((u) => (
				<div key={u[".id"]} className="voucher-card-sedang">
					<div className="voucher-title-sedang">{title}</div>
					<div className="voucher-user-sedang">{u.name}</div>
					{data.showPassword && u.password && (
						<div className="voucher-pass-sedang">Password: {u.password}</div>
					)}
					<div className="voucher-meta-sedang">
						{u.profile && <span>Profile: {u.profile}</span>}
						{formatUptime(u["limit-uptime"]) && (
							<span>| Masa: {formatUptime(u["limit-uptime"])}</span>
						)}
						{formatDataLimit(u["limit-bytes-total"]) && (
							<span>| Kuota: {formatDataLimit(u["limit-bytes-total"])}</span>
						)}
					</div>
				</div>
			))}
		</div>
	);
}

// ============================================================
// Template: 2 voucher per page (Mikhmon "Besar" style)
// ============================================================
export function PrintTemplateBesar({ data }: { data: VoucherPrintData }) {
	const { users, title } = data;
	return (
		<div className="print-template-besar">
			<style>{`
				@media print {
					@page { margin: 12mm; size: A4; }
					body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
				}
				.print-template-besar {
					display: flex;
					flex-direction: column;
					gap: 20px;
					padding: 12px;
					font-family: 'Courier New', monospace;
				}
				.voucher-card-besar {
					border: 2px solid #000;
					padding: 24px 32px;
					text-align: center;
					break-inside: avoid;
					page-break-inside: avoid;
					min-height: 250px;
					display: flex;
					flex-direction: column;
					justify-content: center;
				}
				.voucher-title-besar {
					font-size: 22px;
					font-weight: bold;
					border-bottom: 2px solid #000;
					margin-bottom: 12px;
					padding-bottom: 8px;
					text-transform: uppercase;
				}
				.voucher-user-besar {
					font-size: 28px;
					font-weight: bold;
					letter-spacing: 3px;
					margin: 12px 0;
				}
				.voucher-pass-besar {
					font-size: 22px;
					margin: 8px 0;
				}
				.voucher-meta-besar {
					font-size: 13px;
					color: #444;
					margin-top: 10px;
				}
				.voucher-meta-besar div {
					margin: 2px 0;
				}
			`}</style>
			{users.map((u) => (
				<div key={u[".id"]} className="voucher-card-besar">
					<div className="voucher-title-besar">{title}</div>
					<div className="voucher-user-besar">{u.name}</div>
					{data.showPassword && u.password && (
						<div className="voucher-pass-besar">Password: {u.password}</div>
					)}
					<div className="voucher-meta-besar">
						{u.profile && <div>Profile: {u.profile}</div>}
						{formatUptime(u["limit-uptime"]) && (
							<div>Time Limit: {formatUptime(u["limit-uptime"])}</div>
						)}
						{formatDataLimit(u["limit-bytes-total"]) && (
							<div>Data Limit: {formatDataLimit(u["limit-bytes-total"])}</div>
						)}
					</div>
				</div>
			))}
		</div>
	);
}

// ============================================================
// Template: Struk / continuous roll style
// ============================================================
export function PrintTemplateStruk({ data }: { data: VoucherPrintData }) {
	const { users, title } = data;
	return (
		<div className="print-template-struk">
			<style>{`
				@media print {
					@page { margin: 0; }
					body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
				}
				.print-template-struk {
					padding: 8px;
					font-family: 'Courier New', monospace;
					max-width: 300px;
					margin: 0 auto;
				}
				.voucher-card-struk {
					border: 1px dashed #000;
					padding: 16px;
					text-align: center;
					margin-bottom: 12px;
					break-inside: avoid;
					page-break-inside: avoid;
				}
				.voucher-title-struk {
					font-size: 14px;
					font-weight: bold;
					border-bottom: 1px dashed #000;
					margin-bottom: 8px;
					padding-bottom: 4px;
					text-transform: uppercase;
				}
				.voucher-user-struk {
					font-size: 24px;
					font-weight: bold;
					letter-spacing: 3px;
					margin: 8px 0;
				}
				.voucher-pass-struk {
					font-size: 18px;
					margin: 6px 0;
				}
				.voucher-meta-struk {
					font-size: 11px;
					color: #555;
					margin-top: 8px;
				}
			`}</style>
			{users.map((u) => (
				<div key={u[".id"]} className="voucher-card-struk">
					<div className="voucher-title-struk">{title}</div>
					<div className="voucher-user-struk">{u.name}</div>
					{data.showPassword && u.password && (
						<div className="voucher-pass-struk">Pass: {u.password}</div>
					)}
					<div className="voucher-meta-struk">
						{u.profile && <div>Profile: {u.profile}</div>}
						{formatUptime(u["limit-uptime"]) && (
							<div>Masa: {formatUptime(u["limit-uptime"])}</div>
						)}
						{formatDataLimit(u["limit-bytes-total"]) && (
							<div>Kuota: {formatDataLimit(u["limit-bytes-total"])}</div>
						)}
					</div>
				</div>
			))}
		</div>
	);
}
