import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { encode } from "next-auth/jwt"
import { cookies } from "next/headers"

const SESSION_COOKIE = process.env.NODE_ENV === "production"
  ? "__Secure-authjs.session-token"
  : "authjs.session-token"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { subProfileId } = await req.json()
  const ownerId = session.user.ownerId

  // null means switch back to main profile
  if (subProfileId !== null) {
    const sub = await db.subProfile.findUnique({ where: { id: subProfileId } })
    if (!sub || sub.ownerId !== ownerId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
  }

  // Re-encode the JWT with the new activeSubProfileId
  const cookieStore = await cookies()
  const existingToken = cookieStore.get(SESSION_COOKIE)?.value
  if (!existingToken) return NextResponse.json({ error: "No session token" }, { status: 401 })

  const { decode } = await import("next-auth/jwt")
  const token = await decode({
    token: existingToken,
    secret: process.env.AUTH_SECRET!,
    salt: SESSION_COOKIE,
  })

  if (!token) return NextResponse.json({ error: "Invalid token" }, { status: 401 })

  token.activeSubProfileId = subProfileId

  // Clear cached ghost fields so jwt callback recomputes them fresh
  token.activeGhostUserId = null
  token.firstName = undefined
  token.lastName = undefined
  token.avatarSeed = undefined

  const newToken = await encode({
    token,
    secret: process.env.AUTH_SECRET!,
    salt: SESSION_COOKIE,
  })

  const response = NextResponse.json({ ok: true })
  const isProduction = process.env.NODE_ENV === "production"
  response.cookies.set(SESSION_COOKIE, newToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  })

  return response
}
