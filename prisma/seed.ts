import { hash } from "bcrypt-ts";
import prisma from "@/lib/prisma";

async function main() {
	console.log("Seeding database...");

	// Check if user already exists
	const existingUser = await prisma.user.findFirst();
	if (existingUser) {
		console.log("User already exists, skipping seed.");
		return;
	}

	// Create user
	const email = process.env.SEED_EMAIL || "admin@example.com";
	const passwordStr = process.env.SEED_PASSWORD || "admin123";
	const name = process.env.SEED_NAME || "Administrator";

	const hashedPassword = await hash(passwordStr, 12);

	const user = await prisma.user.create({
		data: {
			email,
			name,
			emailVerified: true,
			accounts: {
				create: {
					accountId: email,
					providerId: "credential",
					password: hashedPassword,
				},
			},
		},
	});

	console.log(
		`Successfully seeded user: ${user.email} with password: ${passwordStr}`,
	);
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
