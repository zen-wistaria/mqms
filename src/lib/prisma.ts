import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const adapter = new PrismaLibSql({
	url: process.env.DATABASE_URL || "file:./dev.db",
});

export const prisma =
	globalForPrisma.prisma ||
	new PrismaClient({
		adapter,
		log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
	});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
