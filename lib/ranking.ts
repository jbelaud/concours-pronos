import { db } from "@/lib/db"
import { calculateMatchPoints } from "@/lib/scoring"

/**
 * Recalculates all predictions for a finished match and updates the leaderboard.
 * Called after admin saves a result.
 */
export async function recalculateMatchPredictions(
  matchId: string
): Promise<void> {
  const match = await db.match.findUniqueOrThrow({
    where: { id: matchId },
    include: {
      contest: { include: { settings: true } },
      predictions: true,
    },
  })

  if (match.homeScore === null || match.awayScore === null) return
  if (!match.contest.settings) return

  const settings = match.contest.settings

  await Promise.all(
    match.predictions.map(async (pred) => {
      const result = calculateMatchPoints(
        pred.homeScore,
        pred.awayScore,
        match.homeScore!,
        match.awayScore!,
        settings
      )
      await db.prediction.update({
        where: { id: pred.id },
        data: { points: result.points, status: result.status },
      })
    })
  )

  await rebuildLeaderboard(match.contestId)
}

interface RankedRow {
  userId: string
  totalPoints: number
  exactScores: number
  correctResults: number
  bonusPoints: number
  rank: number
}

/**
 * Full leaderboard rebuild for a contest.
 */
export async function rebuildLeaderboard(contestId: string): Promise<void> {
  const participants = await db.contestParticipant.findMany({
    where: { contestId },
    select: { userId: true },
  })

  const rows = await Promise.all(
    participants.map(async ({ userId }) => {
      const preds = await db.prediction.findMany({
        where: { contestId, userId },
        select: { points: true, status: true },
      })
      const bonusPred = await db.tournamentPrediction.findUnique({
        where: { userId_contestId: { userId, contestId } },
        select: { points: true },
      })
      return {
        userId,
        totalPoints: preds.reduce((s, p) => s + p.points, 0) + (bonusPred?.points ?? 0),
        exactScores: preds.filter((p) => p.status === "EXACT_SCORE").length,
        correctResults: preds.filter(
          (p) => p.status === "EXACT_SCORE" || p.status === "CORRECT_RESULT"
        ).length,
        bonusPoints: bonusPred?.points ?? 0,
        rank: 0,
      }
    })
  )

  const settings = await db.contestSettings.findUnique({ where: { contestId } })
  const tb1 = (settings?.tieBreaker1 ?? "exactScores") as keyof RankedRow
  const tb2 = (settings?.tieBreaker2 ?? "correctResults") as keyof RankedRow

  rows.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints
    const v1a = (a[tb1] as number) ?? 0
    const v1b = (b[tb1] as number) ?? 0
    if (v1b !== v1a) return v1b - v1a
    const v2a = (a[tb2] as number) ?? 0
    const v2b = (b[tb2] as number) ?? 0
    return v2b - v2a
  })

  let currentRank = 1
  for (let idx = 0; idx < rows.length; idx++) {
    if (
      idx > 0 &&
      rows[idx].totalPoints === rows[idx - 1].totalPoints
    ) {
      rows[idx].rank = currentRank
    } else {
      currentRank = idx + 1
      rows[idx].rank = currentRank
    }
  }

  await Promise.all(
    rows.map(async (row) => {
      const existing = await db.leaderboardEntry.findUnique({
        where: { contestId_userId: { contestId, userId: row.userId } },
        select: { rank: true },
      })
      await db.leaderboardEntry.upsert({
        where: { contestId_userId: { contestId, userId: row.userId } },
        create: {
          contestId,
          userId: row.userId,
          rank: row.rank,
          previousRank: null,
          totalPoints: row.totalPoints,
          exactScores: row.exactScores,
          correctResults: row.correctResults,
          bonusPoints: row.bonusPoints,
        },
        update: {
          previousRank: existing?.rank ?? null,
          rank: row.rank,
          totalPoints: row.totalPoints,
          exactScores: row.exactScores,
          correctResults: row.correctResults,
          bonusPoints: row.bonusPoints,
        },
      })
    })
  )
}

/**
 * Takes a ranking snapshot for all contest participants (called after each matchday).
 */
export async function takeRankingSnapshot(
  contestId: string,
  matchday: number
): Promise<void> {
  const entries = await db.leaderboardEntry.findMany({
    where: { contestId },
    select: { userId: true, rank: true, totalPoints: true },
  })
  await db.rankingSnapshot.createMany({
    data: entries.map((e) => ({
      contestId,
      userId: e.userId,
      rank: e.rank,
      totalPoints: e.totalPoints,
      matchday,
    })),
    skipDuplicates: true,
  })
}
