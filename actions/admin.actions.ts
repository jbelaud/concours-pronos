"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { loadTournamentTemplate } from "@/lib/tournament"
import { recalculateMatchPredictions, rebuildLeaderboard, takeRankingSnapshot } from "@/lib/ranking"
import { revalidatePath } from "next/cache"

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
      buyIn: data.buyIn,
      iban: data.iban || null,
      paymentInstructions: data.paymentInstructions || null,
      status: "DRAFT",
    },
  })

  await db.contestSettings.create({
    data: { contestId: contest.id, ...data.settings },
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
  matchday?: number
}) {
  await requireAdmin()

  const match = await db.match.findUniqueOrThrow({
    where: { id: data.matchId },
    select: { contestId: true, status: true },
  })

  await db.match.update({
    where: { id: data.matchId },
    data: {
      homeScore: data.homeScore,
      awayScore: data.awayScore,
      status: "FINISHED",
    },
  })

  await recalculateMatchPredictions(data.matchId)

  if (data.matchday !== undefined) {
    await takeRankingSnapshot(match.contestId, data.matchday)
  }

  revalidatePath("/admin/resultats")
  revalidatePath("/classement")
  revalidatePath("/pronostics")
  return { success: true as const }
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
