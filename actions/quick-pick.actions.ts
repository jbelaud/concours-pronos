"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { isMatchLocked } from "@/lib/utils"
import { generateScore } from "@/lib/quick-pick"
import { revalidatePath } from "next/cache"

export async function generateGroupPredictions(contestId: string): Promise<{
  generated: number
  error?: string
}> {
  const session = await auth()
  if (!session?.user?.id) return { generated: 0, error: "Non authentifié." }
  const userId = session.user.id

  const participant = await db.contestParticipant.findUnique({
    where: { contestId_userId: { contestId, userId } },
    select: { userId: true },
  })
  if (!participant) return { generated: 0, error: "Tu n'es pas participant de ce concours." }

  // Only GROUP phase matches with both teams known
  const matches = await db.match.findMany({
    where: { contestId, phase: "GROUP", homeTeamId: { not: null }, awayTeamId: { not: null } },
    select: {
      id: true,
      kickoff: true,
      homeTeam: { select: { seedIndex: true } },
      awayTeam: { select: { seedIndex: true } },
    },
  })

  const unlocked = matches.filter((m) => !isMatchLocked(m.kickoff))
  if (unlocked.length === 0) return { generated: 0, error: "Tous les matchs de poules sont verrouillés." }

  // Fetch already-filled predictions so we don't overwrite them
  const existing = await db.prediction.findMany({
    where: { userId, matchId: { in: unlocked.map((m) => m.id) } },
    select: { matchId: true },
  })
  const existingIds = new Set(existing.map((p) => p.matchId))

  const missing = unlocked.filter((m) => !existingIds.has(m.id))
  if (missing.length === 0) return { generated: 0 }

  await db.prediction.createMany({
    data: missing.map((m) => {
      const { homeScore, awayScore } = generateScore(m.id, m.homeTeam, m.awayTeam)
      return {
        userId,
        matchId: m.id,
        contestId,
        homeScore,
        awayScore,
      }
    }),
    skipDuplicates: true,
  })

  revalidatePath("/pronostics")
  return { generated: missing.length }
}
