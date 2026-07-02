import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { computeGroupStandings, getBestThirdPlaceTeams, resolveRoundOf32, type MatchResult, type GroupStandings } from "@/lib/wc2026-standings"
import { CompetitionTab } from "@/components/predictions/tabs/competition-tab"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Compétition" }

export default async function CompetitionPage({
  searchParams,
}: {
  searchParams: Promise<{ contestId?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const userId = session.user.id

  const { contestId: requestedId } = await searchParams

  const myParticipation = await db.contestParticipant.findFirst({
    where: {
      userId,
      contest: { status: { in: ["ONGOING", "REGISTRATION", "DRAFT"] } },
      ...(requestedId ? { contestId: requestedId } : {}),
    },
    include: { contest: true },
    orderBy: { joinedAt: "desc" },
  })

  const contest = myParticipation?.contest ?? null

  if (!contest) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <div className="text-5xl">⚽</div>
        <p className="text-[var(--foreground-muted)]">Aucun concours actif pour le moment.</p>
      </div>
    )
  }

  const [groups, teams, groupMatches, knockoutMatches] = await Promise.all([
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
    db.match.findMany({
      where: {
        contestId: contest.id,
        phase: { in: ["ROUND_OF_16", "QUARTER_FINAL", "SEMI_FINAL", "THIRD_PLACE", "FINAL"] },
      },
      include: { homeTeam: true, awayTeam: true },
      orderBy: { matchNumber: "asc" },
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
        knockoutMatches={knockoutMatches.map((m) => ({
          matchNumber: m.matchNumber,
          phase: m.phase,
          knockoutLabel: m.knockoutLabel,
          homeTeam: m.homeTeam ? { name: m.homeTeam.name, flagEmoji: m.homeTeam.flagEmoji, code: m.homeTeam.code } : null,
          awayTeam: m.awayTeam ? { name: m.awayTeam.name, flagEmoji: m.awayTeam.flagEmoji, code: m.awayTeam.code } : null,
          homeScore: m.homeScore,
          awayScore: m.awayScore,
          regularTimeHome: m.regularTimeHome,
          regularTimeAway: m.regularTimeAway,
          extraTimeHome: m.extraTimeHome,
          extraTimeAway: m.extraTimeAway,
          status: m.status,
        }))}
      />
    </div>
  )
}
