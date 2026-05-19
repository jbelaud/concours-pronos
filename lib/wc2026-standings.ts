/**
 * FIFA World Cup 2026 standings engine.
 * Applies official tiebreaker rules in order:
 * 1. Points
 * 2. Head-to-head points
 * 3. Head-to-head goal difference
 * 4. Head-to-head goals scored
 * 5. Overall goal difference
 * 6. Overall goals scored
 * 7. Fair play score (yellow=1, direct red=3, yellow+red=4)
 * 8. FIFA ranking (not stored — last resort, left as index)
 */

export interface MatchResult {
  homeTeamCode: string
  awayTeamCode: string
  homeScore: number
  awayScore: number
  groupLetter: string
}

export interface TeamStanding {
  code: string
  name: string
  flagEmoji: string | null
  groupLetter: string
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  points: number
  position: number // 1-4 within group
}

export interface GroupStandings {
  letter: string
  teams: TeamStanding[]
}

// The 8 best third-placed teams and the bracket mapping
// Based on FIFA official bracket for WC 2026 (16 matchups, fixed group seedings)
// Maps which groups' 3rd-place teams each group-winner slot can face
export const BRACKET_THIRD_PLACE_SLOTS: Record<number, string[]> = {
  74: ["A", "B", "C", "D", "F"],
  77: ["C", "D", "F", "G", "H"],
  79: ["C", "E", "F", "H", "I"],
  80: ["E", "H", "I", "J", "K"],
  81: ["B", "E", "F", "I", "J"],
  82: ["A", "E", "H", "I", "J"],
  85: ["E", "F", "G", "I", "J"],
  87: ["D", "E", "I", "J", "L"],
}

function teamStats(code: string, results: MatchResult[]) {
  let w = 0, d = 0, l = 0, gf = 0, ga = 0
  for (const r of results) {
    if (r.homeTeamCode === code) {
      gf += r.homeScore; ga += r.awayScore
      if (r.homeScore > r.awayScore) w++
      else if (r.homeScore === r.awayScore) d++
      else l++
    } else if (r.awayTeamCode === code) {
      gf += r.awayScore; ga += r.homeScore
      if (r.awayScore > r.homeScore) w++
      else if (r.awayScore === r.homeScore) d++
      else l++
    }
  }
  return { w, d, l, gf, ga, pts: w * 3 + d }
}

function headToHead(teamCodes: string[], results: MatchResult[]) {
  const h2h = results.filter(
    (r) => teamCodes.includes(r.homeTeamCode) && teamCodes.includes(r.awayTeamCode)
  )
  return teamCodes.map((code) => ({ code, ...teamStats(code, h2h) }))
}


export function computeGroupStandings(
  groupLetter: string,
  teamCodes: string[],
  teamMeta: Record<string, { name: string; flagEmoji: string | null }>,
  results: MatchResult[]
): TeamStanding[] {
  const groupResults = results.filter((r) => r.groupLetter === groupLetter)

  const raw = teamCodes.map((code) => {
    const s = teamStats(code, groupResults)
    return {
      code,
      name: teamMeta[code]?.name ?? code,
      flagEmoji: teamMeta[code]?.flagEmoji ?? null,
      groupLetter,
      played: s.w + s.d + s.l,
      won: s.w, drawn: s.d, lost: s.l,
      goalsFor: s.gf, goalsAgainst: s.ga,
      goalDiff: s.gf - s.ga,
      points: s.pts,
    }
  })

  // Sort with full tiebreaker chain
  const sorted = sortStandings(raw, groupResults)
  return sorted.map((t, i) => ({ ...t, position: i + 1 }))
}

function sortStandings(
  teams: Omit<TeamStanding, "position">[],
  groupResults: MatchResult[]
): Omit<TeamStanding, "position">[] {
  return [...teams].sort((a, b) => {
    // 1. Points
    if (b.points !== a.points) return b.points - a.points

    // 2-4. Head-to-head between tied teams (find all teams with same points)
    const tied = teams.filter((t) => t.points === a.points).map((t) => t.code)
    if (tied.length > 1 && tied.length < teams.length) {
      const h2hStats = headToHead(tied, groupResults)
      const ha = h2hStats.find((x) => x.code === a.code)!
      const hb = h2hStats.find((x) => x.code === b.code)!
      // h2h points
      if (hb.pts !== ha.pts) return hb.pts - ha.pts
      // h2h goal diff
      const hgdA = ha.gf - ha.ga, hgdB = hb.gf - hb.ga
      if (hgdB !== hgdA) return hgdB - hgdA
      // h2h goals scored
      if (hb.gf !== ha.gf) return hb.gf - ha.gf
    }

    // 5. Overall goal difference
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff
    // 6. Overall goals scored
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor
    // 7. Fair play (not tracked here — treat as equal)
    // 8. FIFA ranking (not tracked — maintain original order)
    return 0
  })
}

// ── Best third-place teams ────────────────────────────────────────────────────

export function getBestThirdPlaceTeams(allGroupStandings: GroupStandings[]): TeamStanding[] {
  const thirds = allGroupStandings
    .map((g) => g.teams.find((t) => t.position === 3))
    .filter(Boolean) as TeamStanding[]

  // Sort by same criteria as within-group (pts, gd, gf)
  const sorted = thirds.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor
    return 0
  })

  return sorted.slice(0, 8)
}

// ── Bracket resolver ──────────────────────────────────────────────────────────

export interface ResolvedMatchup {
  matchNumber: number
  homeTeamCode: string | null // null = not yet known
  awayTeamCode: string | null
  homeLabel: string
  awayLabel: string
}

/**
 * For each Round of 32 match, determine which teams play based on current standings.
 * Returns resolved codes when known, null otherwise.
 */
export function resolveRoundOf32(
  allGroupStandings: GroupStandings[],
  bestThirds: TeamStanding[]
): ResolvedMatchup[] {
  const byGroup = Object.fromEntries(allGroupStandings.map((g) => [g.letter, g.teams]))

  const winner = (letter: string) => byGroup[letter]?.find((t) => t.position === 1) ?? null
  const runnerUp = (letter: string) => byGroup[letter]?.find((t) => t.position === 2) ?? null

  // Best 8 thirds by group letter
  const bestThirdLetters = new Set(bestThirds.map((t) => t.groupLetter))

  // Find which best-third team comes from a set of candidate groups
  const bestThirdFrom = (candidateGroups: string[]): TeamStanding | null => {
    return bestThirds.find((t) => candidateGroups.includes(t.groupLetter)) ?? null
  }

  // Fixed bracket — match number → [homeSlot, awaySlot]
  const matchups: Array<{
    matchNumber: number
    homeSlot: () => TeamStanding | null
    awaySlot: () => TeamStanding | null
    homeLabel: string
    awayLabel: string
  }> = [
    { matchNumber: 73, homeLabel: "2e Gr. A", awayLabel: "2e Gr. B", homeSlot: () => runnerUp("A"), awaySlot: () => runnerUp("B") },
    { matchNumber: 74, homeLabel: "1er Gr. E", awayLabel: "3e A/B/C/D/F", homeSlot: () => winner("E"), awaySlot: () => bestThirdFrom(["A","B","C","D","F"]) },
    { matchNumber: 75, homeLabel: "1er Gr. F", awayLabel: "2e Gr. C", homeSlot: () => winner("F"), awaySlot: () => runnerUp("C") },
    { matchNumber: 76, homeLabel: "1er Gr. C", awayLabel: "2e Gr. F", homeSlot: () => winner("C"), awaySlot: () => runnerUp("F") },
    { matchNumber: 77, homeLabel: "1er Gr. I", awayLabel: "3e C/D/F/G/H", homeSlot: () => winner("I"), awaySlot: () => bestThirdFrom(["C","D","F","G","H"]) },
    { matchNumber: 78, homeLabel: "2e Gr. E", awayLabel: "2e Gr. I", homeSlot: () => runnerUp("E"), awaySlot: () => runnerUp("I") },
    { matchNumber: 79, homeLabel: "1er Gr. A", awayLabel: "3e C/E/F/H/I", homeSlot: () => winner("A"), awaySlot: () => bestThirdFrom(["C","E","F","H","I"]) },
    { matchNumber: 80, homeLabel: "1er Gr. L", awayLabel: "3e E/H/I/J/K", homeSlot: () => winner("L"), awaySlot: () => bestThirdFrom(["E","H","I","J","K"]) },
    { matchNumber: 81, homeLabel: "1er Gr. D", awayLabel: "3e B/E/F/I/J", homeSlot: () => winner("D"), awaySlot: () => bestThirdFrom(["B","E","F","I","J"]) },
    { matchNumber: 82, homeLabel: "1er Gr. G", awayLabel: "3e A/E/H/I/J", homeSlot: () => winner("G"), awaySlot: () => bestThirdFrom(["A","E","H","I","J"]) },
    { matchNumber: 83, homeLabel: "2e Gr. K", awayLabel: "2e Gr. L", homeSlot: () => runnerUp("K"), awaySlot: () => runnerUp("L") },
    { matchNumber: 84, homeLabel: "1er Gr. H", awayLabel: "2e Gr. J", homeSlot: () => winner("H"), awaySlot: () => runnerUp("J") },
    { matchNumber: 85, homeLabel: "1er Gr. B", awayLabel: "3e E/F/G/I/J", homeSlot: () => winner("B"), awaySlot: () => bestThirdFrom(["E","F","G","I","J"]) },
    { matchNumber: 86, homeLabel: "1er Gr. J", awayLabel: "2e Gr. H", homeSlot: () => winner("J"), awaySlot: () => runnerUp("H") },
    { matchNumber: 87, homeLabel: "1er Gr. K", awayLabel: "3e D/E/I/J/L", homeSlot: () => winner("K"), awaySlot: () => bestThirdFrom(["D","E","I","J","L"]) },
    { matchNumber: 88, homeLabel: "2e Gr. D", awayLabel: "2e Gr. G", homeSlot: () => runnerUp("D"), awaySlot: () => runnerUp("G") },
  ]

  return matchups.map(({ matchNumber, homeSlot, awaySlot, homeLabel, awayLabel }) => {
    const home = homeSlot()
    const away = awaySlot()
    return {
      matchNumber,
      homeTeamCode: home?.code ?? null,
      awayTeamCode: away?.code ?? null,
      homeLabel,
      awayLabel,
    }
  })
}
