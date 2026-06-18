import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

export type Role = "admin" | "user";

export interface SessionUser {
	id: string;
	email: string;
	name: string;
	role: Role;
}

/**
 * Get current user from better-auth session.
 * Returns null if not authenticated.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
	const session = await auth.api.getSession({
		headers: await headers(),
	});
	if (!session?.user) return null;

	const user = await prisma.user.findUnique({
		where: { id: session.user.id },
		select: { id: true, email: true, name: true, role: true },
	});

	if (!user) return null;
	return {
		id: user.id,
		email: user.email,
		name: user.name,
		role: user.role as Role,
	};
}

/**
 * Require the current user to have one of the given roles.
 * Throws a Response (can be thrown in API routes).
 */
export async function requireRole(
	roles: Role | Role[],
): Promise<SessionUser> {
	const user = await getCurrentUser();
	if (!user) {
		throw new Response(JSON.stringify({ error: "Unauthorized" }), {
			status: 401,
			headers: { "Content-Type": "application/json" },
		});
	}

	const allowed = Array.isArray(roles) ? roles : [roles];
	if (!allowed.includes(user.role)) {
		throw new Response(JSON.stringify({ error: "Forbidden" }), {
			status: 403,
			headers: { "Content-Type": "application/json" },
		});
	}

	return user;
}

/**
 * Get router IDs that the current user can access.
 * Admin can access all routers.
 */
export async function getAccessibleRouterIds(
	userId: string,
): Promise<string[]> {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { role: true },
	});

	if (!user) return [];

	if (user.role === "admin") {
		const routers = await prisma.router.findMany({
			select: { id: true },
		});
		return routers.map((r) => r.id);
	}

	const assignments = await prisma.routerAssignment.findMany({
		where: { userId },
		select: { routerId: true },
	});
	return assignments.map((a) => a.routerId);
}

/**
 * Check if a user can access a specific router.
 */
export async function canAccessRouter(
	userId: string,
	routerId: string,
): Promise<boolean> {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { role: true },
	});

	if (!user) return false;
	if (user.role === "admin") return true;

	const assignment = await prisma.routerAssignment.findUnique({
		where: { userId_routerId: { userId, routerId } },
	});
	return !!assignment;
}

/**
 * Utility to get accessible router IDs for the current session user.
 * Can be used directly in API route handlers:
 *   const { userId, routerIds } = await getAccessibleRouterIdsOrThrow();
 *   // filter by routerIds
 */
export async function getAccessibleRouterIdsOrThrow(): Promise<{
	user: SessionUser;
	routerIds: string[];
}> {
	const user = await requireRole(["admin", "user"]);
	const routerIds = await getAccessibleRouterIds(user.id);
	return { user, routerIds };
}

/**
 * Validate that the current user can access the given routerId.
 * Throws if not.
 */
export async function requireRouterAccess(routerId: string): Promise<void> {
	const user = await getCurrentUser();
	if (!user) {
		throw new Response(JSON.stringify({ error: "Unauthorized" }), {
			status: 401,
			headers: { "Content-Type": "application/json" },
		});
	}

	const hasAccess = await canAccessRouter(user.id, routerId);
	if (!hasAccess) {
		throw new Response(JSON.stringify({ error: "Forbidden" }), {
			status: 403,
			headers: { "Content-Type": "application/json" },
		});
	}
}
