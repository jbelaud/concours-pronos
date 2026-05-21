/**
 * Seed demo data for the Coupe du Monde 2026 contest:
 * - Random predictions (matchs de poule) for both participants
 * - Random bonus predictions for both participants
 * - Random results for all group matches
 * - Scoring calculated for all predictions
 */

import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

// ── Standings engine (inline) ─────────────────────────────────────────────────

function teamStats(code, results) {
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

function h2h(teamCodes, results) {
  const filtered = results.filter(r => teamCodes.includes(r.homeTeamCode) && teamCodes.includes(r.awayTeamCode))
  return teamCodes.map(code => ({ code, ...teamStats(code, filtered) }))
}

function sortStandings(teams, groupResults) {
  return [...teams].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    const tied = teams.filter(t => t.points === a.points).map(t => t.code)
    if (tied.length > 1 && tied.length < teams.length) {
      const stats = h2h(tied, groupResults)
      const ha = stats.find(x => x.code === a.code)
      const hb = stats.find(x => x.code === b.code)
      if (hb.pts !== ha.pts) return hb.pts - ha.pts
      if ((hb.gf - hb.ga) !== (ha.gf - ha.ga)) return (hb.gf - hb.ga) - (ha.gf - ha.ga)
      if (hb.gf !== ha.gf) return hb.gf - ha.gf
    }
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor
    return 0
  })
}

function computeGroupStandings(groupLetter, teamCodes, teamMeta, results) {
  const groupResults = results.filter(r => r.groupLetter === groupLetter)
  const raw = teamCodes.map(code => {
    const s = teamStats(code, groupResults)
    return {
      code, name: teamMeta[code]?.name ?? code, flagEmoji: teamMeta[code]?.flagEmoji ?? null,
      groupLetter, played: s.w + s.d + s.l, won: s.w, drawn: s.d, lost: s.l,
      goalsFor: s.gf, goalsAgainst: s.ga, goalDiff: s.gf - s.ga, points: s.pts,
    }
  })
  return sortStandings(raw, groupResults).map((t, i) => ({ ...t, position: i + 1 }))
}

function getBestThirdPlaceTeams(allGroupStandings) {
  const thirds = allGroupStandings.map(g => g.teams.find(t => t.position === 3)).filter(Boolean)
  return thirds.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor
    return 0
  }).slice(0, 8)
}

function resolveRoundOf32(allGroupStandings, bestThirds) {
  const byGroup = Object.fromEntries(allGroupStandings.map(g => [g.letter, g.teams]))
  const winner = (l) => byGroup[l]?.find(t => t.position === 1) ?? null
  const runnerUp = (l) => byGroup[l]?.find(t => t.position === 2) ?? null

  // Assign each best-third to exactly one slot (bijective)
  const thirdSlots = [
    { matchNumber: 74, candidates: ["A","B","C","D","F"] },
    { matchNumber: 77, candidates: ["C","D","F","G","H"] },
    { matchNumber: 79, candidates: ["C","E","F","H","I"] },
    { matchNumber: 80, candidates: ["E","H","I","J","K"] },
    { matchNumber: 81, candidates: ["B","E","F","I","J"] },
    { matchNumber: 82, candidates: ["A","E","H","I","J"] },
    { matchNumber: 85, candidates: ["E","F","G","I","J"] },
    { matchNumber: 87, candidates: ["D","E","I","J","L"] },
  ]
  const usedGroups = new Set()
  const thirdAssignment = new Map()
  for (const slot of thirdSlots) {
    const match = bestThirds.find(t => slot.candidates.includes(t.groupLetter) && !usedGroups.has(t.groupLetter)) ?? null
    thirdAssignment.set(slot.matchNumber, match)
    if (match) usedGroups.add(match.groupLetter)
  }
  const thirdFor = (n) => thirdAssignment.get(n) ?? null

  return [
    { matchNumber: 73, homeSlot: () => runnerUp("A"), awaySlot: () => runnerUp("B") },
    { matchNumber: 74, homeSlot: () => winner("E"),   awaySlot: () => thirdFor(74) },
    { matchNumber: 75, homeSlot: () => winner("F"),   awaySlot: () => runnerUp("C") },
    { matchNumber: 76, homeSlot: () => winner("C"),   awaySlot: () => runnerUp("F") },
    { matchNumber: 77, homeSlot: () => winner("I"),   awaySlot: () => thirdFor(77) },
    { matchNumber: 78, homeSlot: () => runnerUp("E"), awaySlot: () => runnerUp("I") },
    { matchNumber: 79, homeSlot: () => winner("A"),   awaySlot: () => thirdFor(79) },
    { matchNumber: 80, homeSlot: () => winner("L"),   awaySlot: () => thirdFor(80) },
    { matchNumber: 81, homeSlot: () => winner("D"),   awaySlot: () => thirdFor(81) },
    { matchNumber: 82, homeSlot: () => winner("G"),   awaySlot: () => thirdFor(82) },
    { matchNumber: 83, homeSlot: () => runnerUp("K"), awaySlot: () => runnerUp("L") },
    { matchNumber: 84, homeSlot: () => winner("H"),   awaySlot: () => runnerUp("J") },
    { matchNumber: 85, homeSlot: () => winner("B"),   awaySlot: () => thirdFor(85) },
    { matchNumber: 86, homeSlot: () => winner("J"),   awaySlot: () => runnerUp("H") },
    { matchNumber: 87, homeSlot: () => winner("K"),   awaySlot: () => thirdFor(87) },
    { matchNumber: 88, homeSlot: () => runnerUp("D"), awaySlot: () => runnerUp("G") },
  ].map(({ matchNumber, homeSlot, awaySlot }) => ({
    matchNumber,
    homeTeamCode: homeSlot()?.code ?? null,
    awayTeamCode: awaySlot()?.code ?? null,
  }))
}

const CONTEST_ID = "cmpf3plpd0002uyn0msvhsvjc"
const USERS = [
  "cmpbmqgb30000uya0p77wlciy", // Jeremy BELAUD
  "cmpcugr5c0000ju04i2o42t0n", // Jérémy Belaud
]

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randScore() {
  // Realistic football scores
  const profiles = [
    [1, 0], [2, 0], [2, 1], [3, 0], [3, 1], [3, 2],
    [0, 0], [1, 1], [2, 2],
    [0, 1], [0, 2], [1, 2], [0, 3], [1, 3], [2, 3],
    [4, 0], [4, 1], [4, 2], [0, 4],
  ]
  const weights = [10, 8, 10, 4, 6, 3, 5, 7, 3, 8, 4, 6, 2, 3, 2, 1, 1, 1, 1]
  const total = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let i = 0; i < profiles.length; i++) {
    r -= weights[i]
    if (r <= 0) return { home: profiles[i][0], away: profiles[i][1] }
  }
  return { home: 1, away: 0 }
}

function getResult(home, away) {
  if (home > away) return "home"
  if (away > home) return "away"
  return "draw"
}

function scorePoints(settings, realHome, realAway, predHome, predAway) {
  const real = getResult(realHome, realAway)
  const pred = getResult(predHome, predAway)
  if (predHome === realHome && predAway === realAway) {
    return { points: settings.pointsCorrectResult + settings.pointsExactScore, status: "EXACT_SCORE" }
  }
  if (pred === real) {
    return { points: settings.pointsCorrectResult, status: "CORRECT_RESULT" }
  }
  return { points: settings.pointsWrongResult, status: "WRONG" }
}

async function main() {
  console.log("🧹 Cleaning existing data...")
  await db.prediction.deleteMany({ where: { contestId: CONTEST_ID } })
  await db.tournamentPrediction.deleteMany({ where: { contestId: CONTEST_ID } })
  await db.leaderboardEntry.deleteMany({ where: { contestId: CONTEST_ID } })
  await db.rankingSnapshot.deleteMany({ where: { contestId: CONTEST_ID } })

  // Reset match results
  await db.match.updateMany({
    where: { contestId: CONTEST_ID, phase: "GROUP" },
    data: { homeScore: null, awayScore: null, regularTimeHome: null, regularTimeAway: null, status: "SCHEDULED" },
  })

  const settings = await db.contestSettings.findUnique({ where: { contestId: CONTEST_ID } })
  const s = {
    pointsCorrectResult: settings?.pointsCorrectResult ?? 3,
    pointsExactScore: settings?.pointsExactScore ?? 1,
    pointsWrongResult: settings?.pointsWrongResult ?? 0,
  }
  console.log("⚙️  Settings:", s)

  const groupMatches = await db.match.findMany({
    where: { contestId: CONTEST_ID, phase: "GROUP" },
    include: { homeTeam: true, awayTeam: true },
    orderBy: [{ matchNumber: "asc" }],
  })
  console.log(`⚽ ${groupMatches.length} group matches found`)

  const teams = await db.team.findMany({ where: { contestId: CONTEST_ID } })
  const scorers = await db.scorerCandidate.findMany({ where: { contestId: CONTEST_ID } })
  const groups = await db.group.findMany({
    where: { contestId: CONTEST_ID },
    include: { teams: { include: { team: true } } },
    orderBy: { letter: "asc" },
  })

  // ── 1. Generate random results for all group matches ──────────────────────
  console.log("\n📊 Generating random match results...")
  const matchResults = new Map()
  for (const match of groupMatches) {
    const score = randScore()
    matchResults.set(match.id, score)
  }

  // ── 2. Generate random predictions for each user ──────────────────────────
  console.log("\n🎯 Generating predictions for users...")
  const now = new Date()
  const lockedAt = new Date(now.getTime() - 1000 * 60 * 60) // 1h ago

  for (const userId of USERS) {
    const predData = []
    for (const match of groupMatches) {
      const predScore = randScore()
      const real = matchResults.get(match.id)
      const { points, status } = scorePoints(s, real.home, real.away, predScore.home, predScore.away)

      predData.push({
        userId,
        matchId: match.id,
        contestId: CONTEST_ID,
        homeScore: predScore.home,
        awayScore: predScore.away,
        points,
        status,
        lockedAt,
      })
    }
    await db.prediction.createMany({ data: predData })
    console.log(`  ✅ ${predData.length} predictions for user ${userId}`)
  }

  // ── 3. Apply results to matches ───────────────────────────────────────────
  console.log("\n🏁 Applying match results...")
  for (const [matchId, score] of matchResults) {
    await db.match.update({
      where: { id: matchId },
      data: {
        homeScore: score.home,
        awayScore: score.away,
        regularTimeHome: score.home,
        regularTimeAway: score.away,
        status: "FINISHED",
      },
    })
  }
  console.log(`  ✅ ${matchResults.size} matches updated to FINISHED`)

  // ── 4. Resolve Round of 32 bracket from group standings ──────────────────
  console.log("\n🏟️  Resolving Round of 32 bracket...")
  {
    const groupMatchesFinished = await db.match.findMany({
      where: { contestId: CONTEST_ID, phase: "GROUP", status: "FINISHED" },
      include: { homeTeam: true, awayTeam: true },
    })
    const teamsAll = await db.team.findMany({ where: { contestId: CONTEST_ID } })
    const teamMeta = Object.fromEntries(teamsAll.map(t => [t.code, { name: t.name, flagEmoji: t.flagEmoji }]))
    const teamIdByCode = Object.fromEntries(teamsAll.map(t => [t.code, t.id]))

    const groups = await db.group.findMany({
      where: { contestId: CONTEST_ID },
      include: { teams: { include: { team: true } } },
      orderBy: { letter: "asc" },
    })

    const results = groupMatchesFinished
      .filter(m => m.homeScore !== null && m.awayScore !== null && m.homeTeam && m.awayTeam)
      .map(m => ({
        homeTeamCode: m.homeTeam.code,
        awayTeamCode: m.awayTeam.code,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        groupLetter: m.groupLetter ?? "",
      }))

    const allGroupStandings = groups.map(group => ({
      letter: group.letter,
      teams: computeGroupStandings(group.letter, group.teams.map(gt => gt.team.code), teamMeta, results),
    }))

    const bestThirds = getBestThirdPlaceTeams(allGroupStandings)
    const matchups = resolveRoundOf32(allGroupStandings, bestThirds)

    const roundOf32Matches = await db.match.findMany({
      where: { contestId: CONTEST_ID, phase: "ROUND_OF_32" },
      select: { id: true, matchNumber: true },
    })
    const matchByNumber = Object.fromEntries(roundOf32Matches.map(m => [m.matchNumber, m.id]))

    let updated = 0
    for (const { matchNumber, homeTeamCode, awayTeamCode } of matchups) {
      const matchId = matchByNumber[matchNumber]
      if (!matchId) continue
      await db.match.update({
        where: { id: matchId },
        data: {
          homeTeamId: homeTeamCode ? (teamIdByCode[homeTeamCode] ?? null) : null,
          awayTeamId: awayTeamCode ? (teamIdByCode[awayTeamCode] ?? null) : null,
        },
      })
      if (homeTeamCode && awayTeamCode) {
        console.log(`  M${matchNumber}: ${homeTeamCode} vs ${awayTeamCode}`)
        updated++
      }
    }
    console.log(`  ✅ ${updated}/16 matchups resolved`)
  }

  // ── 6. Generate bonus predictions for each user ───────────────────────────
  console.log("\n🏆 Generating bonus predictions...")
  for (const userId of USERS) {
    // Random winner
    const winnerTeam = teams[rand(0, teams.length - 1)]
    // Random top scorer
    const scorer = scorers[rand(0, scorers.length - 1)]
    // Random best attack + defense (different teams)
    const attackTeam = teams[rand(0, teams.length - 1)]
    let defenseTeam = teams[rand(0, teams.length - 1)]
    while (defenseTeam.id === attackTeam.id) {
      defenseTeam = teams[rand(0, teams.length - 1)]
    }

    // Random group predictions (1st + 2nd per group)
    const groupPreds = groups.map((g) => {
      const shuffled = [...g.teams].sort(() => Math.random() - 0.5)
      return {
        groupLetter: g.letter,
        firstTeamCode: shuffled[0].team.code,
        secondTeamCode: shuffled[1].team.code,
      }
    })

    await db.tournamentPrediction.create({
      data: {
        userId,
        contestId: CONTEST_ID,
        winnerId: winnerTeam.id,
        topScorerId: scorer.id,
        topScorerFreeText: scorer.name,
        bestAttackId: attackTeam.id,
        bestDefenseId: defenseTeam.id,
        points: 0,
        lockedAt,
        groupPredictions: {
          create: groupPreds,
        },
      },
    })
    console.log(`  ✅ Bonus pred for user ${userId}: winner=${winnerTeam.name}, scorer=${scorer.name}`)
  }

  // ── 7. Build leaderboard ──────────────────────────────────────────────────
  console.log("\n📈 Building leaderboard...")
  for (const userId of USERS) {
    const preds = await db.prediction.findMany({ where: { contestId: CONTEST_ID, userId } })
    const totalPoints = preds.reduce((sum, p) => sum + p.points, 0)
    const exactScores = preds.filter((p) => p.status === "EXACT_SCORE").length
    const correctResults = preds.filter((p) => p.status === "CORRECT_RESULT").length

    await db.leaderboardEntry.upsert({
      where: { contestId_userId: { userId, contestId: CONTEST_ID } },
      create: {
        userId,
        contestId: CONTEST_ID,
        totalPoints,
        rank: 0,
        previousRank: null,
        exactScores,
        correctResults,
        bonusPoints: 0,
      },
      update: {
        totalPoints,
        exactScores,
        correctResults,
      },
    })
    console.log(`  ✅ Leaderboard: user ${userId} = ${totalPoints} pts (${exactScores} exacts, ${correctResults} corrects)`)
  }

  // Assign ranks
  const entries = await db.leaderboardEntry.findMany({
    where: { contestId: CONTEST_ID },
    orderBy: [{ totalPoints: "desc" }, { exactScores: "desc" }],
  })
  let rank = 1
  for (const entry of entries) {
    await db.leaderboardEntry.update({ where: { id: entry.id }, data: { rank } })
    rank++
  }
  console.log("  ✅ Ranks assigned")

  console.log("\n✅ Seed complete!")
  await db.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
