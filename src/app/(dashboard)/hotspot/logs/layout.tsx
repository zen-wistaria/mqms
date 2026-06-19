"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const logsNav = [
	{ name: "User Log", href: "/hotspot/logs" },
	{ name: "Hotspot Log", href: "/hotspot/logs/routeros" },
];

export default function HotspotLogsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const pathname = usePathname();

	return (
		<div className="space-y-6">
			<div className="border-b">
				<nav
					className="-mb-px flex space-x-8 overflow-x-auto"
					aria-label="Tabs"
				>
					{logsNav.map((tab) => {
						const isActive =
							pathname === tab.href ||
							(tab.href !== "/hotspot/logs" &&
								pathname.startsWith(tab.href));
						return (
							<Link
								key={tab.name}
								href={tab.href}
								className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
									isActive
										? "border-primary text-primary"
										: "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
								}`}
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
