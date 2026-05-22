import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const ownerId = session.user.ownerId

  const sub = await db.subProfile.findUnique({ where: { id } })
  if (!sub || sub.ownerId !== ownerId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Cascade: deleting the ghost User will cascade to SubProfile via onDelete: Cascade
  await db.user.delete({ where: { id: sub.ghostUserId } })

  return NextResponse.json({ ok: true })
}
