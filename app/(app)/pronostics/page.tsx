import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { MatchCard } from "@/components/predictions/match-card"
import { PHASE_LABELS, PHASE_ORDER } from "@/lib/utils"
import type { Metadata } from "next"
import type { MatchWithPrediction } from "@/types"

export const metadata: Metadata = { title: "Pronostics" }

export default async function PronosticsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const contest = await db.contest.findFirst({
    where: { status: { in: ["ONGOING", "REGISTRATION"] } },
    orderBy: { createdAt: "desc" },
  })

  if (!contest) {
    return (
      <div className="text-center py-20 text-[var(--foreground-muted)]">
        <div className="text-4xl mb-3">⚽</div>
        <p>Aucun concours actif pour le moment.</p>
      </div>
    )
  }

  const matches = await db.match.findMany({
    where: {
      contestId: contest.id,
      homeTeamId: { not: null },
    },
    orderBy: [{ kickoff: "asc" }],
    include: {
      homeTeam: true,
      awayTeam: true,
      predictions: {
        where: { userId: session.user.id },
        take: 1,
      },
    },
  })

  const matchesWithPrediction: MatchWithPrediction[] = matches.map((m) => ({
    ...m,
    prediction: m.predictions[0] ?? null,
    isLocked: new Date() >= m.kickoff,
  }))

  // Group by phase
  const byPhase = matchesWithPrediction.reduce(
    (acc, match) => {
      if (!acc[match.phase]) acc[match.phase] = []
      acc[match.phase].push(match)
      return acc
    },
    {} as Record<string, MatchWithPrediction[]>
  )

  const sortedPhases = Object.keys(byPhase).sort(
    (a, b) => (PHASE_ORDER[a] ?? 99) - (PHASE_ORDER[b] ?? 99)
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-black text-[var(--foreground)]">Pronostics</h1>
        <p className="text-sm text-[var(--foreground-muted)]">{contest.name}</p>
      </div>

      {sortedPhases.map((phase) => (
        <section key={phase}>
          <h2 className="text-sm font-bold text-[var(--foreground-muted)] uppercase tracking-wider mb-3 px-1">
            {PHASE_LABELS[phase] ?? phase}
          </h2>
          <div className="flex flex-col gap-2">
            {byPhase[phase].map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                contestId={contest.id}
                initialHomeScore={match.prediction?.homeScore}
                initialAwayScore={match.prediction?.awayScore}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
