import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import RegisterPageClient from "./client-page";
export const dynamic = "force-dynamic";

export default async function RegisterPage() {
	const userCount = await prisma.user.count();
	if (userCount > 0) {
		redirect("/login");
	}

	return <RegisterPageClient />;
}
