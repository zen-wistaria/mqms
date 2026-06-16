import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import LoginPageClient from "./client-page";

export default async function LoginPage() {
	const userCount = await prisma.user.count();

	if (userCount === 0) {
		redirect("/register");
	}

	return <LoginPageClient />;
}
