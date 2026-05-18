import { db } from "@/lib/db"
import { KnockoutManager } from "@/components/admin/knockout-manager"
import { PHASE_LABELS, PHASE_ORDER } from "@/lib/utils"
import type { Metadata } from "next"
import type { MatchWithTeams } from "@/types"

export const metadata: Metadata = { title: "Gestion Knockout" }

interface Props {
  searchParams: Promise<{ contestId?: string }>
}

export default async function KnockoutPage({ searchParams }: Props) {
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

  const knockoutMatches = await db.match.findMany({
    where: {
      contestId: contest.id,
      phase: { in: ["ROUND_OF_16", "QUARTER_FINAL", "SEMI_FINAL", "FINAL", "THIRD_PLACE"] },
    },
    orderBy: [{ matchNumber: "asc" }],
    include: { homeTeam: true, awayTeam: true },
  })

  const allTeams = await db.team.findMany({
    where: { contestId: contest.id },
    orderBy: [{ group: "asc" }, { name: "asc" }],
  })

  const byPhase = knockoutMatches.reduce(
    (acc, m) => {
      if (!acc[m.phase]) acc[m.phase] = []
      acc[m.phase].push(m as MatchWithTeams)
      return acc
    },
    {} as Record<string, MatchWithTeams[]>
  )

  const knockoutPhases = ["ROUND_OF_16", "QUARTER_FINAL", "SEMI_FINAL", "FINAL", "THIRD_PLACE"]
  const sortedPhases = knockoutPhases.filter((p) => byPhase[p]?.length > 0)

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-black text-[var(--foreground)]">Gestion Knockout</h1>
        <p className="text-sm text-[var(--foreground-muted)]">
          {contest.name} · Assignation manuelle des équipes
        </p>
      </div>

      {sortedPhases.map((phase) => (
        <section key={phase}>
          <h2 className="text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-wider mb-2">
            {PHASE_LABELS[phase]}
          </h2>
          <div className="flex flex-col gap-2">
            {byPhase[phase].map((match) => (
              <KnockoutManager key={match.id} match={match} allTeams={allTeams} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
