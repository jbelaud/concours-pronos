import { db } from "@/lib/db"
import { BonusManager } from "@/components/admin/bonus-manager"
import { GroupBonusManager } from "@/components/admin/group-bonus-manager"
import { SyncScorersButton } from "@/components/admin/sync-scorers-button"
import { getGroupStandingsForAdmin } from "@/actions/admin.actions"
import Link from "next/link"
import { cn } from "@/lib/utils"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Bonus & Résultats finaux" }

interface Props {
  searchParams: Promise<{ contestId?: string }>
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  REGISTRATION: "Inscriptions",
  ONGOING: "En cours",
  FINISHED: "Terminé",
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "text-[var(--foreground-muted)]",
  REGISTRATION: "text-[var(--accent)]",
  ONGOING: "text-[var(--success)]",
  FINISHED: "text-[var(--foreground-subtle)]",
}

export default async function BonusPage({ searchParams }: Props) {
  const { contestId } = await searchParams

  const allContests = await db.contest.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, status: true },
  })

  const contest = contestId
    ? await db.contest.findUnique({ where: { id: contestId }, include: { settings: true } })
    : await db.contest.findFirst({
        where: { status: { in: ["ONGOING", "FINISHED"] } },
        orderBy: { createdAt: "desc" },
        include: { settings: true },
      })

  const teams = contest
    ? await db.team.findMany({
        where: { contestId: contest.id },
        orderBy: [{ group: "asc" }, { name: "asc" }],
      })
    : []

  const scorerCandidates = contest
    ? await db.scorerCandidate.findMany({
        where: { contestId: contest.id },
        orderBy: { name: "asc" },
      })
    : []

  // Winner: infer from finished final match
  const finalMatch = contest
    ? await db.match.findFirst({
        where: { contestId: contest.id, phase: "FINAL", status: "FINISHED" },
        include: { homeTeam: true, awayTeam: true },
      })
    : null

  let currentWinnerId: string | null = null
  if (finalMatch?.homeScore !== null && finalMatch?.awayScore !== null) {
    if ((finalMatch?.homeScore ?? 0) > (finalMatch?.awayScore ?? 0)) currentWinnerId = finalMatch?.homeTeamId ?? null
    else if ((finalMatch?.awayScore ?? 0) > (finalMatch?.homeScore ?? 0)) currentWinnerId = finalMatch?.awayTeamId ?? null
  }

  const currentTopScorerIds = scorerCandidates.filter((s) => s.isWinner).map((s) => s.id)

  // Compute best attack / defense across ALL finished matches (groups + knockout)
  // Penalties (TAB) are excluded: use regularTimeHome/Away when available, otherwise homeScore/awayScore
  let initialBestAttackIds: string[] = []
  let initialBestDefenseIds: string[] = []

  let allMatchesFinished = false
  const groupStandings = contest ? await getGroupStandingsForAdmin(contest.id) : []

  if (contest) {
    const [totalMatches, allFinishedMatches] = await Promise.all([
      db.match.count({ where: { contestId: contest.id } }),
      db.match.findMany({
        where: { contestId: contest.id, status: "FINISHED" },
        include: { homeTeam: true, awayTeam: true },
      }),
    ])
    allMatchesFinished = allFinishedMatches.length === totalMatches

    // Tally goals for/against per team, ignoring penalty shootout goals
    const goalsFor: Record<string, number> = {}
    const goalsAgainst: Record<string, number> = {}

    for (const m of allFinishedMatches) {
      if (!m.homeTeam || !m.awayTeam) continue
      // regularTimeHome/Away = goals at 90'+ET (no penalties); fall back to homeScore/awayScore for group matches
      const hg = m.regularTimeHome ?? m.homeScore ?? 0
      const ag = m.regularTimeAway ?? m.awayScore ?? 0
      goalsFor[m.homeTeam.id] = (goalsFor[m.homeTeam.id] ?? 0) + hg
      goalsFor[m.awayTeam.id] = (goalsFor[m.awayTeam.id] ?? 0) + ag
      goalsAgainst[m.homeTeam.id] = (goalsAgainst[m.homeTeam.id] ?? 0) + ag
      goalsAgainst[m.awayTeam.id] = (goalsAgainst[m.awayTeam.id] ?? 0) + hg
    }

    const teamIds = Object.keys(goalsFor)
    if (teamIds.length > 0) {
      const maxGF = Math.max(...teamIds.map((id) => goalsFor[id] ?? 0))
      const minGA = Math.min(...teamIds.map((id) => goalsAgainst[id] ?? 0))

      initialBestAttackIds = teams.filter((t) => (goalsFor[t.id] ?? 0) === maxGF).map((t) => t.id)
      initialBestDefenseIds = teams.filter((t) => (goalsAgainst[t.id] ?? 0) === minGA).map((t) => t.id)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-black text-[var(--foreground)]">Bonus & Résultats finaux</h1>
        <p className="text-xs text-[var(--foreground-muted)] mt-1">
          Désigne les lauréats pour attribuer les points bonus à tous les participants.
        </p>
      </div>

      {allContests.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {allContests.map((c) => {
            const isActive = contest?.id === c.id
            return (
              <Link
                key={c.id}
                href={`/admin/bonus?contestId=${c.id}`}
                className={cn(
                  "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all",
                  isActive
                    ? "gradient-accent text-white border-transparent"
                    : "bg-[var(--surface-elevated)] text-[var(--foreground-muted)] border-[var(--border)] hover:border-[var(--accent)]/40"
                )}
              >
                {c.name}
                <span className={cn("text-[10px] font-medium", isActive ? "text-white/70" : STATUS_COLORS[c.status])}>
                  · {STATUS_LABELS[c.status]}
                </span>
              </Link>
            )
          })}
        </div>
      )}

      {!contest ? (
        <div className="text-center py-20 text-[var(--foreground-muted)] text-sm">
          Aucun concours sélectionné.
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between -mt-2">
            <p className="text-sm text-[var(--foreground-muted)]">{contest.name}</p>
            <SyncScorersButton contestId={contest.id} scorerCount={scorerCandidates.length} />
          </div>
          {groupStandings.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[var(--foreground)]">Classement des groupes</h2>
                <span className="text-[10px] font-semibold text-[var(--foreground-subtle)] bg-[var(--surface-elevated)] px-2 py-0.5 rounded-full border border-[var(--border)]">
                  +{contest.settings?.pointsGroupFirst ?? 2} / +{contest.settings?.pointsGroupSecond ?? 1} pts
                </span>
              </div>
              <GroupBonusManager
                contestId={contest.id}
                groups={groupStandings}
                pointsGroupFirst={contest.settings?.pointsGroupFirst ?? 2}
                pointsGroupSecond={contest.settings?.pointsGroupSecond ?? 1}
                initialValidated={
                  (contest.settings?.validatedGroupBonus as Record<string, { firstTeamCode: string; secondTeamCode: string }>) ?? {}
                }
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-[var(--foreground)]">Bonus finaux</h2>
          </div>
          <BonusManager
            contestId={contest.id}
            teams={teams}
            scorerCandidates={scorerCandidates}
            settings={{
              pointsWinner: contest.settings?.pointsWinner ?? 10,
              pointsTopScorer: contest.settings?.pointsTopScorer ?? 5,
              pointsBestAttack: contest.settings?.pointsBestAttack ?? 3,
              pointsBestDefense: contest.settings?.pointsBestDefense ?? 3,
            }}
            initialWinnerId={currentWinnerId}
            initialTopScorerIds={currentTopScorerIds}
            initialBestAttackIds={initialBestAttackIds}
            initialBestDefenseIds={initialBestDefenseIds}
            allMatchesFinished={allMatchesFinished}
          />
        </>
      )}
    </div>
  )
}
