"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function joinContestViaLink(inviteToken: string) {
  const session = await auth()
  if (!session?.user) {
    return { error: "Tu dois être connecté pour rejoindre un concours." }
  }

  const contest = await db.contest.findUnique({
    where: { inviteToken },
    select: { id: true, name: true, status: true },
  })

  if (!contest) {
    return { error: "Lien d'invitation invalide." }
  }

  if (contest.status === "FINISHED") {
    return { error: "Ce concours est terminé." }
  }

  const existing = await db.contestParticipant.findUnique({
    where: { contestId_userId: { contestId: contest.id, userId: session.user.id } },
  })

  if (existing) {
    return { alreadyJoined: true, contestName: contest.name }
  }

  await db.contestParticipant.create({
    data: { contestId: contest.id, userId: session.user.id },
  })

  await db.leaderboardEntry.upsert({
    where: { contestId_userId: { contestId: contest.id, userId: session.user.id } },
    create: { contestId: contest.id, userId: session.user.id, rank: 0, totalPoints: 0 },
    update: {},
  })

  revalidatePath("/accueil")
  revalidatePath("/classement")
  return { success: true, contestName: contest.name }
}
