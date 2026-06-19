"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Copy,
	Download,
	Play,
	Plus,
	PowerOff,
	Shield,
	Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

interface VpnStatus {
	initialized: boolean;
	running: boolean;
	config?: {
		publicKey: string;
		address: string;
		port: number;
		mtu: number;
		dns: string;
		nextIp: number;
	};
	peers: Array<{
		publicKey: string;
		transferRx: string;
		transferTx: string;
		latestHandshake: string | null;
	}>;
}

interface ApiPeer {
	id: string;
	name: string;
	enabled: boolean;
	privateKey: string;
	publicKey: string;
	presharedKey: string | null;
	address: string;
	allowedIPs: string;
	comment: string | null;
	transferRx: string;
	transferTx: string;
	latestHandshakeAt: string | null;
	persistentKeepalive: number;
}

export default function VpnPage() {
	const queryClient = useQueryClient();
	const [endpointHost, setEndpointHost] = useState("vpn.example.com");
	const [addOpen, setAddOpen] = useState(false);
	const [addName, setAddName] = useState("");
	const [addComment, setAddComment] = useState("");
	const [deletePeer, setDeletePeer] = useState<ApiPeer | null>(null);
	const [showInit, setShowInit] = useState(false);
	const [configPeer, setConfigPeer] = useState<ApiPeer | null>(null);
	const [copiedStep, setCopiedStep] = useState<string | null>(null);

	useEffect(() => {
		setEndpointHost(window.location.hostname);
	}, []);

	const { data: status, isLoading } = useQuery({
		queryKey: ["vpnStatus"],
		queryFn: async () => {
			const res = await fetch("/api/vpn/config");
			if (!res.ok) throw new Error("Failed to fetch VPN status");
			return res.json() as Promise<VpnStatus>;
		},
		refetchInterval: 5000,
	});

	const { data: peers = [] } = useQuery({
		queryKey: ["vpnPeers"],
		queryFn: async () => {
			const res = await fetch("/api/vpn/peers");
			if (!res.ok) throw new Error("Failed to fetch peers");
			return res.json() as Promise<ApiPeer[]>;
		},
		refetchInterval: 5000,
	});

	const initMutation = useMutation({
		mutationFn: async () => {
			const res = await fetch("/api/vpn/config", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({}),
			});
			if (!res.ok) {
				const d = await res.json();
				throw new Error(d.error || "Failed to init");
			}
			return res.json();
		},
		onSuccess: () => {
			toast.success("WireGuard initialized");
			queryClient.invalidateQueries({ queryKey: ["vpnStatus"] });
			setShowInit(false);
		},
		onError: (error: any) => {
			toast.error(error.message || "Gagal init");
		},
	});

	const startMutation = useMutation({
		mutationFn: async () => {
			const res = await fetch("/api/vpn/config/start", { method: "POST" });
			if (!res.ok) {
				const d = await res.json();
				throw new Error(d.error || "Failed to start");
			}
			return res.json();
		},
		onSuccess: () => {
			toast.success("WireGuard started");
			queryClient.invalidateQueries({ queryKey: ["vpnStatus"] });
		},
		onError: (error: any) => {
			toast.error(error.message || "Gagal start");
		},
	});

	const stopMutation = useMutation({
		mutationFn: async () => {
			const res = await fetch("/api/vpn/config/stop", { method: "POST" });
			if (!res.ok) {
				const d = await res.json();
				throw new Error(d.error || "Failed to stop");
			}
			return res.json();
		},
		onSuccess: () => {
			toast.success("WireGuard stopped");
			queryClient.invalidateQueries({ queryKey: ["vpnStatus"] });
		},
		onError: (error: any) => {
			toast.error(error.message || "Gagal stop");
		},
	});

	const addMutation = useMutation({
		mutationFn: async () => {
			const res = await fetch("/api/vpn/peers", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: addName, comment: addComment }),
			});
			if (!res.ok) {
				const d = await res.json();
				throw new Error(d.error || "Failed to add peer");
			}
			return res.json();
		},
		onSuccess: () => {
			toast.success("Peer berhasil ditambah");
			queryClient.invalidateQueries({ queryKey: ["vpnPeers"] });
			queryClient.invalidateQueries({ queryKey: ["vpnStatus"] });
			setAddOpen(false);
			setAddName("");
			setAddComment("");
		},
		onError: (error: any) => {
			toast.error(error.message || "Gagal tambah peer");
		},
	});

	const deleteMutation = useMutation({
		mutationFn: async (id: string) => {
			const res = await fetch(`/api/vpn/peers/${id}`, { method: "DELETE" });
			if (!res.ok) {
				const d = await res.json();
				throw new Error(d.error || "Failed to delete");
			}
			return res.json();
		},
		onSuccess: () => {
			toast.success("Peer dihapus");
			queryClient.invalidateQueries({ queryKey: ["vpnPeers"] });
			queryClient.invalidateQueries({ queryKey: ["vpnStatus"] });
			setDeletePeer(null);
		},
		onError: (error: any) => {
			toast.error(error.message || "Gagal hapus");
			setDeletePeer(null);
		},
	});

	const downloadConfig = (peer: ApiPeer) => {
		const url = `/api/vpn/peers/${peer.id}/config?endpoint=${encodeURIComponent(endpointHost)}`;
		window.open(url, "_blank");
	};

	const generateMikrotikConfig = (peer: ApiPeer) => {
		const mtu = status?.config?.mtu || 1420;
		const serverAddress = status?.config?.address || "10.0.0.1/24";
		const serverIp = serverAddress.split("/")[0]; // "10.0.0.1"
		const serverPubkey = status?.config?.publicKey || "";
		const clientPort = 44000 + Math.floor(Math.random() * 1000); // random client listen port

		return [
			{
				label: "IP Address",
				cmd: `/ip address add address=${peer.address} disabled=no interface=mqms0 network=${serverIp}`,
			},
			{
				label: "Interface",
				cmd: `/interface wireguard add listen-port=${clientPort} mtu=${mtu} name=mqms0 private-key="${peer.privateKey}"`,
			},
			{
				label: "Peer",
				cmd: `/interface wireguard peers add allowed-address=${serverIp}/32 endpoint-address=${endpointHost} endpoint-port=${status?.config?.port || 51820} interface=mqms0 name=${peer.name} persistent-keepalive=${peer.persistentKeepalive}s public-key="${serverPubkey}"${peer.presharedKey ? ` preshared-key="${peer.presharedKey}"` : ""}`,
			},
		];
	};

	const copyConfigStep = async (text: string, label: string) => {
		await navigator.clipboard.writeText(text);
		setCopiedStep(label);
		toast.success(`${label} copied`);
		setTimeout(() => setCopiedStep(null), 2000);
	};

	const copyAllConfig = async (peer: ApiPeer) => {
		const steps = generateMikrotikConfig(peer);
		const full = steps.map((s) => s.cmd).join("\n");
		await navigator.clipboard.writeText(full);
		setCopiedStep("all");
		toast.success("All commands copied");
		setTimeout(() => setCopiedStep(null), 2000);
	};

	const formatBytes = (val: string) => {
		const num = Number(val);
		if (num === 0) return "0 B";
		const units = ["B", "KB", "MB", "GB"];
		const k = 1024;
		const i = Math.floor(Math.log(num) / Math.log(k));
		return `${(num / k ** i).toFixed(1)} ${units[i]}`;
	};

	const formatHandshake = (iso: string | null) => {
		if (!iso) return "Never";
		const diff = Date.now() - new Date(iso).getTime();
		if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
		if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
		return `${Math.floor(diff / 3600000)}h ago`;
	};

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-start">
				<div>
					<h2 className="text-2xl font-bold tracking-tight">VPN WireGuard</h2>
					<p className="text-muted-foreground">
						Kelola koneksi VPN untuk akses MikroTik dari jarak jauh
					</p>
				</div>
			</div>

			{/* Status + Server Info */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<div className="rounded-lg border p-4">
					<p className="text-sm text-muted-foreground">Status</p>
					<div className="flex items-center gap-2 mt-1">
						{isLoading ? (
							<span className="text-sm">Loading...</span>
						) : !status?.initialized ? (
							<Badge variant="secondary">Not configured</Badge>
						) : status.running ? (
							<>
								<span className="h-2 w-2 rounded-full bg-green-500" />
								<span className="font-semibold text-green-500">Running</span>
							</>
						) : (
							<>
								<span className="h-2 w-2 rounded-full bg-red-500" />
								<span className="font-semibold text-red-500">Stopped</span>
							</>
						)}
					</div>
				</div>
				<div className="rounded-lg border p-4">
					<p className="text-sm text-muted-foreground">Public Key</p>
					<p className="font-mono text-xs truncate mt-1">
						{status?.config?.publicKey || "-"}
					</p>
				</div>
				<div className="rounded-lg border p-4">
					<p className="text-sm text-muted-foreground">Server Address</p>
					<p className="font-mono font-medium mt-1">
						{status?.config?.address || "-"}
					</p>
				</div>
				<div className="rounded-lg border p-4">
					<p className="text-sm text-muted-foreground">Port</p>
					<p className="font-mono font-medium mt-1">
						{status?.config?.port || "-"}
					</p>
				</div>
			</div>

			{/* Actions */}
			{status?.initialized ? (
				<div className="flex flex-wrap gap-2">
					{status.running ? (
						<Button
							variant="destructive"
							onClick={() => stopMutation.mutate()}
							disabled={stopMutation.isPending}
						>
							<PowerOff className="mr-2 h-4 w-4" /> Stop
						</Button>
					) : (
						<Button
							onClick={() => startMutation.mutate()}
							disabled={startMutation.isPending}
						>
							<Play className="mr-2 h-4 w-4" /> Start
						</Button>
					)}
					<Button variant="outline" onClick={() => setAddOpen(true)}>
						<Plus className="mr-2 h-4 w-4" /> Tambah Peer
					</Button>
					{status.config?.publicKey && (
						<Button
							variant="ghost"
							className="cursor-pointer"
							onClick={async () => {
								await navigator.clipboard.writeText(status.config!.publicKey);
								toast.success("Public key copied");
							}}
						>
							<Copy className="mr-2 h-4 w-4" /> Copy Public Key
						</Button>
					)}
				</div>
			) : (
				<div className="rounded-lg border border-dashed p-8 text-center">
					<Shield className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
					<p className="text-muted-foreground mb-4">
						WireGuard belum diinisialisasi. Generate server keys untuk memulai.
					</p>
					<Button
						onClick={() => setShowInit(true)}
						disabled={initMutation.isPending}
					>
						{initMutation.isPending
							? "Initializing..."
							: "Initialize WireGuard"}
					</Button>
				</div>
			)}

			{/* Peer Table */}
			<div>
				<h3 className="text-lg font-semibold mb-3">Peers ({peers.length})</h3>
				<div className="rounded-md border overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Address</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Handshake</TableHead>
								<TableHead>RX</TableHead>
								<TableHead>TX</TableHead>
								<TableHead>Comment</TableHead>
								<TableHead className="w-[100px]">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{peers.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={8}
										className="text-center py-8 text-muted-foreground"
									>
										Belum ada peer. Tambah peer untuk mulai.
									</TableCell>
								</TableRow>
							) : (
								peers.map((peer) => (
									<TableRow key={peer.id}>
										<TableCell className="font-medium">{peer.name}</TableCell>
										<TableCell className="font-mono text-xs">
											{peer.address}
										</TableCell>
										<TableCell>
											{peer.enabled ? (
												<Badge
													variant="outline"
													className="border-green-500/30 text-green-500"
												>
													Active
												</Badge>
											) : (
												<Badge variant="secondary">Disabled</Badge>
											)}
										</TableCell>
										<TableCell className="text-xs text-muted-foreground">
											{formatHandshake(peer.latestHandshakeAt)}
										</TableCell>
										<TableCell className="text-xs font-mono">
											{formatBytes(peer.transferRx)}
										</TableCell>
										<TableCell className="text-xs font-mono">
											{formatBytes(peer.transferTx)}
										</TableCell>
										<TableCell className="text-xs text-muted-foreground truncate max-w-[120px]">
											{peer.comment || "-"}
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-1">
												<Button
													variant="ghost"
													size="icon"
													onClick={() => downloadConfig(peer)}
													title="Download Config"
												>
													<Download className="h-4 w-4" />
												</Button>
												<Button
													variant="ghost"
													size="icon"
													className="cursor-pointer"
													onClick={() => setConfigPeer(peer)}
													title="Copy MikroTik Config"
												>
													<Copy className="h-4 w-4" />
												</Button>
												<Button
													variant="ghost"
													size="icon"
													onClick={() => setDeletePeer(peer)}
													title="Delete"
												>
													<Trash2 className="h-4 w-4 text-destructive" />
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</div>
			</div>

			{/* Endpoint config */}
			<div className="text-xs text-muted-foreground">
				Endpoint: <span className="font-mono">{endpointHost}</span>:
				{status?.config?.port || 51820}
			</div>

			{/* Config modal */}
			<Dialog
				open={!!configPeer}
				onOpenChange={(open) => {
					if (!open) {
						setConfigPeer(null);
						setCopiedStep(null);
					}
				}}
			>
				<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>MikroTik Config — {configPeer?.name}</DialogTitle>
					</DialogHeader>
					{configPeer && (
						<div className="space-y-4 py-4">
							<p className="text-sm text-muted-foreground">
								Paste perintah berikut di terminal MikroTik untuk konfigurasi
								WireGuard peer.
							</p>

							{generateMikrotikConfig(configPeer).map((step, i) => (
								<div key={i} className="space-y-1.5">
									<Label className="text-xs text-muted-foreground">
										{step.label}
									</Label>
									<div className="relative group">
										<pre className="bg-muted rounded-md p-3 pr-10 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
											{step.cmd}
										</pre>
										<button
											type="button"
											className={`cursor-pointer absolute top-2 right-2 p-1.5 rounded-md transition-all duration-200 ${
												copiedStep === step.label
													? "bg-green-500/20 scale-110"
													: "bg-background/80 opacity-0 group-hover:opacity-100 hover:bg-background"
											}`}
											onClick={() => copyConfigStep(step.cmd, step.label)}
											title="Copy"
										>
											{copiedStep === step.label ? (
												<svg
													className="h-4 w-4 text-green-500"
													fill="none"
													viewBox="0 0 24 24"
													stroke="currentColor"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M5 13l4 4L19 7"
													/>
												</svg>
											) : (
												<Copy className="h-4 w-4" />
											)}
										</button>
									</div>
								</div>
							))}

							<Button
								className="w-full cursor-pointer transition-all duration-200"
								variant={copiedStep === "all" ? "default" : "outline"}
								onClick={() => copyAllConfig(configPeer)}
							>
								{copiedStep === "all" ? (
									<>
										<svg
											className="h-4 w-4 mr-2 text-green-500"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M5 13l4 4L19 7"
											/>
										</svg>{" "}
										Copied!
									</>
								) : (
									<>
										<Copy className="mr-2 h-4 w-4" /> Copy All Commands
									</>
								)}
							</Button>
						</div>
					)}
				</DialogContent>
			</Dialog>

			{/* Init confirm */}
			{showInit && (
				<ConfirmModal
					open
					onClose={() => setShowInit(false)}
					onConfirm={() => initMutation.mutate()}
					title="Initialize WireGuard"
					message="Generate server keypair dan siapkan konfigurasi WireGuard? Ini hanya dilakukan sekali."
					confirmLabel="Initialize"
					variant="default"
					isLoading={initMutation.isPending}
				/>
			)}

			{/* Add peer dialog */}
			<Dialog
				open={addOpen}
				onOpenChange={(open) => {
					if (!open) setAddOpen(false);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Tambah Peer</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label>Nama</Label>
							<Input
								value={addName}
								onChange={(e) => setAddName(e.target.value)}
								placeholder="Nama peer / device"
							/>
						</div>
						<div className="space-y-2">
							<Label>Comment (opsional)</Label>
							<Input
								value={addComment}
								onChange={(e) => setAddComment(e.target.value)}
								placeholder="Lokasi atau deskripsi"
							/>
						</div>
						<Button
							className="w-full"
							onClick={() => addMutation.mutate()}
							disabled={addMutation.isPending || !addName.trim()}
						>
							{addMutation.isPending ? "Menambah..." : "Tambah Peer"}
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			{/* Delete confirm */}
			{deletePeer && (
				<ConfirmModal
					open
					onClose={() => setDeletePeer(null)}
					onConfirm={() => deleteMutation.mutate(deletePeer.id)}
					title="Hapus Peer"
					message={`Yakin ingin menghapus peer "${deletePeer.name}"?`}
					confirmLabel="Hapus"
					variant="destructive"
					isLoading={deleteMutation.isPending}
				/>
			)}
		</div>
	);
}
