import { NextResponse } from "next/server"
import { auth, unstable_update } from "@/lib/auth"
import { db } from "@/lib/db"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { subProfileId } = await req.json()
  const ownerId = session.user.ownerId

  if (subProfileId !== null) {
    const sub = await db.subProfile.findUnique({
      where: { id: subProfileId },
      select: { firstName: true, lastName: true, avatarSeed: true, ghostUserId: true, ownerId: true },
    })
    if (!sub || sub.ownerId !== ownerId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    await unstable_update({
      activeSubProfileId: subProfileId,
      activeGhostUserId: sub.ghostUserId,
      firstName: sub.firstName,
      lastName: sub.lastName,
      avatarSeed: sub.avatarSeed,
    } as Parameters<typeof unstable_update>[0])
  } else {
    // Switch back to main profile
    const owner = await db.user.findUnique({
      where: { id: ownerId },
      select: { firstName: true, lastName: true, avatarSeed: true },
    })

    await unstable_update({
      activeSubProfileId: null,
      activeGhostUserId: null,
      firstName: owner?.firstName ?? "",
      lastName: owner?.lastName ?? "",
      avatarSeed: owner?.avatarSeed ?? "",
    } as Parameters<typeof unstable_update>[0])
  }

  return NextResponse.json({ ok: true })
}
