import { compare, hash } from "bcrypt-ts";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { username } from "better-auth/plugins";

import { prisma } from "./prisma";

export const auth = betterAuth({
	database: prismaAdapter(prisma, {
		provider: "sqlite",
	}),
	databaseHooks: {
		user: {
			create: {
				after: async (user) => {
					const count = await prisma.user.count();
					if (count === 1) {
						await prisma.user.update({
							where: { id: user.id },
							data: { role: "admin" },
						});
					}
				},
			},
		},
	},
	plugins: [username()],
	emailAndPassword: {
		enabled: true,
		password: {
			hash: async (password) => {
				return hash(password, 12);
			},
			verify: async ({ password, hash }) => {
				return compare(password, hash);
			},
		},
	},
	session: {
		expiresIn: 60 * 60 * 24 * 7, // 7 days
		updateAge: 60 * 60 * 24, // 1 day
	},
});
