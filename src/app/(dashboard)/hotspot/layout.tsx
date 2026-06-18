"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

const hotspotNav = [
	{ name: "Dashboard", href: "/hotspot" },
	{ name: "Users", href: "/hotspot/users" },
	{ name: "Generate Vouchers", href: "/hotspot/generate" },
	{ name: "Active", href: "/hotspot/active" },
	{ name: "Batch", href: "/hotspot/batch" },
	{ name: "IP Binding", href: "/hotspot/ip-binding" },
	{ name: "Profiles", href: "/hotspot/profiles" },
];

export default function HotspotLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const pathname = usePathname();
	const [routers, setRouters] = useState<{ id: string; name: string }[]>([]);
	const [selectedRouter, setSelectedRouter] = useState<string>("");

	useEffect(() => {
		fetch("/api/routers")
			.then((res) => res.json())
			.then((data) => {
				setRouters(data);
				// Check localStorage for previously selected router
				const saved = localStorage.getItem("hotspot_router_id");
				if (saved && data.find((r: any) => r.id === saved)) {
					setSelectedRouter(saved);
				} else if (data.length > 0) {
					setSelectedRouter(data[0].id);
					localStorage.setItem("hotspot_router_id", data[0].id);
				}
			})
			.catch(console.error);
	}, []);

	const handleRouterChange = (val: string | null) => {
		const newRouter = val || "";
		setSelectedRouter(newRouter);
		localStorage.setItem("hotspot_router_id", newRouter);
		// Force reload or trigger event so children can re-fetch
		window.dispatchEvent(new Event("hotspotRouterChanged"));
	};

	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
				<div>
					<h2 className="text-2xl font-bold tracking-tight">Hotspot Manager</h2>
					<p className="text-muted-foreground">Manage your Mikrotik Hotspot</p>
				</div>
				<div className="flex items-center gap-2">
					<Label className="text-sm text-muted-foreground whitespace-nowrap">
						Selected Router:
					</Label>
					<Select value={selectedRouter} onValueChange={handleRouterChange}>
						<SelectTrigger className="w-[200px]">
							<SelectValue placeholder="Select Router">
								{routers.find((r) => r.id === selectedRouter)?.name || "Select Router"}
							</SelectValue>
						</SelectTrigger>
						<SelectContent>
							{routers.map((r) => (
								<SelectItem key={r.id} value={r.id}>
									{r.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			<div className="border-b">
				<nav
					className="-mb-px flex space-x-8 overflow-x-auto"
					aria-label="Tabs"
				>
					{hotspotNav.map((tab) => {
						const isActive = pathname === tab.href;
						return (
							<Link
								key={tab.name}
								href={tab.href}
								className={`
									whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
									${
										isActive
											? "border-primary text-primary"
											: "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
									}
								`}
							>
								{tab.name}
							</Link>
						);
					})}
				</nav>
			</div>

			<div className="py-2">{children}</div>
		</div>
	);
}
