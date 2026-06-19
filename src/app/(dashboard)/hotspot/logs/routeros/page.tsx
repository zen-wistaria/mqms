"use client";

import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

interface RouterOSLogEntry {
	time: string;
	user: string;
	ip: string;
	message: string;
	topics: string;
}

export default function HotspotRouterOSLogPage() {
	const [routerId, setRouterId] = useState<string>("");
	const [search, setSearch] = useState("");
	const scrollRef = useRef<HTMLDivElement>(null);
	const [autoScroll, setAutoScroll] = useState(true);

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

	const { data: logs = [], isLoading } = useQuery({
		queryKey: ["hotspotRouterOSLogs", routerId],
		queryFn: async () => {
			const res = await fetch(
				`/api/hotspot/logs/routeros?routerId=${routerId}&search=${encodeURIComponent(search)}&limit=500`,
			);
			if (!res.ok) {
				if (res.status === 501)
					throw new Error("RouterOS /log endpoint not available");
				throw new Error("Failed to fetch RouterOS logs");
			}
			return res.json() as Promise<RouterOSLogEntry[]>;
		},
		enabled: !!routerId,
		refetchInterval: 30000,
	});

	const filtered = (logs as RouterOSLogEntry[]).filter((entry) => {
		if (!search) return true;
		const q = search.toLowerCase();
		return (
			entry.message.toLowerCase().includes(q) ||
			entry.user.toLowerCase().includes(q) ||
			entry.ip.toLowerCase().includes(q) ||
			entry.topics.toLowerCase().includes(q)
		);
	});

	// Auto-scroll ke bawah saat data baru masuk
	useEffect(() => {
		if (autoScroll && scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [autoScroll]);

	const handleScroll = () => {
		if (!scrollRef.current) return;
		const el = scrollRef.current;
		const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
		setAutoScroll(atBottom);
	};

	// Parse message type
	const isCustomLog = (msg: string) =>
		msg.toLowerCase().startsWith("user-hotspot");
	const stripPrefix = (msg: string) => {
		if (isCustomLog(msg)) return msg.slice("user-hotspot: ".length);
		return msg;
	};

	if (!routerId) {
		return <div className="p-4 text-muted-foreground">Pilih router dulu.</div>;
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-2">
				<div className="relative w-full max-w-sm">
					<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
					<Input
						type="text"
						placeholder="Cari log..."
						className="pl-8"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>
				</div>
				<div className="text-xs text-muted-foreground">
					{isLoading ? "Loading..." : `${filtered.length} entries`}
				</div>
				{!autoScroll && (
					<button
						type="button"
						className="text-xs text-primary underline cursor-pointer"
						onClick={() => {
							setAutoScroll(true);
							if (scrollRef.current)
								scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
						}}
					>
						Scroll to bottom
					</button>
				)}
			</div>

			{isLoading ? (
				<div className="rounded-md border p-8 text-center text-muted-foreground">
					Loading logs from RouterOS...
				</div>
			) : filtered.length === 0 ? (
				<div className="rounded-md border p-8 text-center text-muted-foreground">
					Tidak ada log atau endpoint /log tidak tersedia di RouterOS versi ini.
				</div>
			) : (
				<div
					ref={scrollRef}
					onScroll={handleScroll}
					className="rounded-md border bg-background font-mono text-xs overflow-y-auto"
					style={{ height: "70vh", maxHeight: "700px" }}
				>
					{filtered.map((entry, i) => {
						const isCustom = isCustomLog(entry.message);
						const msg = stripPrefix(entry.message);
						const [prefix, ...rest] = msg.split(",");
						const details = rest.join(",").trim();

						return (
							<div
								key={i}
								className={`flex items-start gap-3 px-4 py-1.5 border-b border-border/40 hover:bg-muted/30 ${
									isCustom ? "bg-primary/5" : ""
								}`}
							>
								<span className="text-muted-foreground whitespace-nowrap shrink-0">
									{entry.time || "-"}
								</span>
								{isCustom ? (
									<>
										<span className="font-semibold text-foreground shrink-0 w-32 truncate">
											{prefix
												.replace("login", "")
												.replace("logout", "")
												.trim() || prefix}
										</span>
										<span className="text-muted-foreground truncate">
											{details}
										</span>
									</>
								) : (
									<>
										<span className="text-muted-foreground shrink-0 truncate">
											{entry.user || "-"}
										</span>
										<span className="text-muted-foreground shrink-0 truncate">
											{entry.ip || "-"}
										</span>
										<span className="text-foreground truncate">
											{entry.message}
										</span>
									</>
								)}
							</div>
						);
					})}
				</div>
			)}

			<div className="flex items-center gap-3 text-xs text-muted-foreground">
				<span>Auto-refresh setiap 30 detik</span>
				<RefreshCw className="h-3 w-3 animate-spin" />
				<span className="ml-auto">
					{isCustomLog(filtered[0]?.message || "")
						? "user-hotspot log"
						: "RouterOS hotspot log"}
				</span>
			</div>
		</div>
	);
}
