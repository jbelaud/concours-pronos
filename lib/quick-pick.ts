/**
 * Realistic football score generator for Quick Pick (group stage only).
 *
 * Weights reflect observed World Cup score distributions. When seedIndex
 * data is available for both teams, slight bias is applied toward the
 * stronger side (lower seedIndex = stronger), but scores are never
 * deterministic — all outcomes remain plausible.
 */

interface ScoreWeight {
  home: number
  away: number
  weight: number
}

const BASE_WEIGHTS: ScoreWeight[] = [
  { home: 1, away: 1, weight: 14 },
  { home: 1, away: 0, weight: 13 },
  { home: 0, away: 1, weight: 12 },
  { home: 2, away: 1, weight: 11 },
  { home: 1, away: 2, weight: 10 },
  { home: 0, away: 0, weight: 9 },
  { home: 2, away: 0, weight: 8 },
  { home: 0, away: 2, weight: 7 },
  { home: 3, away: 1, weight: 5 },
  { home: 1, away: 3, weight: 5 },
  { home: 2, away: 2, weight: 4 },
  { home: 3, away: 0, weight: 3 },
  { home: 0, away: 3, weight: 3 },
  { home: 3, away: 2, weight: 2 },
  { home: 2, away: 3, weight: 2 },
  { home: 4, away: 1, weight: 1 },
  { home: 1, away: 4, weight: 1 },
  { home: 4, away: 2, weight: 1 },
  { home: 2, away: 4, weight: 1 },
  { home: 3, away: 3, weight: 1 },
]

/**
 * Biases the weight table when one team is clearly stronger.
 * strengthDiff > 0 means home is stronger, < 0 means away is stronger.
 * The maximum applied multiplier is 2.5× to keep outcomes realistic.
 */
function applyStrengthBias(weights: ScoreWeight[], strengthDiff: number): ScoreWeight[] {
  if (Math.abs(strengthDiff) < 0.1) return weights

  const clampedDiff = Math.max(-1, Math.min(1, strengthDiff))

  return weights.map((w) => {
    const scoreDiff = w.home - w.away
    const alignment = scoreDiff * clampedDiff
    const multiplier = 1 + alignment * 0.75
    return { ...w, weight: Math.max(0.1, w.weight * multiplier) }
  })
}

function pickWeighted(weights: ScoreWeight[], rng: () => number): { home: number; away: number } {
  const total = weights.reduce((acc, w) => acc + w.weight, 0)
  let r = rng() * total
  for (const w of weights) {
    r -= w.weight
    if (r <= 0) return { home: w.home, away: w.away }
  }
  return { home: weights[0].home, away: weights[0].away }
}

/**
 * Simple seeded PRNG (mulberry32) — deterministic per matchId so the same
 * generation request always produces the same score for a given match.
 * This prevents score flip-flopping on re-renders while keeping the
 * output varied across matches.
 */
function seededRng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s += 0x6d2b79f5
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashString(str: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export interface TeamStrength {
  seedIndex: number
}

/**
 * Generates a realistic football score for a single match.
 *
 * @param matchId   Used as seed for reproducibility.
 * @param homeTeam  Optional strength data for the home team.
 * @param awayTeam  Optional strength data for the away team.
 */
export function generateScore(
  matchId: string,
  homeTeam?: TeamStrength | null,
  awayTeam?: TeamStrength | null,
): { homeScore: number; awayScore: number } {
  const rng = seededRng(hashString(matchId))

  let weights = [...BASE_WEIGHTS]

  if (homeTeam != null && awayTeam != null) {
    // Lower seedIndex = stronger team. Normalise to [-1, 1] range.
    const diff = awayTeam.seedIndex - homeTeam.seedIndex
    const normalised = Math.tanh(diff / 4)
    weights = applyStrengthBias(weights, normalised)
  }

  const { home, away } = pickWeighted(weights, rng)
  return { homeScore: home, awayScore: away }
}
