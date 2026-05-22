import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const ownerId = session.user.ownerId

  const subProfiles = await db.subProfile.findMany({
    where: { ownerId },
    select: { id: true, firstName: true, lastName: true, avatarSeed: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json(subProfiles)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const ownerId = session.user.ownerId

  const count = await db.subProfile.count({ where: { ownerId } })
  if (count >= 5) {
    return NextResponse.json({ error: "Maximum 5 sous-profils atteint" }, { status: 400 })
  }

  const body = await req.json()
  const firstName = (body.firstName ?? "").trim()
  const lastName = (body.lastName ?? "").trim()

  if (!firstName || !lastName) {
    return NextResponse.json({ error: "Prénom et nom requis" }, { status: 400 })
  }

  // Create a ghost User so all existing relations (predictions, leaderboard, etc.) work as-is
  const ghostUser = await db.user.create({
    data: {
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      role: "GHOST",
    },
  })

  const sub = await db.subProfile.create({
    data: {
      ownerId,
      ghostUserId: ghostUser.id,
      firstName,
      lastName,
      avatarSeed: ghostUser.avatarSeed,
    },
  })

  return NextResponse.json(sub, { status: 201 })
}
