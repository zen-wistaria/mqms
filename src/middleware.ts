import { type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;

	// Public paths that don't require authentication
	const publicPaths = ["/login", "/register", "/api/auth"];
	const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

	if (isPublicPath) {
		return NextResponse.next();
	}

	// Check for session cookie
	const sessionToken = request.cookies.get("better-auth.session_token")?.value;

	if (!sessionToken) {
		const loginUrl = new URL("/login", request.url);
		loginUrl.searchParams.set("callbackUrl", pathname);
		return NextResponse.redirect(loginUrl);
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
