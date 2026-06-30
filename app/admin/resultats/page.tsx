import { db } from "@/lib/db"
import { ResultsManager } from "@/components/admin/results-manager"
import Link from "next/link"
import { cn } from "@/lib/utils"
import type { Metadata } from "next"
import type { MatchWithTeams } from "@/types"

export const metadata: Metadata = { title: "Résultats & Knockout" }

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

export default async function ResultatsPage({ searchParams }: Props) {
  const { contestId } = await searchParams

  // Tous les concours pour le sélecteur
  const allContests = await db.contest.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, status: true },
  })

  const contest = contestId
    ? await db.contest.findUnique({ where: { id: contestId }, include: { settings: true } })
    : await db.contest.findFirst({
        where: { status: { in: ["ONGOING", "REGISTRATION", "DRAFT"] } },
        orderBy: { createdAt: "desc" },
        include: { settings: true },
      })

  const rawMatches = contest
    ? await db.match.findMany({
        where: { contestId: contest.id, homeTeamId: { not: null } },
        orderBy: [{ kickoff: "asc" }, { matchNumber: "asc" }],
        include: { homeTeam: true, awayTeam: true },
      })
    : []

  const matches = rawMatches as (MatchWithTeams & { regularTimeHome: number | null; regularTimeAway: number | null; extraTimeHome: number | null; extraTimeAway: number | null })[]

  const finishedDates = new Set(
    matches.filter((m) => m.status === "FINISHED").map((m) => m.kickoff.toISOString().split("T")[0])
  )
  const currentMatchday = finishedDates.size + 1

  const allTeams = contest
    ? await db.team.findMany({ where: { contestId: contest.id }, orderBy: [{ group: "asc" }, { name: "asc" }] })
    : []

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-black text-[var(--foreground)]">Résultats & Knockout</h1>
      </div>

      {/* Sélecteur de concours */}
      {allContests.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {allContests.map((c) => {
            const isActive = contest?.id === c.id
            return (
              <Link
                key={c.id}
                href={`/admin/resultats?contestId=${c.id}`}
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
          <p className="text-sm text-[var(--foreground-muted)] -mt-2">{contest.name}</p>
          <ResultsManager
            matches={matches}
            allTeams={allTeams}
            matchday={currentMatchday}
            knockoutScoringRule={contest.settings?.knockoutScoringRule ?? "REGULAR_TIME"}
          />
        </>
      )}
    </div>
  )
}
