import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const inter = Inter({
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
		<html lang="en" className={`dark ${inter.variable} ${geistMono.variable}`}>
			<body className="antialiased font-sans">
				<NextTopLoader color="#8b5cf6" showSpinner={false} />
				<QueryProvider>
					<TooltipProvider>
						{children}
						<Toaster richColors position="top-right" />
					</TooltipProvider>
				</QueryProvider>
			</body>
		</html>
	);
}
