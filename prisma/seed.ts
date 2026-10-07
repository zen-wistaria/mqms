import { hash } from "bcrypt-ts";
import prisma from "@/lib/prisma";

async function main() {
	console.log("Seeding database...");

	// existing user
	const existingUser = await prisma.user.findUnique({
		where: {
			email: process.env.SEED_EMAIL || "admin@example.com"
		
		}
	})

	// Create user
	const email = process.env.SEED_EMAIL || "admin@example.com";
	const passwordStr = process.env.SEED_PASSWORD || "admin123";
	const name = process.env.SEED_NAME || "Administrator";

	const hashedPassword = await hash(passwordStr, 12);

	const user = await prisma.user.upsert({
		where: {
			email,
		},
		update: {
			name,
			role: "admin",
			emailVerified: true,
			username: "admin",
		},
		create: {
			email,
			name,
			username: "admin",
			role: "admin",
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

	if (existingUser) {
		console.log(
			`User ${existingUser.email} already exists, admin role already set.`
		);
	} else {
		console.log(
			`Successfully seeded user: ${user.email} with password: ${passwordStr}.`
		);
	}
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
