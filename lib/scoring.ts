import type { ContestSettings, ScoreResult } from "@/types"
import { getMatchResult } from "@/lib/utils"

/**
 * Calcule les points pour un pronostic de match.
 *
 * Pour les phases knockout (non GROUP), la règle knockoutScoringRule détermine
 * sur quel score évaluer le pronostic :
 * - REGULAR_TIME : on compare au score à 90' (regularTimeHome/Away)
 * - FULL_TIME    : on compare au score final (incl. prolongations) — homeScore/awayScore
 *
 * Si regularTimeHome/Away n'est pas renseigné (match GROUP ou rule = FULL_TIME),
 * on utilise toujours homeScore/awayScore.
 */
export function calculateMatchPoints(
  predictedHome: number,
  predictedAway: number,
  actualHome: number,
  actualAway: number,
  settings: Pick<ContestSettings, "pointsCorrectResult" | "pointsExactScore" | "pointsWrongResult">
): ScoreResult {
  return _computePoints(predictedHome, predictedAway, actualHome, actualAway, settings)
}

/**
 * Version étendue pour les matchs knockout qui peut tenir compte de la règle de scoring.
 */
export function calculateMatchPointsWithRule(
  predictedHome: number,
  predictedAway: number,
  match: {
    homeScore: number | null
    awayScore: number | null
    regularTimeHome: number | null
    regularTimeAway: number | null
    phase: string
  },
  settings: Pick<
    ContestSettings,
    "pointsCorrectResult" | "pointsExactScore" | "pointsWrongResult" | "knockoutScoringRule"
  >
): ScoreResult | null {
  if (match.homeScore === null || match.awayScore === null) return null

  const isKnockout = match.phase !== "GROUP"

  let refHome: number
  let refAway: number

  if (
    isKnockout &&
    settings.knockoutScoringRule === "REGULAR_TIME" &&
    match.regularTimeHome !== null &&
    match.regularTimeAway !== null
  ) {
    // Pronostic évalué sur le score à 90'
    refHome = match.regularTimeHome
    refAway = match.regularTimeAway
  } else {
    // Pronostic évalué sur le score final
    refHome = match.homeScore
    refAway = match.awayScore
  }

  return _computePoints(predictedHome, predictedAway, refHome, refAway, settings)
}

function _computePoints(
  predictedHome: number,
  predictedAway: number,
  actualHome: number,
  actualAway: number,
  settings: Pick<ContestSettings, "pointsCorrectResult" | "pointsExactScore" | "pointsWrongResult">
): ScoreResult {
  const isExactScore = predictedHome === actualHome && predictedAway === actualAway

  if (isExactScore) {
    return {
      points: settings.pointsCorrectResult + settings.pointsExactScore,
      status: "EXACT_SCORE",
      isExactScore: true,
      isCorrectResult: true,
    }
  }

  const predictedResult = getMatchResult(predictedHome, predictedAway)
  const actualResult = getMatchResult(actualHome, actualAway)
  const isCorrectResult = predictedResult === actualResult

  if (isCorrectResult) {
    return {
      points: settings.pointsCorrectResult,
      status: "CORRECT_RESULT",
      isExactScore: false,
      isCorrectResult: true,
    }
  }

  return {
    points: settings.pointsWrongResult,
    status: "WRONG",
    isExactScore: false,
    isCorrectResult: false,
  }
}

export function calculateBonusPoints(
  prediction: {
    winnerId?: string | null
    topScorerId?: string | null
    topScorerFreeText?: string | null
    bestAttackId?: string | null
    bestDefenseId?: string | null
  },
  results: {
    winnerId?: string | null
    winnerScorerIds?: string[]
    bestAttackId?: string | null
    bestDefenseId?: string | null
  },
  settings: Pick<
    ContestSettings,
    "pointsWinner" | "pointsTopScorer" | "pointsBestAttack" | "pointsBestDefense"
  >
): number {
  let total = 0

  if (results.winnerId && prediction.winnerId === results.winnerId) {
    total += settings.pointsWinner
  }

  if (
    results.winnerScorerIds?.length &&
    prediction.topScorerId &&
    results.winnerScorerIds.includes(prediction.topScorerId)
  ) {
    total += settings.pointsTopScorer
  }

  if (results.bestAttackId && prediction.bestAttackId === results.bestAttackId) {
    total += settings.pointsBestAttack
  }

  if (results.bestDefenseId && prediction.bestDefenseId === results.bestDefenseId) {
    total += settings.pointsBestDefense
  }

  return total
}

export function calculateGroupPredictionPoints(
  predicted: { firstTeamCode: string; secondTeamCode: string },
  actual: { firstTeamCode: string; secondTeamCode: string },
  settings: Pick<ContestSettings, "pointsGroupFirst" | "pointsGroupSecond">
): number {
  let points = 0
  if (predicted.firstTeamCode === actual.firstTeamCode) {
    points += settings.pointsGroupFirst
  }
  if (predicted.secondTeamCode === actual.secondTeamCode) {
    points += settings.pointsGroupSecond
  }
  return points
}
