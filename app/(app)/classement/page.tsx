import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { LeaderboardList } from "@/components/leaderboard/leaderboard-list"
import { RankingChart } from "@/components/leaderboard/ranking-chart"
import type { Metadata } from "next"
import type { LeaderboardRow, RankingEvolutionPoint } from "@/types"

export const metadata: Metadata = { title: "Classement" }

export default async function ClassementPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const contest = await db.contest.findFirst({
    where: { status: { in: ["ONGOING", "REGISTRATION", "FINISHED"] } },
    include: { prizepool: { include: { payouts: true } } },
    orderBy: { createdAt: "desc" },
  })

  if (!contest) {
    return (
      <div className="text-center py-20 text-[var(--foreground-muted)]">
        <div className="text-4xl mb-3">🏆</div>
        <p>Aucun classement disponible.</p>
      </div>
    )
  }

  const entries = await db.leaderboardEntry.findMany({
    where: { contestId: contest.id },
    orderBy: [{ rank: "asc" }, { exactScores: "desc" }],
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarSeed: true,
          email: true,
        },
      },
    },
  })

  const itmCount = contest.prizepool?.itmCount ?? 4
  const payouts = contest.prizepool?.payouts ?? []

  const rows: LeaderboardRow[] = entries.map((entry) => {
    const previousRank = entry.previousRank
    const currentRank = entry.rank
    let movement: LeaderboardRow["movement"] = "same"
    let movementAmount = 0

    if (previousRank === null) {
      movement = "new"
    } else if (previousRank > currentRank) {
      movement = "up"
      movementAmount = previousRank - currentRank
    } else if (previousRank < currentRank) {
      movement = "down"
      movementAmount = currentRank - previousRank
    }

    const payout = payouts.find((p) => p.position === currentRank)

    return {
      ...entry,
      movement,
      movementAmount,
      isITM: currentRank <= itmCount,
      isPodium: currentRank <= 3,
      payoutAmount: payout?.amount,
    }
  })

  // My ranking history
  const mySnapshots = await db.rankingSnapshot.findMany({
    where: { contestId: contest.id, userId: session.user.id },
    orderBy: { matchday: "asc" },
  })

  const evolutionData: RankingEvolutionPoint[] = mySnapshots.map((s) => ({
    matchday: s.matchday,
    rank: s.rank,
    points: s.totalPoints,
  }))

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-black text-[var(--foreground)]">Classement</h1>
        <p className="text-sm text-[var(--foreground-muted)]">{contest.name}</p>
      </div>

      {/* My evolution chart */}
      {evolutionData.length > 1 && (
        <section className="surface-card p-4">
          <h2 className="text-sm font-semibold text-[var(--foreground)] mb-3">
            Mon évolution
          </h2>
          <RankingChart
            data={evolutionData}
            totalParticipants={entries.length}
            userName={session.user.firstName}
          />
        </section>
      )}

      {/* Prize info */}
      {payouts.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          {payouts
            .sort((a, b) => a.position - b.position)
            .map((payout) => (
              <div
                key={payout.id}
                className={`shrink-0 flex flex-col items-center p-3 rounded-xl border min-w-[72px] ${
                  payout.position === 1
                    ? "border-[var(--gold)]/40 bg-[var(--gold)]/10 itm-gold"
                    : payout.position === 2
                      ? "border-[var(--silver)]/40 bg-[var(--silver)]/10"
                      : payout.position === 3
                        ? "border-[var(--bronze)]/40 bg-[var(--bronze)]/10"
                        : "border-[var(--border)] bg-[var(--surface-card)]"
                }`}
              >
                <span className="text-lg">
                  {payout.position === 1 ? "🥇" : payout.position === 2 ? "🥈" : payout.position === 3 ? "🥉" : `${payout.position}e`}
                </span>
                <span className="font-black text-sm text-[var(--foreground)]">
                  {payout.amount}€
                </span>
              </div>
            ))}
        </div>
      )}

      {/* Leaderboard */}
      <LeaderboardList
        entries={rows}
        currentUserId={session.user.id}
        itmCount={itmCount}
      />

      {entries.length === 0 && (
        <div className="text-center py-12 text-[var(--foreground-muted)] text-sm">
          Aucun participant n&apos;a encore de points.
        </div>
      )}
    </div>
  )
}
