"use client";

import { Activity, Eye, EyeOff, Loader2, Network } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	async function handleLogin(e: React.FormEvent) {
		e.preventDefault();
		setIsLoading(true);

		try {
			const result = await authClient.signIn.email({
				email,
				password,
			});

			if (result.error) {
				toast.error(result.error.message || "Login failed");
				return;
			}

			toast.success("Login successful!");
			router.push("/");
			router.refresh();
		} catch {
			toast.error("An unexpected error occurred");
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-background relative overflow-hidden">
			{/* Animated background */}
			<div className="absolute inset-0 overflow-hidden">
				<div className="absolute -top-1/2 -left-1/2 w-full h-full bg-linear-to-br from-primary/5 via-transparent to-transparent rounded-full blur-3xl animate-pulse" />
				<div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-linear-to-tl from-chart-2/5 via-transparent to-transparent rounded-full blur-3xl animate-pulse delay-1000" />
			</div>

			<div className="relative z-10 w-full max-w-md px-4">
				{/* Logo Section */}
				<div className="flex flex-col items-center mb-8">
					<div className="flex items-center gap-2 mb-2">
						<div className="relative">
							<Network className="h-10 w-10 text-primary" />
						</div>
						<h1 className="text-3xl font-bold gradient-text">MQMS</h1>
						<Activity className="h-4 w-4 text-chart-2 -mt-4 -ml-2" />
					</div>
					<p className="text-muted-foreground text-sm">
						MikroTik Queue Monitoring System
					</p>
				</div>

				<Card className="glass-card border-border/50">
					<CardHeader className="space-y-1 pb-4">
						<CardTitle className="text-2xl font-bold text-center">
							Welcome Back
						</CardTitle>
						<CardDescription className="text-center">
							Sign in to your account to continue
						</CardDescription>
					</CardHeader>
					<form onSubmit={handleLogin}>
						<CardContent className="space-y-4 pb-5">
							<div className="space-y-2">
								<Label htmlFor="email">Email</Label>
								<Input
									id="email"
									type="email"
									placeholder="admin@example.com"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
									autoComplete="email"
									className="bg-background/50"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="password">Password</Label>
								<div className="relative">
									<Input
										id="password"
										type={showPassword ? "text" : "password"}
										placeholder="••••••••"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										required
										autoComplete="current-password"
										className="bg-background/50 pr-10"
									/>
									<button
										type="button"
										onClick={() => setShowPassword(!showPassword)}
										className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
									>
										{showPassword ? (
											<EyeOff className="h-4 w-4" />
										) : (
											<Eye className="h-4 w-4" />
										)}
									</button>
								</div>
							</div>
						</CardContent>
						<CardFooter className="flex flex-col gap-4">
							<Button type="submit" className="w-full" disabled={isLoading}>
								{isLoading ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Signing in...
									</>
								) : (
									"Sign In"
								)}
							</Button>
							<p className="text-sm text-muted-foreground text-center">
								Don&apos;t have an account?{" "}
								<Link
									href="/register"
									className="text-primary hover:underline font-medium"
								>
									Create one
								</Link>
							</p>
						</CardFooter>
					</form>
				</Card>
			</div>
		</div>
	);
}
