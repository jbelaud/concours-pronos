"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { loadTournamentTemplate } from "@/lib/tournament"
import { recalculateMatchPredictions, rebuildLeaderboard, takeRankingSnapshot } from "@/lib/ranking"
import { revalidatePath } from "next/cache"
import { computeGroupStandings, getBestThirdPlaceTeams, resolveRoundOf32, type MatchResult, type GroupStandings } from "@/lib/wc2026-standings"

async function requireAdmin() {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Accès refusé.")
  }
  return session.user
}

// ---------------------------------------------------------------------------
// Contest
// ---------------------------------------------------------------------------

export async function createContest(data: {
  name: string
  templateSlug: string
  isFree: boolean
  buyIn: number
  iban?: string
  paymentInstructions?: string
  settings: {
    pointsCorrectResult: number
    pointsExactScore: number
    pointsWrongResult: number
    pointsWinner: number
    pointsTopScorer: number
    pointsBestAttack: number
    pointsBestDefense: number
    pointsGroupFirst: number
    pointsGroupSecond: number
    knockoutScoringRule: "REGULAR_TIME" | "FULL_TIME"
  }
  prizepool: {
    totalAmount: number
    itmCount: number
    payouts: Array<{ position: number; amount: number }>
  }
}) {
  await requireAdmin()

  const template = loadTournamentTemplate(data.templateSlug)

  let dbTemplate = await db.tournamentTemplate.findUnique({
    where: { slug: data.templateSlug },
  })

  if (!dbTemplate) {
    dbTemplate = await db.tournamentTemplate.create({
      data: {
        name: template.name,
        slug: template.slug,
        edition: template.edition,
        format: template.format,
        startDate: new Date(template.startDate),
        endDate: new Date(template.endDate),
        jsonFile: `${template.slug}.json`,
      },
    })
  }

  const contest = await db.contest.create({
    data: {
      name: data.name,
      templateId: dbTemplate.id,
      isFree: data.isFree,
      buyIn: data.isFree ? 0 : data.buyIn,
      iban: data.isFree ? null : (data.iban || null),
      paymentInstructions: data.isFree ? null : (data.paymentInstructions || null),
      status: "DRAFT",
    },
  })

  await db.contestSettings.create({
    data: {
      contestId: contest.id,
      pointsCorrectResult: data.settings.pointsCorrectResult,
      pointsExactScore: data.settings.pointsExactScore,
      pointsWrongResult: data.settings.pointsWrongResult,
      pointsWinner: data.settings.pointsWinner,
      pointsTopScorer: data.settings.pointsTopScorer,
      pointsBestAttack: data.settings.pointsBestAttack,
      pointsBestDefense: data.settings.pointsBestDefense,
      pointsGroupFirst: data.settings.pointsGroupFirst,
      pointsGroupSecond: data.settings.pointsGroupSecond,
      knockoutScoringRule: data.settings.knockoutScoringRule,
    },
  })

  const prizepool = await db.prizepool.create({
    data: {
      contestId: contest.id,
      totalAmount: data.prizepool.totalAmount,
      itmCount: data.prizepool.itmCount,
    },
  })

  await db.payout.createMany({
    data: data.prizepool.payouts.map((p) => ({
      prizepoolId: prizepool.id,
      position: p.position,
      amount: p.amount,
    })),
  })

  // Import teams
  await db.team.createMany({
    data: template.teams.map((t) => ({
      contestId: contest.id,
      name: t.name,
      code: t.code,
      flagEmoji: t.flagEmoji,
      group: t.group,
    })),
  })

  // Import groups
  for (const g of template.groups) {
    const group = await db.group.create({
      data: { contestId: contest.id, name: g.name, letter: g.letter },
    })

    const teamRecords = await db.team.findMany({
      where: { contestId: contest.id, code: { in: g.teamCodes } },
    })

    await db.groupTeam.createMany({
      data: teamRecords.map((t) => ({ groupId: group.id, teamId: t.id })),
    })
  }

  const teamMap = await db.team.findMany({
    where: { contestId: contest.id },
    select: { id: true, code: true },
  })
  const codeToId = Object.fromEntries(teamMap.map((t) => [t.code, t.id]))

  await db.match.createMany({
    data: template.groupMatches.map((m) => ({
      contestId: contest.id,
      matchNumber: m.matchNumber,
      phase: m.phase,
      kickoff: new Date(m.kickoff),
      homeTeamId: codeToId[m.homeTeamCode],
      awayTeamId: codeToId[m.awayTeamCode],
      groupLetter: m.groupLetter,
      venue: m.venue,
    })),
  })

  await db.match.createMany({
    data: template.knockoutMatches.map((m) => ({
      contestId: contest.id,
      matchNumber: m.matchNumber,
      phase: m.phase,
      kickoff: new Date(m.kickoff),
      knockoutLabel: m.knockoutLabel,
      venue: m.venue,
    })),
  })

  await db.scorerCandidate.createMany({
    data: template.scorerCandidates.map((s) => ({
      contestId: contest.id,
      name: s.name,
      teamCode: s.teamCode,
    })),
  })

  revalidatePath("/admin")
  return { success: true as const, contestId: contest.id }
}

export async function forceRebuildLeaderboard(contestId: string) {
  await requireAdmin()
  await rebuildLeaderboard(contestId)
  revalidatePath("/classement")
  revalidatePath("/admin")
  return { success: true }
}

export async function updateContestStatus(contestId: string, status: "DRAFT" | "REGISTRATION" | "ONGOING" | "FINISHED") {
  await requireAdmin()
  await db.contest.update({ where: { id: contestId }, data: { status } })
  revalidatePath("/admin")
  return { success: true }
}

export async function updateContestPayment(data: {
  contestId: string
  iban: string
  paymentInstructions: string
}) {
  await requireAdmin()
  await db.contest.update({
    where: { id: data.contestId },
    data: {
      iban: data.iban || null,
      paymentInstructions: data.paymentInstructions || null,
    },
  })
  revalidatePath("/admin/concours")
  revalidatePath("/accueil")
  return { success: true }
}

export async function updateContestPrizepool(data: {
  contestId: string
  totalAmount: number
  itmCount: number
  payouts: Array<{ position: number; amount: number }>
}) {
  await requireAdmin()

  const prizepool = await db.prizepool.findUnique({
    where: { contestId: data.contestId },
  })

  if (!prizepool) {
    const created = await db.prizepool.create({
      data: { contestId: data.contestId, totalAmount: data.totalAmount, itmCount: data.itmCount },
    })
    await db.payout.createMany({
      data: data.payouts.map((p) => ({
        prizepoolId: created.id,
        position: p.position,
        amount: p.amount,
      })),
    })
  } else {
    await db.prizepool.update({
      where: { id: prizepool.id },
      data: { totalAmount: data.totalAmount, itmCount: data.itmCount },
    })
    await db.payout.deleteMany({ where: { prizepoolId: prizepool.id } })
    await db.payout.createMany({
      data: data.payouts.map((p) => ({
        prizepoolId: prizepool.id,
        position: p.position,
        amount: p.amount,
      })),
    })
  }

  revalidatePath("/admin/concours")
  revalidatePath("/accueil")
  return { success: true }
}

export async function regenerateContestInviteToken(contestId: string) {
  await requireAdmin()
  const token = crypto.randomUUID()
  await db.contest.update({
    where: { id: contestId },
    data: { inviteToken: token },
  })
  revalidatePath("/admin/concours")
  return { success: true, token }
}

export async function togglePublicJoin(contestId: string, allowPublicJoin: boolean) {
  await requireAdmin()
  await db.contest.update({
    where: { id: contestId },
    data: { allowPublicJoin },
  })
  revalidatePath("/admin/concours")
  return { success: true, allowPublicJoin }
}

export async function fixContestFlags(contestId: string) {
  await requireAdmin()

  const teams = await db.team.findMany({ where: { contestId } })
  const { loadTournamentTemplate } = await import("@/lib/tournament")

  const allTemplates = ["world-cup-2026"]
  const emojiMap: Record<string, string> = {}

  for (const slug of allTemplates) {
    try {
      const tpl = loadTournamentTemplate(slug)
      for (const t of tpl.teams) {
        if (t.flagEmoji) emojiMap[t.code] = t.flagEmoji
      }
    } catch { /* ignore */ }
  }

  let fixed = 0
  for (const team of teams) {
    const emoji = emojiMap[team.code]
    if (emoji && team.flagEmoji !== emoji) {
      await db.team.update({ where: { id: team.id }, data: { flagEmoji: emoji } })
      fixed++
    }
  }

  revalidatePath("/pronostics")
  revalidatePath("/admin")
  return { success: true, fixed }
}

export async function updateContest(data: {
  contestId: string
  name: string
  isFree: boolean
  buyIn: number
  iban?: string
  paymentInstructions?: string
  settings: {
    pointsCorrectResult: number
    pointsExactScore: number
    pointsWrongResult: number
    pointsWinner: number
    pointsTopScorer: number
    pointsBestAttack: number
    pointsBestDefense: number
    pointsGroupFirst: number
    pointsGroupSecond: number
    knockoutScoringRule: "REGULAR_TIME" | "FULL_TIME"
  }
  prizepool: {
    totalAmount: number
    itmCount: number
    payouts: Array<{ position: number; amount: number }>
  }
}) {
  await requireAdmin()

  await db.contest.update({
    where: { id: data.contestId },
    data: {
      name: data.name,
      isFree: data.isFree,
      buyIn: data.isFree ? 0 : data.buyIn,
      iban: data.isFree ? null : (data.iban || null),
      paymentInstructions: data.isFree ? null : (data.paymentInstructions || null),
    },
  })

  await db.contestSettings.upsert({
    where: { contestId: data.contestId },
    create: {
      contestId: data.contestId,
      pointsCorrectResult: data.settings.pointsCorrectResult,
      pointsExactScore: data.settings.pointsExactScore,
      pointsWrongResult: data.settings.pointsWrongResult,
      pointsWinner: data.settings.pointsWinner,
      pointsTopScorer: data.settings.pointsTopScorer,
      pointsBestAttack: data.settings.pointsBestAttack,
      pointsBestDefense: data.settings.pointsBestDefense,
      pointsGroupFirst: data.settings.pointsGroupFirst,
      pointsGroupSecond: data.settings.pointsGroupSecond,
      knockoutScoringRule: data.settings.knockoutScoringRule,
    },
    update: {
      pointsCorrectResult: data.settings.pointsCorrectResult,
      pointsExactScore: data.settings.pointsExactScore,
      pointsWrongResult: data.settings.pointsWrongResult,
      pointsWinner: data.settings.pointsWinner,
      pointsTopScorer: data.settings.pointsTopScorer,
      pointsBestAttack: data.settings.pointsBestAttack,
      pointsBestDefense: data.settings.pointsBestDefense,
      pointsGroupFirst: data.settings.pointsGroupFirst,
      pointsGroupSecond: data.settings.pointsGroupSecond,
      knockoutScoringRule: data.settings.knockoutScoringRule,
    },
  })

  if (!data.isFree) {
    const existing = await db.prizepool.findUnique({ where: { contestId: data.contestId } })
    if (!existing) {
      const created = await db.prizepool.create({
        data: { contestId: data.contestId, totalAmount: data.prizepool.totalAmount, itmCount: data.prizepool.itmCount },
      })
      await db.payout.createMany({
        data: data.prizepool.payouts.map((p) => ({ prizepoolId: created.id, position: p.position, amount: p.amount })),
      })
    } else {
      await db.prizepool.update({
        where: { id: existing.id },
        data: { totalAmount: data.prizepool.totalAmount, itmCount: data.prizepool.itmCount },
      })
      await db.payout.deleteMany({ where: { prizepoolId: existing.id } })
      await db.payout.createMany({
        data: data.prizepool.payouts.map((p) => ({ prizepoolId: existing.id, position: p.position, amount: p.amount })),
      })
    }
  }

  revalidatePath("/admin")
  revalidatePath("/admin/concours")
  revalidatePath(`/admin/concours/${data.contestId}/modifier`)
  return { success: true as const }
}

export async function deleteContest(contestId: string) {
  await requireAdmin()
  await db.contest.delete({ where: { id: contestId } })
  revalidatePath("/admin")
  revalidatePath("/admin/concours")
  return { success: true }
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

export async function saveMatchResult(data: {
  matchId: string
  homeScore: number
  awayScore: number
  regularTimeHome?: number
  regularTimeAway?: number
  matchday?: number
}) {
  await requireAdmin()

  const match = await db.match.findUniqueOrThrow({
    where: { id: data.matchId },
    select: { contestId: true, status: true, phase: true },
  })

  const isKnockout = match.phase !== "GROUP"

  await db.match.update({
    where: { id: data.matchId },
    data: {
      homeScore: data.homeScore,
      awayScore: data.awayScore,
      regularTimeHome: isKnockout ? (data.regularTimeHome ?? null) : null,
      regularTimeAway: isKnockout ? (data.regularTimeAway ?? null) : null,
      status: "FINISHED",
    },
  })

  await recalculateMatchPredictions(data.matchId)

  if (data.matchday !== undefined) {
    await takeRankingSnapshot(match.contestId, data.matchday)
  } else {
    // Knockout matches: auto-increment snapshot matchday
    const lastSnapshot = await db.rankingSnapshot.findFirst({
      where: { contestId: match.contestId },
      orderBy: { matchday: "desc" },
      select: { matchday: true },
    })
    await takeRankingSnapshot(match.contestId, (lastSnapshot?.matchday ?? 0) + 1)
  }

  // Auto-update bracket after every match
  if (match.phase === "GROUP") {
    await resolveRoundOf32Teams(match.contestId)
  } else {
    await resolveKnockoutProgression(match.contestId)
  }

  revalidatePath("/admin/resultats")
  revalidatePath("/admin/tableau")
  revalidatePath("/classement")
  revalidatePath("/pronostics")
  revalidatePath("/competition")
  return { success: true as const }
}

// ---------------------------------------------------------------------------
// Round of 32 auto-resolution from group standings
// ---------------------------------------------------------------------------

export async function resolveRoundOf32Teams(contestId: string) {
  // Fetch all group matches with results
  const groupMatches = await db.match.findMany({
    where: { contestId, phase: "GROUP", homeTeamId: { not: null } },
    include: { homeTeam: true, awayTeam: true },
  })

  // Fetch all teams with their group info
  const teams = await db.team.findMany({ where: { contestId } })
  const teamMeta: Record<string, { name: string; flagEmoji: string | null }> = {}
  for (const t of teams) teamMeta[t.code] = { name: t.name, flagEmoji: t.flagEmoji }

  // Fetch group structure
  const groups = await db.group.findMany({
    where: { contestId },
    include: { teams: { include: { team: true } } },
    orderBy: { letter: "asc" },
  })

  // Build match results for engine
  const results: MatchResult[] = groupMatches
    .filter((m) => m.homeScore !== null && m.awayScore !== null && m.homeTeam && m.awayTeam)
    .map((m) => ({
      homeTeamCode: m.homeTeam!.code,
      awayTeamCode: m.awayTeam!.code,
      homeScore: m.homeScore!,
      awayScore: m.awayScore!,
      groupLetter: m.groupLetter ?? "",
    }))

  // Compute standings per group
  const allGroupStandings: GroupStandings[] = groups.map((group) => {
    const teamCodes = group.teams.map((gt) => gt.team.code)
    return {
      letter: group.letter,
      teams: computeGroupStandings(group.letter, teamCodes, teamMeta, results),
    }
  })

  const bestThirds = getBestThirdPlaceTeams(allGroupStandings)
  const matchups = resolveRoundOf32(allGroupStandings, bestThirds)

  // Build code→id map
  const teamIdByCode: Record<string, string> = {}
  for (const t of teams) teamIdByCode[t.code] = t.id

  // Fetch existing ROUND_OF_32 matches
  const roundOf32Matches = await db.match.findMany({
    where: { contestId, phase: "ROUND_OF_32" },
    select: { id: true, matchNumber: true },
  })
  const matchByNumber: Record<number, string> = {}
  for (const m of roundOf32Matches) matchByNumber[m.matchNumber] = m.id

  // Update each match with resolved teams
  await Promise.all(
    matchups.map(({ matchNumber, homeTeamCode, awayTeamCode }) => {
      const matchId = matchByNumber[matchNumber]
      if (!matchId) return Promise.resolve()
      return db.match.update({
        where: { id: matchId },
        data: {
          homeTeamId: homeTeamCode ? (teamIdByCode[homeTeamCode] ?? null) : null,
          awayTeamId: awayTeamCode ? (teamIdByCode[awayTeamCode] ?? null) : null,
        },
      })
    })
  )

  revalidatePath("/admin/tableau")
  revalidatePath("/pronostics")
}

// ---------------------------------------------------------------------------
// Knockout progression — propagate winners/losers through the bracket
// ---------------------------------------------------------------------------

export async function resolveKnockoutProgression(contestId: string) {
  // Fetch all knockout matches (finished or not) with teams
  const knockoutMatches = await db.match.findMany({
    where: {
      contestId,
      phase: { in: ["ROUND_OF_32", "ROUND_OF_16", "QUARTER_FINAL", "SEMI_FINAL", "THIRD_PLACE", "FINAL"] },
    },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { matchNumber: "asc" },
  })

  // Index by matchNumber for quick lookup
  const byNumber: Record<number, typeof knockoutMatches[0]> = {}
  for (const m of knockoutMatches) byNumber[m.matchNumber] = m

  // Index by short prefix (e.g. "QF1", "SF1") extracted from knockoutLabel
  // Label format: "QF1 - Vainqueur 89 vs Vainqueur 90" → prefix = "QF1"
  const byPrefix: Record<string, typeof knockoutMatches[0]> = {}
  for (const m of knockoutMatches) {
    const prefixMatch = m.knockoutLabel?.match(/^([A-Z]+\d+)\s*-/)
    if (prefixMatch) byPrefix[prefixMatch[1]] = m
  }

  // Helper: get winner teamId of a finished knockout match.
  // Convention for draws resolved by penalties:
  //   - regularTimeHome = regularTimeAway (the 90+ET score, equal)
  //   - homeScore / awayScore = the penalty shootout score (e.g. 4-3)
  //   → homeScore > awayScore means home team won on penalties
  // So comparing homeScore vs awayScore always gives the correct winner.
  const winnerId = (matchNum: number): string | null => {
    const m = byNumber[matchNum]
    if (!m || m.status !== "FINISHED" || m.homeScore === null || m.awayScore === null) return null
    if (m.homeScore > m.awayScore) return m.homeTeamId ?? null
    if (m.awayScore > m.homeScore) return m.awayTeamId ?? null
    return null // still level — admin must correct the result
  }

  // Helper: get loser teamId of a finished knockout match (for 3rd place).
  const loserId = (matchNum: number): string | null => {
    const m = byNumber[matchNum]
    if (!m || m.status !== "FINISHED" || m.homeScore === null || m.awayScore === null) return null
    if (m.homeScore > m.awayScore) return m.awayTeamId ?? null
    if (m.awayScore > m.homeScore) return m.homeTeamId ?? null
    return null
  }

  // Resolve a slot reference from a label fragment like "Vainqueur 89" or "Vainqueur QF1"
  const resolveWinner = (ref: string): string | null => {
    // "Vainqueur 89" → match number
    const numMatch = ref.match(/\b(\d{2,3})\b/)
    if (numMatch) return winnerId(parseInt(numMatch[1]))
    // "Vainqueur QF1" → find match with prefix QF1
    const prefixMatch = ref.match(/([A-Z]+\d+)/)
    if (prefixMatch) {
      const refMatch = byPrefix[prefixMatch[1]]
      if (refMatch) return winnerId(refMatch.matchNumber)
    }
    return null
  }

  const resolveLoser = (ref: string): string | null => {
    const numMatch = ref.match(/\b(\d{2,3})\b/)
    if (numMatch) return loserId(parseInt(numMatch[1]))
    const prefixMatch = ref.match(/([A-Z]+\d+)/)
    if (prefixMatch) {
      const refMatch = byPrefix[prefixMatch[1]]
      if (refMatch) return loserId(refMatch.matchNumber)
    }
    return null
  }

  // Parse label into home/away slot references
  // Strips leading prefix like "SF1 - " or "3e place - " then splits on " vs "
  const parseSlots = (label: string): [string, string] | null => {
    const cleaned = label.replace(/^.+?\s*-\s*/, "").trim()
    const parts = cleaned.split(/\s+vs\s+/i)
    if (parts.length === 2) return [parts[0].trim(), parts[1].trim()]
    return null
  }

  const updates: Array<{ id: string; homeTeamId: string | null; awayTeamId: string | null }> = []

  for (const match of knockoutMatches) {
    // Skip if already has both teams and match is finished (don't overwrite)
    if (match.homeTeamId && match.awayTeamId) continue

    const label = match.knockoutLabel ?? ""

    // 3e place: losers of the two semi-finals
    if (match.phase === "THIRD_PLACE") {
      const slots = parseSlots(label)
      const home = slots ? resolveLoser(slots[0]) : loserId(101)
      const away = slots ? resolveLoser(slots[1]) : loserId(102)
      if (home !== match.homeTeamId || away !== match.awayTeamId) {
        updates.push({ id: match.id, homeTeamId: home, awayTeamId: away })
      }
      continue
    }

    // General case: winners of referenced matches
    const slots = parseSlots(label)
    if (!slots) continue

    const home = resolveWinner(slots[0])
    const away = resolveWinner(slots[1])

    if (home !== match.homeTeamId || away !== match.awayTeamId) {
      updates.push({ id: match.id, homeTeamId: home, awayTeamId: away })
    }
  }

  // Apply updates
  await Promise.all(
    updates.map((u) =>
      db.match.update({
        where: { id: u.id },
        data: { homeTeamId: u.homeTeamId, awayTeamId: u.awayTeamId },
      })
    )
  )

  revalidatePath("/admin/tableau")
  revalidatePath("/admin/knockout")
  revalidatePath("/pronostics")
  revalidatePath("/competition")
}

// ---------------------------------------------------------------------------
// Knockout team assignment
// ---------------------------------------------------------------------------

export async function assignKnockoutTeam(data: {
  matchId: string
  homeTeamId?: string
  awayTeamId?: string
}): Promise<{ success: true } | { success: false; error: string }> {
  await requireAdmin()

  await db.match.update({
    where: { id: data.matchId },
    data: {
      homeTeamId: data.homeTeamId,
      awayTeamId: data.awayTeamId,
    },
  })

  revalidatePath("/admin/knockout")
  revalidatePath("/pronostics")
  return { success: true as const }
}

// ---------------------------------------------------------------------------
// Participants
// ---------------------------------------------------------------------------

export async function toggleParticipantPaid(participantId: string, hasPaid: boolean) {
  await requireAdmin()
  await db.contestParticipant.update({
    where: { id: participantId },
    data: { hasPaid },
  })
  revalidatePath("/admin/participants")
  return { success: true }
}

export async function createManualUser(data: {
  firstName: string
  lastName: string
  email: string
  contestId?: string
}) {
  await requireAdmin()

  let user = await db.user.findUnique({ where: { email: data.email } })

  if (!user) {
    user = await db.user.create({
      data: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        name: `${data.firstName} ${data.lastName}`,
        avatarSeed: data.email,
        role: "USER",
      },
    })
  }

  if (data.contestId) {
    const alreadyIn = await db.contestParticipant.findUnique({
      where: { contestId_userId: { contestId: data.contestId, userId: user.id } },
    })
    if (alreadyIn) return { error: `${user.firstName || data.firstName} est déjà inscrit à ce concours.` }

    await db.contestParticipant.create({
      data: { contestId: data.contestId, userId: user.id },
    })
    await db.leaderboardEntry.create({
      data: { contestId: data.contestId, userId: user.id },
    }).catch(() => {})
    revalidatePath("/admin/participants")
  }

  return { success: true, userId: user.id }
}

// ---------------------------------------------------------------------------
// Scorer candidates
// ---------------------------------------------------------------------------

export async function addScorerCandidate(data: {
  contestId: string
  name: string
  teamCode: string
}) {
  await requireAdmin()
  await db.scorerCandidate.create({ data })
  revalidatePath("/admin")
  return { success: true }
}

export async function syncScorerCandidatesFromTemplate(contestId: string) {
  await requireAdmin()

  const contest = await db.contest.findUnique({
    where: { id: contestId },
    include: { template: true },
  })
  if (!contest) return { error: "Concours introuvable." }

  const { loadTournamentTemplate } = await import("@/lib/tournament")
  let template
  try {
    template = loadTournamentTemplate(contest.template.slug)
  } catch {
    return { error: "Template introuvable." }
  }

  if (!template.scorerCandidates || template.scorerCandidates.length === 0) {
    return { error: "Aucun candidat dans le template." }
  }

  // Upsert chaque candidat (ignore les doublons)
  let added = 0
  for (const s of template.scorerCandidates) {
    const existing = await db.scorerCandidate.findFirst({
      where: { contestId, name: s.name },
    })
    if (!existing) {
      await db.scorerCandidate.create({
        data: { contestId, name: s.name, teamCode: s.teamCode },
      })
      added++
    }
  }

  revalidatePath("/admin/bonus")
  revalidatePath("/pronostics")
  return { success: true, added, total: template.scorerCandidates.length }
}

export async function markScorerWinner(data: {
  scorerCandidateId: string
  contestId: string
}) {
  await requireAdmin()

  await db.scorerCandidate.update({
    where: { id: data.scorerCandidateId },
    data: { isWinner: true },
  })

  await rebuildLeaderboard(data.contestId)

  revalidatePath("/admin")
  return { success: true }
}

export async function applyBonusResults(data: {
  contestId: string
  winnerId: string | null
  topScorerIds: string[]
  bestAttackIds: string[]
  bestDefenseIds: string[]
}) {
  await requireAdmin()

  const settings = await db.contestSettings.findUnique({ where: { contestId: data.contestId } })
  if (!settings) return { error: "Paramètres du concours introuvables." }

  const allPredictions = await db.tournamentPrediction.findMany({
    where: { contestId: data.contestId },
  })

  await Promise.all(
    allPredictions.map(async (pred) => {
      let points = 0

      if (data.winnerId && pred.winnerId === data.winnerId) {
        points += settings.pointsWinner
      }
      if (data.topScorerIds.length > 0 && pred.topScorerId && data.topScorerIds.includes(pred.topScorerId)) {
        points += settings.pointsTopScorer
      }
      if (data.bestAttackIds.length > 0 && pred.bestAttackId && data.bestAttackIds.includes(pred.bestAttackId)) {
        points += settings.pointsBestAttack
      }
      if (data.bestDefenseIds.length > 0 && pred.bestDefenseId && data.bestDefenseIds.includes(pred.bestDefenseId)) {
        points += settings.pointsBestDefense
      }

      await db.tournamentPrediction.update({
        where: { id: pred.id },
        data: { points },
      })
    })
  )

  await rebuildLeaderboard(data.contestId)

  // Snapshot after bonus so the chart reflects the final standings change
  const lastSnapshot = await db.rankingSnapshot.findFirst({
    where: { contestId: data.contestId },
    orderBy: { matchday: "desc" },
    select: { matchday: true },
  })
  const bonusMatchday = (lastSnapshot?.matchday ?? 0) + 1
  await takeRankingSnapshot(data.contestId, bonusMatchday)

  revalidatePath("/admin/bonus")
  revalidatePath("/classement")
  return { success: true }
}
