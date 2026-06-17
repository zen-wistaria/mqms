import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

export const auth = betterAuth({
	database: prismaAdapter(prisma, {
		provider: "sqlite",
	}),
	emailAndPassword: {
		enabled: true,
		password: {
			hash: async (password) => {
				return Bun.password.hash(password, {
					algorithm: "bcrypt",
					cost: 12
				});
			},
			verify: async ({password, hash}) => {
				return Bun.password.verify(password, hash, "bcrypt");
			},
		},
	},
	session: {
		expiresIn: 60 * 60 * 24 * 7, // 7 days
		updateAge: 60 * 60 * 24, // 1 day
	},
});
