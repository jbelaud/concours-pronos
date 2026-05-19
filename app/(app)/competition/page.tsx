import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { computeGroupStandings, getBestThirdPlaceTeams, resolveRoundOf32, type MatchResult, type GroupStandings } from "@/lib/wc2026-standings"
import { CompetitionTab } from "@/components/predictions/tabs/competition-tab"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Compétition" }

export default async function CompetitionPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const contest = await db.contest.findFirst({
    where: { status: { in: ["ONGOING", "REGISTRATION", "DRAFT"] } },
    orderBy: { createdAt: "desc" },
  })

  if (!contest) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <div className="text-5xl">⚽</div>
        <p className="text-[var(--foreground-muted)]">Aucun concours actif pour le moment.</p>
      </div>
    )
  }

  const [groups, teams, groupMatches] = await Promise.all([
    db.group.findMany({
      where: { contestId: contest.id },
      orderBy: { letter: "asc" },
      include: { teams: { include: { team: true } } },
    }),
    db.team.findMany({ where: { contestId: contest.id } }),
    db.match.findMany({
      where: { contestId: contest.id, phase: "GROUP", homeTeamId: { not: null } },
      include: { homeTeam: true, awayTeam: true },
    }),
  ])

  const teamMeta: Record<string, { name: string; flagEmoji: string | null }> = {}
  for (const t of teams) teamMeta[t.code] = { name: t.name, flagEmoji: t.flagEmoji }

  const results: MatchResult[] = groupMatches
    .filter((m) => m.homeScore !== null && m.awayScore !== null && m.homeTeam && m.awayTeam)
    .map((m) => ({
      homeTeamCode: m.homeTeam!.code,
      awayTeamCode: m.awayTeam!.code,
      homeScore: m.homeScore!,
      awayScore: m.awayScore!,
      groupLetter: m.groupLetter ?? "",
    }))

  const allGroupStandings: GroupStandings[] = groups.map((group) => ({
    letter: group.letter,
    teams: computeGroupStandings(
      group.letter,
      group.teams.map((gt) => gt.team.code),
      teamMeta,
      results
    ),
  }))

  const bestThirds = getBestThirdPlaceTeams(allGroupStandings)
  const roundOf32Matchups = resolveRoundOf32(allGroupStandings, bestThirds)

  return (
    <div className="flex flex-col gap-4 pb-6">
      <div>
        <h1 className="text-2xl font-black text-[var(--foreground)]">Compétition</h1>
        <p className="text-sm text-[var(--foreground-muted)]">{contest.name}</p>
      </div>
      <CompetitionTab
        allGroupStandings={allGroupStandings}
        bestThirds={bestThirds}
        roundOf32Matchups={roundOf32Matchups}
      />
    </div>
  )
}
