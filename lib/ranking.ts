import { db } from "@/lib/db"
import { calculateMatchPointsWithRule } from "@/lib/scoring"

export type TieBreakerKey = "exactScores" | "correctResults" | "finalWinner"

export const DEFAULT_TIEBREAKER_ORDER: TieBreakerKey[] = [
  "exactScores",
  "correctResults",
  "finalWinner",
]

export interface RankedRow {
  userId: string
  totalPoints: number
  exactScores: number
  correctResults: number
  bonusPoints: number
  finalWinner: number
  rank: number
}

/**
 * Tri en cascade d'un tableau de joueurs selon un ordre de départage dynamique.
 * Toujours précédé du tri primaire sur totalPoints (DESC).
 */
export function sortLeaderboard(
  players: RankedRow[],
  tieBreakerOrder: TieBreakerKey[]
): RankedRow[] {
  const order = tieBreakerOrder.length > 0 ? tieBreakerOrder : DEFAULT_TIEBREAKER_ORDER
  return [...players].sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints
    for (const key of order) {
      const diff = (b[key] as number) - (a[key] as number)
      if (diff !== 0) return diff
    }
    return 0
  })
}

/**
 * Recalcule toutes les prédictions d'un match terminé et reconstruit le classement.
 * Appelé automatiquement après qu'un admin enregistre un résultat.
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
      const result = calculateMatchPointsWithRule(
        pred.homeScore,
        pred.awayScore,
        {
          homeScore: match.homeScore,
          awayScore: match.awayScore,
          regularTimeHome: match.regularTimeHome,
          regularTimeAway: match.regularTimeAway,
          phase: match.phase,
        },
        settings
      )
      if (!result) return
      await db.prediction.update({
        where: { id: pred.id },
        data: { points: result.points, status: result.status },
      })
    })
  )

  await rebuildLeaderboard(match.contestId)
}

/**
 * Reconstruction complète du classement pour un concours.
 * L'ordre des départages est lu depuis ContestSettings.tieBreakerOrder.
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
        select: { points: true, groupPoints: true, winnerId: true },
      })

      // finalWinner vaut 1 si le joueur a trouvé le vainqueur final (bonusPred.winnerId résolu)
      const finalWinnerFound = bonusPred?.winnerId !== null && bonusPred?.points !== undefined
        ? await _hasFinalWinner(userId, contestId)
        : 0

      return {
        userId,
        totalPoints:
          preds.reduce((s, p) => s + p.points, 0) + (bonusPred?.points ?? 0) + (bonusPred?.groupPoints ?? 0),
        exactScores: preds.filter((p) => p.status === "EXACT_SCORE").length,
        correctResults: preds.filter(
          (p) => p.status === "EXACT_SCORE" || p.status === "CORRECT_RESULT"
        ).length,
        bonusPoints: (bonusPred?.points ?? 0) + (bonusPred?.groupPoints ?? 0),
        finalWinner: finalWinnerFound,
        rank: 0,
      } satisfies RankedRow
    })
  )

  const settings = await db.contestSettings.findUnique({ where: { contestId } })
  const rawOrder = settings?.tieBreakerOrder
  const tieBreakerOrder: TieBreakerKey[] = Array.isArray(rawOrder)
    ? (rawOrder as TieBreakerKey[])
    : DEFAULT_TIEBREAKER_ORDER

  const sorted = sortLeaderboard(rows, tieBreakerOrder)

  // Attribution des rangs (ex-æquo = même rang, tous critères égaux)
  let currentRank = 1
  for (let idx = 0; idx < sorted.length; idx++) {
    if (idx > 0 && _isTied(sorted[idx], sorted[idx - 1], tieBreakerOrder)) {
      sorted[idx].rank = currentRank
    } else {
      currentRank = idx + 1
      sorted[idx].rank = currentRank
    }
  }

  await Promise.all(
    sorted.map(async (row) => {
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
 * Prend un snapshot du classement courant pour tous les participants (après chaque journée).
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

// ---------------------------------------------------------------------------
// Helpers privés
// ---------------------------------------------------------------------------

/** Retourne 1 si le joueur a prédit le bon vainqueur final du tournoi. */
async function _hasFinalWinner(userId: string, contestId: string): Promise<number> {
  const bonus = await db.tournamentPrediction.findUnique({
    where: { userId_contestId: { userId, contestId } },
    select: { winnerId: true },
  })
  if (!bonus?.winnerId) return 0

  // Le vainqueur "résolu" est l'équipe ayant gagné le match FINAL
  const finalMatch = await db.match.findFirst({
    where: { contestId, phase: "FINAL", status: "FINISHED" },
    select: { homeTeamId: true, awayTeamId: true, homeScore: true, awayScore: true },
  })
  if (!finalMatch || finalMatch.homeScore === null || finalMatch.awayScore === null) return 0

  const actualWinnerId =
    finalMatch.homeScore > finalMatch.awayScore
      ? finalMatch.homeTeamId
      : finalMatch.awayTeamId

  return bonus.winnerId === actualWinnerId ? 1 : 0
}

/** Vérifie si deux joueurs sont strictement ex-æquo sur tous les critères de départage. */
function _isTied(a: RankedRow, b: RankedRow, order: TieBreakerKey[]): boolean {
  if (a.totalPoints !== b.totalPoints) return false
  for (const key of order) {
    if ((a[key] as number) !== (b[key] as number)) return false
  }
  return true
}
