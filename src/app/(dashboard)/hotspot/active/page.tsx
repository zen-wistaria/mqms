"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { formatBytes } from "@/lib/format";

export default function HotspotActivePage() {
	const queryClient = useQueryClient();
	const [routerId, setRouterId] = useState<string>("");
	const [search, setSearch] = useState("");
	const [disconnect, setDisconnect] = useState<{
		id: string;
		user: string;
	} | null>(null);

	useEffect(() => {
		const saved = localStorage.getItem("hotspot_router_id");
		if (saved) setRouterId(saved);

		const handleRouterChange = () => {
			setRouterId(localStorage.getItem("hotspot_router_id") || "");
		};

		window.addEventListener("hotspotRouterChanged", handleRouterChange);
		return () =>
			window.removeEventListener("hotspotRouterChanged", handleRouterChange);
	}, []);

	const { data: active = [], isLoading } = useQuery({
		queryKey: ["hotspotActive", routerId],
		queryFn: async () => {
			const res = await fetch(`/api/hotspot/active?routerId=${routerId}`);
			if (!res.ok) throw new Error("Failed to fetch active sessions");
			return res.json();
		},
		enabled: !!routerId,
		refetchInterval: 15000,
	});

	const disconnectMutation = useMutation({
		mutationFn: async (id: string) => {
			const res = await fetch(
				`/api/hotspot/active?routerId=${routerId}&id=${encodeURIComponent(id)}`,
				{ method: "DELETE" },
			);
			if (!res.ok) throw new Error("Failed to disconnect session");
			return res.json();
		},
		onSuccess: () => {
			toast.success("Session diputuskan");
			queryClient.invalidateQueries({ queryKey: ["hotspotActive", routerId] });
			setDisconnect(null);
		},
		onError: (error: any) => {
			toast.error(error.message || "Gagal putuskan session");
			setDisconnect(null);
		},
	});

	const filteredActive = (active as any[]).filter(
		(a) =>
			(a.user && a.user.toLowerCase().includes(search.toLowerCase())) ||
			(a.address && a.address.includes(search)),
	);

	if (!routerId) {
		return <div className="p-4 text-muted-foreground">Pilih router dulu.</div>;
	}

	return (
		<>
			<div className="space-y-4">
				<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
					<div className="relative w-full max-w-sm">
						<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
						<Input
							type="text"
							placeholder="Cari user atau IP..."
							className="pl-8"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
					</div>
					<Badge variant="outline" className="text-sm px-3 py-1">
						{(active as any[]).length || 0} session aktif
					</Badge>
				</div>

				<div className="rounded-md border overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Server</TableHead>
								<TableHead>User</TableHead>
								<TableHead>Address</TableHead>
								<TableHead>MAC Address</TableHead>
								<TableHead>Uptime</TableHead>
								<TableHead>Bytes In/Out</TableHead>
								<TableHead className="w-[80px]">Action</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{isLoading ? (
								<TableRow>
									<TableCell colSpan={7} className="text-center py-8">
										Loading sessions...
									</TableCell>
								</TableRow>
							) : filteredActive.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={7}
										className="text-center py-8 text-muted-foreground"
									>
										Tidak ada session aktif.
									</TableCell>
								</TableRow>
							) : (
								filteredActive.map((session: any) => (
									<TableRow key={session[".id"]}>
										<TableCell>{session.server}</TableCell>
										<TableCell className="font-medium">
											{session.user}
										</TableCell>
										<TableCell>{session.address}</TableCell>
										<TableCell className="font-mono text-xs">
											{session["mac-address"]}
										</TableCell>
										<TableCell>{session.uptime}</TableCell>
										<TableCell className="text-xs text-muted-foreground">
											{formatBytes(Number(session["bytes-in"]) || 0)} /{" "}
											{formatBytes(Number(session["bytes-out"]) || 0)}
										</TableCell>
										<TableCell>
											<Button
												variant="ghost"
												size="icon"
												onClick={() =>
													setDisconnect({
														id: session[".id"],
														user: session.user,
													})
												}
											>
												<LogOut className="h-4 w-4 text-destructive" />
											</Button>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</div>
			</div>

			{disconnect && (
				<ConfirmModal
					open
					onClose={() => setDisconnect(null)}
					onConfirm={() => disconnectMutation.mutate(disconnect.id)}
					title="Putuskan Session"
					message={`Yakin ingin memutuskan session user "${disconnect.user}"?`}
					confirmLabel="Putuskan"
					variant="destructive"
					isLoading={disconnectMutation.isPending}
				/>
			)}
		</>
	);
}
