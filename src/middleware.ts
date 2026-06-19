import { type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;

	// Public paths that don't require authentication
	const publicPaths = ["/login", "/register", "/api/auth"];
	const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

	if (isPublicPath) {
		return NextResponse.next();
	}

	// Check for session cookie (with or without __Host- prefix)
	const sessionToken =
		request.cookies.get("__Host-better-auth.session_token")?.value ||
		request.cookies.get("__Secure-better-auth.session_token")?.value ||
		request.cookies.get("better-auth.session_token")?.value;

	if (!sessionToken) {
		const loginUrl = new URL("/login", request.url);
		loginUrl.searchParams.set("callbackUrl", pathname);
		return NextResponse.redirect(loginUrl);
	}

	// Protected admin routes — middleware redirects to login,
	// server-side API/component will enforce 403 if role isn't admin
	const adminPaths = ["/settings/users"];
	const isAdminPath = adminPaths.some((path) => pathname.startsWith(path));

	if (isAdminPath) {
		// We can't check role here without DB call in middleware,
		// so the page component will handle role validation.
		// But we still need session check done above.
	}

	return NextResponse.next();
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except:
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 * - public files (public folder)
		 * - api/auth (auth endpoints)
		 */
		"/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
	],
};
