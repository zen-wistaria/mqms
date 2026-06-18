"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, Printer } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { VoucherPrintDialog } from "@/components/voucher/voucher-print-dialog";
import type { VoucherPrintData } from "@/components/voucher/voucher-print-templates";

export default function HotspotGeneratePage() {
	const [routerId, setRouterId] = useState<string>("");
	const [isGenerating, setIsGenerating] = useState(false);
	const [lastBatch, setLastBatch] = useState<VoucherPrintData | null>(null);
	const [showPrint, setShowPrint] = useState(false);

	const [form, setForm] = useState({
		qty: "10",
		server: "all",
		userMode: "up",
		length: "4",
		prefix: "",
		charType: "mix",
		profile: "default",
		timeLimit: "",
		dataLimit: "",
		mbgb: "1048576",
		adcomment: "",
	});

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

	const { data: profiles = [] } = useQuery({
		queryKey: ["hotspotProfiles", routerId],
		queryFn: async () => {
			const res = await fetch(`/api/hotspot/profiles?routerId=${routerId}`);
			if (!res.ok) throw new Error("Failed to fetch profiles");
			return res.json();
		},
		enabled: !!routerId,
	});

	const handleGenerate = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!routerId) {
			toast.error("Pilih router dulu");
			return;
		}

		setIsGenerating(true);
		try {
			let finalDataLimit = "0";
			if (form.dataLimit) {
				const bytes = Number(form.dataLimit) * Number(form.mbgb);
				finalDataLimit = bytes.toString();
			}

			const payload = { ...form, dataLimit: finalDataLimit };

			const res = await fetch(
				`/api/hotspot/users/generate?routerId=${routerId}`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(payload),
				},
			);

			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Gagal generate voucher");

			toast.success(data.message);

			// Prepare print data — fetch generated users by batch comment
			if (data.batchComment) {
				const usersRes = await fetch(
					`/api/hotspot/users?routerId=${routerId}&comment=${encodeURIComponent(data.batchComment)}`,
				);
				if (usersRes.ok) {
					const users = await usersRes.json();
					// Filter comment exact match
					const batchUsers = (Array.isArray(users) ? users : []).filter(
						(u: any) => u.comment === data.batchComment,
					);

					if (batchUsers.length > 0) {
						setLastBatch({
							users: batchUsers.map((u: any) => ({
								".id": u[".id"],
								name: u.name,
								password: u.password,
								profile: u.profile,
								server: u.server,
								"limit-uptime": u["limit-uptime"],
								"limit-bytes-total": u["limit-bytes-total"],
								comment: u.comment,
							})),
							title: "Hotspot Voucher",
							subtitle: form.profile,
							batchComment: data.batchComment,
							showPassword: true,
						});
						setShowPrint(true);
					}
				}
			}
		} catch (error: any) {
			toast.error(error.message);
		} finally {
			setIsGenerating(false);
		}
	};

	if (!routerId)
		return (
			<div className="p-4 text-muted-foreground">Pilih router dulu.</div>
		);

	return (
		<>
			<div className="max-w-2xl mx-auto space-y-6">
				<Card>
					<CardHeader>
						<CardTitle>Generate Voucher</CardTitle>
						<CardDescription>
							Buat user hotspot dalam jumlah banyak via profile
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleGenerate} className="space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label>Jumlah</Label>
									<Input
										type="number"
										min="1"
										max="500"
										required
										value={form.qty}
										onChange={(e) => setForm({ ...form, qty: e.target.value })}
									/>
								</div>
								<div className="space-y-2">
									<Label>Server</Label>
									<Select
										value={form.server}
										onValueChange={(v) =>
											setForm({ ...form, server: v || "all" })
										}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">all</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label>Mode User</Label>
									<Select
										value={form.userMode}
										onValueChange={(v) =>
											setForm({ ...form, userMode: v || "up" })
										}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="up">User & Password</SelectItem>
											<SelectItem value="vc">Username = Password</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-2">
									<Label>Panjang</Label>
									<Select
										value={form.length}
										onValueChange={(v) =>
											setForm({ ...form, length: v || "4" })
										}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{Array.from({ length: 6 }, (_, i) => i + 3).map((n) => (
												<SelectItem key={n} value={n.toString()}>
													{n}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label>Prefix</Label>
									<Input
										type="text"
										maxLength={6}
										value={form.prefix}
										onChange={(e) => setForm({ ...form, prefix: e.target.value })}
									/>
								</div>
								<div className="space-y-2">
									<Label>Karakter</Label>
									<Select
										value={form.charType}
										onValueChange={(v) =>
											setForm({ ...form, charType: v || "mix" })
										}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="lower">Random abcd</SelectItem>
											<SelectItem value="upper">Random ABCD</SelectItem>
											<SelectItem value="upplow">Random aBcD</SelectItem>
											<SelectItem value="mix">Random 5ab2c</SelectItem>
											<SelectItem value="mix1">Random 5AB2C</SelectItem>
											<SelectItem value="mix2">Random 5aB2c</SelectItem>
											<SelectItem value="num">Random 1234</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>

							<div className="space-y-2">
								<Label>Profile</Label>
								<Select
									value={form.profile}
									onValueChange={(v) =>
										setForm({ ...form, profile: v || "default" })
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="default">default</SelectItem>
										{profiles.map(
											(p: any) =>
												p.name !== "default" && (
													<SelectItem key={p[".id"]} value={p.name}>
														{p.name}
													</SelectItem>
												),
										)}
									</SelectContent>
								</Select>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label>Batas Waktu (ex: 1d, 2h)</Label>
									<Input
										type="text"
										placeholder="Opsional"
										value={form.timeLimit}
										onChange={(e) =>
											setForm({ ...form, timeLimit: e.target.value })
										}
									/>
								</div>
								<div className="space-y-2">
									<Label>Batas Kuota</Label>
									<div className="flex gap-2">
										<Input
											type="number"
											min="0"
											placeholder="Opsional"
											value={form.dataLimit}
											onChange={(e) =>
												setForm({ ...form, dataLimit: e.target.value })
											}
										/>
										<Select
											value={form.mbgb}
											onValueChange={(v) =>
												setForm({ ...form, mbgb: v || "1048576" })
											}
										>
											<SelectTrigger className="w-[100px]">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="1048576">MB</SelectItem>
												<SelectItem value="1073741824">GB</SelectItem>
											</SelectContent>
										</Select>
									</div>
								</div>
							</div>

							<div className="space-y-2">
								<Label>Comment</Label>
								<Input
									type="text"
									placeholder="Tag tambahan (opsional)"
									value={form.adcomment}
									onChange={(e) =>
										setForm({ ...form, adcomment: e.target.value })
									}
								/>
							</div>

							<div className="flex gap-2">
								<Button
									type="submit"
									className="flex-1"
									disabled={isGenerating}
								>
									{isGenerating ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											Menggenerate...
										</>
									) : (
										"Generate"
									)}
								</Button>
								{lastBatch && (
									<Button
										type="button"
										variant="outline"
										onClick={() => setShowPrint(true)}
									>
										<Printer className="mr-2 h-4 w-4" />
										Print
									</Button>
								)}
							</div>
						</form>
					</CardContent>
				</Card>

				{lastBatch && !showPrint && (
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Batch Terakhir</CardTitle>
							<CardDescription>
								{lastBatch.batchComment} — {lastBatch.users.length} voucher
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="flex gap-2">
								<Button
									variant="outline"
									onClick={() => setShowPrint(true)}
								>
									<Printer className="mr-2 h-4 w-4" />
									Print / Cetak Voucher
								</Button>
							</div>
						</CardContent>
					</Card>
				)}
			</div>

			{lastBatch && (
				<VoucherPrintDialog
					data={lastBatch}
					open={showPrint}
					onClose={() => setShowPrint(false)}
				/>
			)}
		</>
	);
}
