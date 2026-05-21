import { db } from "@/lib/db"
import { ResultsManager } from "@/components/admin/results-manager"
import type { Metadata } from "next"
import type { MatchWithTeams } from "@/types"

export const metadata: Metadata = { title: "Résultats & Knockout" }

interface Props {
  searchParams: Promise<{ contestId?: string }>
}

export default async function ResultatsPage({ searchParams }: Props) {
  const { contestId } = await searchParams

  const contest = contestId
    ? await db.contest.findUnique({ where: { id: contestId }, include: { settings: true } })
    : await db.contest.findFirst({
        where: { status: { in: ["ONGOING", "REGISTRATION", "DRAFT"] } },
        orderBy: { createdAt: "desc" },
        include: { settings: true },
      })

  if (!contest) {
    return (
      <div className="text-center py-20 text-[var(--foreground-muted)] text-sm">
        Aucun concours sélectionné.
      </div>
    )
  }

  const rawMatches = await db.match.findMany({
    where: { contestId: contest.id, homeTeamId: { not: null } },
    orderBy: [{ kickoff: "asc" }, { matchNumber: "asc" }],
    include: { homeTeam: true, awayTeam: true },
  })

  const matches = rawMatches as (MatchWithTeams & { regularTimeHome: number | null; regularTimeAway: number | null })[]

  // Déduire le matchday courant
  const finishedDates = new Set(
    matches.filter((m) => m.status === "FINISHED").map((m) => m.kickoff.toISOString().split("T")[0])
  )
  const currentMatchday = finishedDates.size + 1

  const allTeams = await db.team.findMany({
    where: { contestId: contest.id },
    orderBy: [{ group: "asc" }, { name: "asc" }],
  })

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-black text-[var(--foreground)]">Résultats & Knockout</h1>
        <p className="text-sm text-[var(--foreground-muted)]">{contest.name}</p>
      </div>

      <ResultsManager
        matches={matches}
        allTeams={allTeams}
        matchday={currentMatchday}
        knockoutScoringRule={contest.settings?.knockoutScoringRule ?? "REGULAR_TIME"}
      />
    </div>
  )
}
