import { db } from "@/lib/db"
import { ResultEntry } from "@/components/admin/result-entry"
import { PHASE_LABELS, PHASE_ORDER } from "@/lib/utils"
import type { Metadata } from "next"
import type { MatchWithTeams } from "@/types"

export const metadata: Metadata = { title: "Saisie des résultats" }

interface Props {
  searchParams: Promise<{ contestId?: string }>
}

export default async function ResultatsPage({ searchParams }: Props) {
  const { contestId } = await searchParams

  const contest = contestId
    ? await db.contest.findUnique({ where: { id: contestId } })
    : await db.contest.findFirst({
        where: { status: { in: ["ONGOING", "REGISTRATION", "DRAFT"] } },
        orderBy: { createdAt: "desc" },
      })

  if (!contest) {
    return (
      <div className="text-center py-20 text-[var(--foreground-muted)] text-sm">
        Aucun concours sélectionné.
      </div>
    )
  }

  // Get matches with teams, ordered by kickoff
  const rawMatches = await db.match.findMany({
    where: {
      contestId: contest.id,
      homeTeamId: { not: null },
    },
    orderBy: { kickoff: "asc" },
    include: { homeTeam: true, awayTeam: true },
  })

  const matches = rawMatches as MatchWithTeams[]

  // Separate pending from finished
  const pending = matches.filter((m) => m.status !== "FINISHED")
  const finished = matches.filter((m) => m.status === "FINISHED")

  // Group pending by phase
  const byPhase = pending.reduce(
    (acc, match) => {
      if (!acc[match.phase]) acc[match.phase] = []
      acc[match.phase].push(match)
      return acc
    },
    {} as Record<string, MatchWithTeams[]>
  )

  const sortedPhases = Object.keys(byPhase).sort(
    (a, b) => (PHASE_ORDER[a] ?? 99) - (PHASE_ORDER[b] ?? 99)
  )

  // Determine current matchday (count of unique dates with finished matches)
  const finishedDates = new Set(
    finished.map((m) => m.kickoff.toISOString().split("T")[0])
  )
  const currentMatchday = finishedDates.size + 1

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-black text-[var(--foreground)]">Saisie des résultats</h1>
        <p className="text-sm text-[var(--foreground-muted)]">{contest.name}</p>
      </div>

      {sortedPhases.length === 0 && (
        <div className="text-center py-12 text-[var(--foreground-muted)] text-sm">
          <div className="text-3xl mb-2">✅</div>
          Tous les résultats ont été saisis.
        </div>
      )}

      {sortedPhases.map((phase) => (
        <section key={phase}>
          <h2 className="text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-wider mb-2">
            {PHASE_LABELS[phase] ?? phase} · {byPhase[phase].length} matchs
          </h2>
          <div className="flex flex-col gap-2">
            {byPhase[phase].map((match) => (
              <ResultEntry
                key={match.id}
                match={match}
                matchday={currentMatchday}
              />
            ))}
          </div>
        </section>
      ))}

      {finished.length > 0 && (
        <section>
          <h2 className="text-xs font-bold text-[var(--success)] uppercase tracking-wider mb-2">
            Résultats enregistrés ({finished.length})
          </h2>
          <div className="flex flex-col gap-2">
            {finished.slice(0, 5).map((match) => (
              <div key={match.id} className="surface-card p-3 flex items-center gap-3 opacity-60">
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-lg">{match.homeTeam?.flagEmoji}</span>
                  <span className="text-xs font-semibold truncate max-w-[64px]">
                    {match.homeTeam?.name}
                  </span>
                </div>
                <span className="font-black text-sm text-[var(--foreground)]">
                  {match.homeScore} – {match.awayScore}
                </span>
                <div className="flex-1 flex items-center gap-2 justify-end">
                  <span className="text-xs font-semibold truncate max-w-[64px] text-right">
                    {match.awayTeam?.name}
                  </span>
                  <span className="text-lg">{match.awayTeam?.flagEmoji}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
