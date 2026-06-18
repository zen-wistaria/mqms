"use client";

import { useQuery } from "@tanstack/react-query";
import { Shield, Users, Wifi } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function HotspotDashboardPage() {
	const [routerId, setRouterId] = useState<string>("");

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

	const { data: users, isLoading: usersLoading } = useQuery({
		queryKey: ["hotspotUsers", routerId],
		queryFn: async () => {
			const res = await fetch(`/api/hotspot/users?routerId=${routerId}`);
			if (!res.ok) throw new Error("Failed to fetch users");
			return res.json();
		},
		enabled: !!routerId,
	});

	const { data: active, isLoading: activeLoading } = useQuery({
		queryKey: ["hotspotActive", routerId],
		queryFn: async () => {
			const res = await fetch(`/api/hotspot/active?routerId=${routerId}`);
			if (!res.ok) throw new Error("Failed to fetch active sessions");
			return res.json();
		},
		enabled: !!routerId,
	});

	const { data: profiles, isLoading: profilesLoading } = useQuery({
		queryKey: ["hotspotProfiles", routerId],
		queryFn: async () => {
			const res = await fetch(`/api/hotspot/profiles?routerId=${routerId}`);
			if (!res.ok) throw new Error("Failed to fetch profiles");
			return res.json();
		},
		enabled: !!routerId,
	});

	if (!routerId) {
		return (
			<div className="p-4 text-muted-foreground">
				Please select a router to view hotspot stats.
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="grid gap-4 md:grid-cols-3">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Active Sessions
						</CardTitle>
						<Wifi className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						{activeLoading ? (
							<Skeleton className="h-8 w-16" />
						) : (
							<div className="text-2xl font-bold">{active?.length || 0}</div>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total Users</CardTitle>
						<Users className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						{usersLoading ? (
							<Skeleton className="h-8 w-16" />
						) : (
							<div className="text-2xl font-bold">{users?.length || 0}</div>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">User Profiles</CardTitle>
						<Shield className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						{profilesLoading ? (
							<Skeleton className="h-8 w-16" />
						) : (
							<div className="text-2xl font-bold">{profiles?.length || 0}</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
