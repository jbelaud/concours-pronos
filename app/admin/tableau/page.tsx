import { db } from "@/lib/db"
import { computeGroupStandings, getBestThirdPlaceTeams, resolveRoundOf32, type MatchResult, type GroupStandings, type TeamStanding } from "@/lib/wc2026-standings"
import { cn } from "@/lib/utils"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Tableau de compétition" }

interface Props {
  searchParams: Promise<{ contestId?: string }>
}

export default async function TableauPage({ searchParams }: Props) {
  const { contestId } = await searchParams

  const contest = contestId
    ? await db.contest.findUnique({ where: { id: contestId } })
    : await db.contest.findFirst({
        where: { status: { in: ["ONGOING", "REGISTRATION", "DRAFT"] } },
        orderBy: { createdAt: "desc" },
      })

  if (!contest) {
    return <div className="text-center py-20 text-[var(--foreground-muted)] text-sm">Aucun concours sélectionné.</div>
  }

  // Fetch groups with teams
  const groups = await db.group.findMany({
    where: { contestId: contest.id },
    orderBy: { letter: "asc" },
    include: { teams: { include: { team: true } } },
  })

  // Fetch all finished group matches
  const groupMatches = await db.match.findMany({
    where: { contestId: contest.id, phase: "GROUP", homeTeamId: { not: null } },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { kickoff: "asc" },
  })

  // Fetch Round of 32 matches (to show resolved bracket)
  const roundOf32 = await db.match.findMany({
    where: { contestId: contest.id, phase: "ROUND_OF_32" },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { matchNumber: "asc" },
  })

  // Build engine inputs
  const teamMeta: Record<string, { name: string; flagEmoji: string | null }> = {}
  for (const g of groups) {
    for (const gt of g.teams) {
      teamMeta[gt.team.code] = { name: gt.team.name, flagEmoji: gt.team.flagEmoji }
    }
  }

  const results: MatchResult[] = groupMatches
    .filter((m) => m.homeScore !== null && m.awayScore !== null && m.homeTeam && m.awayTeam)
    .map((m) => ({
      homeTeamCode: m.homeTeam!.code,
      awayTeamCode: m.awayTeam!.code,
      homeScore: m.homeScore!,
      awayScore: m.awayScore!,
      groupLetter: m.groupLetter ?? "",
    }))

  // Compute standings
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
  const matchups = resolveRoundOf32(allGroupStandings, bestThirds)

  const totalGroupMatches = groups.length * 6 // 12 groups × 6 matches each
  const playedGroupMatches = results.length
  const groupsCompleted = allGroupStandings.filter(
    (g) => results.filter((r) => r.groupLetter === g.letter).length === 6
  ).length

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-black text-[var(--foreground)]">Tableau de compétition</h1>
        <p className="text-sm text-[var(--foreground-muted)]">
          {contest.name} · {playedGroupMatches}/{totalGroupMatches} matchs joués · {groupsCompleted}/12 groupes terminés
        </p>
      </div>

      {/* Best thirds summary */}
      <BestThirdsPanel thirds={allGroupStandings.map((g) => g.teams.find((t) => t.position === 3)!).filter(Boolean)} bestThirds={bestThirds} />

      {/* Groups grid */}
      <div className="flex flex-col gap-4">
        {allGroupStandings.map((g) => (
          <GroupTable key={g.letter} standings={g} />
        ))}
      </div>

      {/* Round of 32 bracket preview */}
      <RoundOf32Panel matchups={matchups} roundOf32={roundOf32} />
    </div>
  )
}

// ── Group table ───────────────────────────────────────────────────────────────

function GroupTable({ standings }: { standings: GroupStandings }) {
  return (
    <div className="surface-card overflow-hidden">
      <div className="px-3 py-2 border-b border-[var(--border)] flex items-center justify-between">
        <span className="text-xs font-bold text-[var(--foreground)]">Groupe {standings.letter}</span>
        <span className="text-[10px] text-[var(--foreground-subtle)]">
          {standings.teams[0]?.played * standings.teams.length > 0
            ? `${standings.teams.reduce((s, t) => s + t.played, 0) / 2} / 6 matchs`
            : "0 / 6 matchs"}
        </span>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-[10px] text-[var(--foreground-subtle)] border-b border-[var(--border)]">
            <th className="text-left px-3 py-1.5 font-medium w-6">#</th>
            <th className="text-left px-2 py-1.5 font-medium">Équipe</th>
            <th className="text-center px-1 py-1.5 font-medium w-6">J</th>
            <th className="text-center px-1 py-1.5 font-medium w-6">G</th>
            <th className="text-center px-1 py-1.5 font-medium w-6">N</th>
            <th className="text-center px-1 py-1.5 font-medium w-6">P</th>
            <th className="text-center px-1 py-1.5 font-medium w-8">BP</th>
            <th className="text-center px-1 py-1.5 font-medium w-8">BC</th>
            <th className="text-center px-1 py-1.5 font-medium w-8">DB</th>
            <th className="text-center px-2 py-1.5 font-bold w-8">Pts</th>
          </tr>
        </thead>
        <tbody>
          {standings.teams.map((team) => {
            const qualifies = team.position <= 2
            const isThird = team.position === 3
            return (
              <tr
                key={team.code}
                className={cn(
                  "border-b border-[var(--border)] last:border-0",
                  qualifies && "bg-[var(--success-dim)]",
                  isThird && "bg-[var(--warning-dim)]"
                )}
              >
                <td className="px-3 py-2 text-[var(--foreground-subtle)]">
                  {team.position === 1 ? "🥇" : team.position === 2 ? "🥈" : team.position === 3 ? "🥉" : "4"}
                </td>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm leading-none">{team.flagEmoji ?? "🏳️"}</span>
                    <span className={cn("font-medium truncate max-w-[100px]", qualifies ? "text-[var(--foreground)]" : "text-[var(--foreground-muted)]")}>
                      {team.name}
                    </span>
                  </div>
                </td>
                <td className="text-center px-1 py-2 text-[var(--foreground-muted)]">{team.played}</td>
                <td className="text-center px-1 py-2 text-[var(--foreground-muted)]">{team.won}</td>
                <td className="text-center px-1 py-2 text-[var(--foreground-muted)]">{team.drawn}</td>
                <td className="text-center px-1 py-2 text-[var(--foreground-muted)]">{team.lost}</td>
                <td className="text-center px-1 py-2 text-[var(--foreground-muted)]">{team.goalsFor}</td>
                <td className="text-center px-1 py-2 text-[var(--foreground-muted)]">{team.goalsAgainst}</td>
                <td className={cn("text-center px-1 py-2 font-medium", team.goalDiff > 0 ? "text-[var(--success)]" : team.goalDiff < 0 ? "text-[var(--error)]" : "text-[var(--foreground-muted)]")}>
                  {team.goalDiff > 0 ? `+${team.goalDiff}` : team.goalDiff}
                </td>
                <td className="text-center px-2 py-2 font-black text-[var(--foreground)]">{team.points}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="px-3 py-1.5 flex items-center gap-3 text-[9px] text-[var(--foreground-subtle)]">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[var(--success)]/30 inline-block" /> Qualifié</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[var(--warning)]/30 inline-block" /> Pot meilleurs 3es</span>
      </div>
    </div>
  )
}

// ── Best thirds panel ─────────────────────────────────────────────────────────

function BestThirdsPanel({ thirds, bestThirds }: { thirds: TeamStanding[]; bestThirds: TeamStanding[] }) {
  if (thirds.length === 0) return null
  const bestCodes = new Set(bestThirds.map((t) => t.code))

  return (
    <div className="surface-card overflow-hidden">
      <div className="px-3 py-2 border-b border-[var(--border)]">
        <span className="text-xs font-bold text-[var(--foreground)]">Meilleurs 3es — classement</span>
        <span className="text-[10px] text-[var(--foreground-subtle)] ml-2">8 qualifiés sur 12</span>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-[10px] text-[var(--foreground-subtle)] border-b border-[var(--border)]">
            <th className="text-left px-3 py-1.5 font-medium w-6">#</th>
            <th className="text-left px-2 py-1.5 font-medium">Équipe</th>
            <th className="text-center px-1 py-1.5 font-medium w-8">Pts</th>
            <th className="text-center px-1 py-1.5 font-medium w-8">DB</th>
            <th className="text-center px-1 py-1.5 font-medium w-8">BP</th>
            <th className="text-right px-3 py-1.5 font-medium">Statut</th>
          </tr>
        </thead>
        <tbody>
          {thirds.map((t, i) => {
            const qualifies = bestCodes.has(t.code)
            return (
              <tr key={t.code} className={cn("border-b border-[var(--border)] last:border-0", qualifies && "bg-[var(--success-dim)]")}>
                <td className="px-3 py-2 text-[var(--foreground-subtle)] font-medium">{i + 1}</td>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm leading-none">{t.flagEmoji ?? "🏳️"}</span>
                    <span className="font-medium text-[var(--foreground)] truncate max-w-[90px]">{t.name}</span>
                    <span className="text-[10px] text-[var(--foreground-subtle)]">Gr. {t.groupLetter}</span>
                  </div>
                </td>
                <td className="text-center px-1 py-2 font-black text-[var(--foreground)]">{t.points}</td>
                <td className={cn("text-center px-1 py-2 font-medium", t.goalDiff > 0 ? "text-[var(--success)]" : t.goalDiff < 0 ? "text-[var(--error)]" : "text-[var(--foreground-muted)]")}>
                  {t.goalDiff > 0 ? `+${t.goalDiff}` : t.goalDiff}
                </td>
                <td className="text-center px-1 py-2 text-[var(--foreground-muted)]">{t.goalsFor}</td>
                <td className="text-right px-3 py-2">
                  {qualifies
                    ? <span className="text-[10px] font-semibold text-[var(--success)]">✓ Qualifié</span>
                    : <span className="text-[10px] text-[var(--foreground-subtle)]">Éliminé</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Round of 32 bracket ───────────────────────────────────────────────────────

function RoundOf32Panel({
  matchups,
  roundOf32,
}: {
  matchups: ReturnType<typeof resolveRoundOf32>
  roundOf32: Array<{ matchNumber: number; knockoutLabel: string | null; homeTeam: { name: string; flagEmoji: string | null } | null; awayTeam: { name: string; flagEmoji: string | null } | null }>
}) {
  const matchByNumber = Object.fromEntries(roundOf32.map((m) => [m.matchNumber, m]))

  return (
    <div className="surface-card overflow-hidden">
      <div className="px-3 py-2 border-b border-[var(--border)]">
        <span className="text-xs font-bold text-[var(--foreground)]">1/16 de finale — bracket live</span>
        <span className="text-[10px] text-[var(--foreground-subtle)] ml-2">Mis à jour à chaque résultat de groupe</span>
      </div>
      <div className="flex flex-col gap-0">
        {matchups.map(({ matchNumber, homeTeamCode, awayTeamCode, homeLabel, awayLabel }) => {
          const dbMatch = matchByNumber[matchNumber]
          const homeName = dbMatch?.homeTeam?.name ?? (homeTeamCode ? homeTeamCode : homeLabel)
          const awayName = dbMatch?.awayTeam?.name ?? (awayTeamCode ? awayTeamCode : awayLabel)
          const homeFlag = dbMatch?.homeTeam?.flagEmoji
          const awayFlag = dbMatch?.awayTeam?.flagEmoji
          const isResolved = !!homeTeamCode && !!awayTeamCode

          return (
            <div
              key={matchNumber}
              className={cn(
                "flex items-center gap-2 px-3 py-2.5 border-b border-[var(--border)] last:border-0",
                isResolved ? "bg-[var(--accent-dim)]" : ""
              )}
            >
              <span className="text-[10px] text-[var(--foreground-subtle)] w-6 shrink-0 font-mono">M{matchNumber}</span>
              <div className="flex-1 flex items-center gap-1 min-w-0">
                {homeFlag && <span className="text-base leading-none shrink-0">{homeFlag}</span>}
                <span className={cn("text-xs truncate", isResolved ? "text-[var(--foreground)] font-semibold" : "text-[var(--foreground-muted)] italic")}>
                  {homeName}
                </span>
              </div>
              <span className="text-[10px] text-[var(--foreground-subtle)] shrink-0">vs</span>
              <div className="flex-1 flex items-center gap-1 justify-end min-w-0">
                <span className={cn("text-xs truncate text-right", isResolved ? "text-[var(--foreground)] font-semibold" : "text-[var(--foreground-muted)] italic")}>
                  {awayName}
                </span>
                {awayFlag && <span className="text-base leading-none shrink-0">{awayFlag}</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
