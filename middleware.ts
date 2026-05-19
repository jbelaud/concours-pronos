import NextAuth from "next-auth"
import { authConfig } from "@/lib/auth.config"
import { NextResponse } from "next/server"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth
  const isAdmin = req.auth?.user?.role === "ADMIN"

  // Public routes
  const publicRoutes = ["/login", "/invitation", "/rejoindre"]
  const isPublic = publicRoutes.some((r) => pathname.startsWith(r))

  if (!isLoggedIn && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  // Admin protection
  if (pathname.startsWith("/admin") && !isAdmin) {
    return NextResponse.redirect(new URL("/accueil", req.url))
  }

  // Redirect authenticated users away from login
  if (isLoggedIn && pathname === "/login") {
    return NextResponse.redirect(new URL("/accueil", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|images|fonts).*)",
  ],
}
