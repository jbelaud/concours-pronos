"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { isMatchLocked } from "@/lib/utils"
import { revalidatePath } from "next/cache"

export async function upsertPrediction(data: {
  matchId: string
  contestId: string
  homeScore: number
  awayScore: number
}) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Non authentifié." }

  const [match, participant] = await Promise.all([
    db.match.findUnique({
      where: { id: data.matchId },
      select: { kickoff: true, contestId: true },
    }),
    db.contestParticipant.findUnique({
      where: { contestId_userId: { contestId: data.contestId, userId: session.user.id } },
      select: { userId: true },
    }),
  ])

  if (!match || match.contestId !== data.contestId) {
    return { error: "Match introuvable." }
  }

  if (!participant) {
    return { error: "Tu n'es pas participant de ce concours." }
  }

  if (isMatchLocked(match.kickoff)) {
    return { error: "Ce match est verrouillé." }
  }

  if (data.homeScore < 0 || data.awayScore < 0 || data.homeScore > 20 || data.awayScore > 20) {
    return { error: "Score invalide." }
  }

  await db.prediction.upsert({
    where: {
      userId_matchId: {
        userId: session.user.id,
        matchId: data.matchId,
      },
    },
    create: {
      userId: session.user.id,
      matchId: data.matchId,
      contestId: data.contestId,
      homeScore: data.homeScore,
      awayScore: data.awayScore,
    },
    update: {
      homeScore: data.homeScore,
      awayScore: data.awayScore,
    },
  })

  revalidatePath("/pronostics")
  return { success: true }
}

export async function upsertBonusPrediction(data: {
  contestId: string
  winnerId?: string
  topScorerId?: string
  topScorerFreeText?: string
  bestAttackId?: string
  bestDefenseId?: string
}) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Non authentifié." }

  const [firstMatch, participant] = await Promise.all([
    db.match.findFirst({
      where: { contestId: data.contestId },
      orderBy: { kickoff: "asc" },
      select: { kickoff: true },
    }),
    db.contestParticipant.findUnique({
      where: { contestId_userId: { contestId: data.contestId, userId: session.user.id } },
      select: { userId: true },
    }),
  ])

  if (!participant) {
    return { error: "Tu n'es pas participant de ce concours." }
  }

  if (firstMatch && isMatchLocked(firstMatch.kickoff)) {
    return { error: "Les pronostics bonus sont verrouillés." }
  }

  await db.tournamentPrediction.upsert({
    where: {
      userId_contestId: {
        userId: session.user.id,
        contestId: data.contestId,
      },
    },
    create: {
      userId: session.user.id,
      contestId: data.contestId,
      winnerId: data.winnerId,
      topScorerId: data.topScorerId,
      topScorerFreeText: data.topScorerFreeText,
      bestAttackId: data.bestAttackId,
      bestDefenseId: data.bestDefenseId,
    },
    update: {
      winnerId: data.winnerId,
      topScorerId: data.topScorerId,
      topScorerFreeText: data.topScorerFreeText,
      bestAttackId: data.bestAttackId,
      bestDefenseId: data.bestDefenseId,
    },
  })

  revalidatePath("/pronostics")
  return { success: true }
}

export async function upsertGroupPrediction(data: {
  contestId: string
  groupLetter: string
  firstTeamCode: string
  secondTeamCode: string
}) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Non authentifié." }

  const [firstMatch, participant] = await Promise.all([
    db.match.findFirst({
      where: { contestId: data.contestId },
      orderBy: { kickoff: "asc" },
      select: { kickoff: true },
    }),
    db.contestParticipant.findUnique({
      where: { contestId_userId: { contestId: data.contestId, userId: session.user.id } },
      select: { userId: true },
    }),
  ])

  if (!participant) {
    return { error: "Tu n'es pas participant de ce concours." }
  }

  if (firstMatch && isMatchLocked(firstMatch.kickoff)) {
    return { error: "Les pronostics de groupes sont verrouillés." }
  }

  const bonusPred = await db.tournamentPrediction.upsert({
    where: {
      userId_contestId: {
        userId: session.user.id,
        contestId: data.contestId,
      },
    },
    create: {
      userId: session.user.id,
      contestId: data.contestId,
    },
    update: {},
  })

  await db.groupPrediction.upsert({
    where: {
      tournamentPredictionId_groupLetter: {
        tournamentPredictionId: bonusPred.id,
        groupLetter: data.groupLetter,
      },
    },
    create: {
      tournamentPredictionId: bonusPred.id,
      groupLetter: data.groupLetter,
      firstTeamCode: data.firstTeamCode,
      secondTeamCode: data.secondTeamCode,
    },
    update: {
      firstTeamCode: data.firstTeamCode,
      secondTeamCode: data.secondTeamCode,
    },
  })

  return { success: true }
}
