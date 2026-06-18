"use client";

import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

export default function HotspotProfilesPage() {
	const [routerId, setRouterId] = useState<string>("");
	const [search, setSearch] = useState("");

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

	const { data: profiles = [], isLoading } = useQuery({
		queryKey: ["hotspotProfiles", routerId],
		queryFn: async () => {
			const res = await fetch(`/api/hotspot/profiles?routerId=${routerId}`);
			if (!res.ok) throw new Error("Failed to fetch profiles");
			return res.json();
		},
		enabled: !!routerId,
	});

	const filteredProfiles = profiles.filter(
		(p: any) => p.name && p.name.toLowerCase().includes(search.toLowerCase()),
	);

	if (!routerId) {
		return (
			<div className="p-4 text-muted-foreground">Please select a router.</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<div className="relative w-full max-w-sm">
					<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
					<Input
						type="text"
						placeholder="Search profile..."
						className="pl-8"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>
				</div>
			</div>

			<div className="rounded-md border overflow-x-auto">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Shared Users</TableHead>
							<TableHead>Rate Limit (rx/tx)</TableHead>
							<TableHead>MAC Cookie</TableHead>
							<TableHead>Address Pool</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							<TableRow>
								<TableCell colSpan={5} className="text-center py-8">
									Loading profiles...
								</TableCell>
							</TableRow>
						) : filteredProfiles.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={5}
									className="text-center py-8 text-muted-foreground"
								>
									No profiles found.
								</TableCell>
							</TableRow>
						) : (
							filteredProfiles.map((profile: any) => (
								<TableRow key={profile[".id"]}>
									<TableCell className="font-medium">{profile.name}</TableCell>
									<TableCell>{profile["shared-users"] || "1"}</TableCell>
									<TableCell className="font-mono text-sm">
										{profile["rate-limit"] || "Unlimited"}
									</TableCell>
									<TableCell>
										{profile["mac-cookie-timeout"] ? (
											<Badge
												variant="outline"
												className="border-green-500/30 text-green-500"
											>
												Enabled
											</Badge>
										) : (
											<Badge variant="secondary">Disabled</Badge>
										)}
									</TableCell>
									<TableCell className="text-muted-foreground text-sm">
										{profile["address-pool"] || "none"}
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
