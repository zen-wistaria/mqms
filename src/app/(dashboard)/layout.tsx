"use client";

import {
	Activity,
	BarChart3,
	ChevronUp,
	LayoutDashboard,
	LogOut,
	Network,
	Router,
	Settings,
	Shield,
	Users,
	Wifi,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInset,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";

const navItems = [
	{
		title: "Dashboard",
		href: "/",
		icon: LayoutDashboard,
	},
	{
		title: "Routers",
		href: "/routers",
		icon: Router,
	},
	{
		title: "Queues",
		href: "/queues",
		icon: BarChart3,
	},
	{
		title: "Hotspot",
		href: "/hotspot",
		icon: Wifi,
	},
	{
		title: "VPN",
		href: "/vpn",
		icon: Shield,
		adminOnly: true,
	},
	{
		title: "Settings",
		href: "/settings",
		icon: Settings,
	},
	{
		title: "Users",
		href: "/users",
		icon: Users,
		adminOnly: true,
	},
];

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const pathname = usePathname();
	const router = useRouter();
	const { data: session } = authClient.useSession();
	const [isAdmin, setIsAdmin] = useState(false);

	useEffect(() => {
		if (session?.user) {
			fetch("/api/users")
				.then((res) => {
					if (res.ok) setIsAdmin(true);
				})
				.catch(() => setIsAdmin(false));
		} else {
			setIsAdmin(false);
		}
	}, [session]);

	const handleLogout = async () => {
		await authClient.signOut();
		router.push("/login");
	};

	return (
		<SidebarProvider>
			<Sidebar variant="inset">
				<SidebarHeader>
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuButton size="lg" render={<Link href="/" />}>
								<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
									<div className="relative">
										<Network className="size-4" />
									</div>
								</div>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<div className="flex items-center gap-2 mb-1">
										<span className="truncate font-bold">MQMS</span>
										<Activity className="h-4 w-4 -mt-2.5 -ml-2" />
									</div>
									<span className="truncate text-xs text-muted-foreground">
										Queue Monitor
									</span>
								</div>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarHeader>
				<SidebarContent>
					<SidebarGroup>
						<SidebarGroupLabel>Navigation</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								{navItems
									.filter((item) => !item.adminOnly || isAdmin)
									.map((item) => (
									<SidebarMenuItem key={item.href}>
										<SidebarMenuButton
											render={<Link href={item.href} />}
											isActive={
												item.href === "/"
													? pathname === "/"
													: pathname.startsWith(item.href)
											}
											tooltip={item.title}
										>
											<item.icon className="size-4" />
											<span>{item.title}</span>
										</SidebarMenuButton>
									</SidebarMenuItem>
								))}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				</SidebarContent>
				<SidebarFooter>
					<SidebarMenu>
						<SidebarMenuItem>
							<DropdownMenu>
								<DropdownMenuTrigger
									render={
										<SidebarMenuButton
											size="lg"
											className="data-[state=open]:bg-sidebar-accent"
										/>
									}
								>
									<Avatar className="h-8 w-8 rounded-lg">
										<AvatarFallback className="rounded-lg bg-primary/10 text-primary">
											{session?.user?.name
												?.split(" ")
												.map((n) => n[0])
												.join("")
												.toUpperCase() || "A"}
										</AvatarFallback>
									</Avatar>
									<div className="grid flex-1 text-left text-sm leading-tight">
										<span className="truncate font-semibold">
											{session?.user?.name || "Admin"}
										</span>
										<span className="truncate text-xs text-muted-foreground">
											{session?.user?.email || ""}
										</span>
									</div>
									<ChevronUp className="ml-auto size-4" />
								</DropdownMenuTrigger>
								<DropdownMenuContent
									side="top"
									className="w-[--radix-popper-anchor-width]"
								>
									<DropdownMenuItem onClick={handleLogout}>
										<LogOut className="mr-2 h-4 w-4" />
										Sign out
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarFooter>
			</Sidebar>
			<SidebarInset>
				<header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
					<SidebarTrigger className="-ml-1" />
					<Separator orientation="vertical" className="mr-2 h-4" />
					<div className="flex items-center gap-2">
						<h1 className="text-sm font-medium">
							{navItems.find((item) =>
								item.href === "/"
									? pathname === "/"
									: pathname.startsWith(item.href),
							)?.title || "Dashboard"}
						</h1>
					</div>
				</header>
				<main className="flex-1 p-4 md:p-6">{children}</main>
			</SidebarInset>
		</SidebarProvider>
	);
}
