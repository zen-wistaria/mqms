import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "MQMS - MikroTik Queue Monitoring System",
	description:
		"Monitor and track MikroTik Simple Queue statistics across multiple routers with persistent historical data.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" className="dark">
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased`}
			>
				<TooltipProvider>
					{children}
					<Toaster richColors position="top-right" />
				</TooltipProvider>
			</body>
		</html>
	);
}
