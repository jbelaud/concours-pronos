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

  if (subProfileId !== null) {
    const sub = await db.subProfile.findUnique({
      where: { id: subProfileId },
      select: { firstName: true, lastName: true, avatarSeed: true, ghostUserId: true },
    })
    if (!sub) return NextResponse.json({ error: "Not found" }, { status: 404 })
    token.activeSubProfileId = subProfileId
    token.activeGhostUserId = sub.ghostUserId
    token.firstName = sub.firstName
    token.lastName = sub.lastName
    token.avatarSeed = sub.avatarSeed
  } else {
    // Switch back to main profile: restore from DB
    const owner = await db.user.findUnique({
      where: { id: ownerId },
      select: { firstName: true, lastName: true, avatarSeed: true },
    })
    token.activeSubProfileId = null
    token.activeGhostUserId = null
    token.firstName = owner?.firstName ?? ""
    token.lastName = owner?.lastName ?? ""
    token.avatarSeed = owner?.avatarSeed ?? ""
  }

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
