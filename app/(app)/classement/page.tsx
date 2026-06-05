import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { LeaderboardList } from "@/components/leaderboard/leaderboard-list"
import { RankingChart } from "@/components/leaderboard/ranking-chart"
import { ClassementTabs } from "@/components/leaderboard/classement-tabs"
import type { Metadata } from "next"
import type { LeaderboardRow, RankingEvolutionPoint } from "@/types"
import type { TieBreakerKey } from "@/lib/ranking"

export const metadata: Metadata = { title: "Classement" }

export default async function ClassementPage({
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
      contest: { status: { in: ["ONGOING", "REGISTRATION", "FINISHED", "DRAFT"] } },
      ...(requestedId ? { contestId: requestedId } : {}),
    },
    include: {
      contest: {
        include: {
          prizepool: { include: { payouts: true } },
          settings: true,
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  })

  const contest = myParticipation?.contest ?? null

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

  // Load snapshots for current user + ITM players (to show on chart)
  const itmUserIds = rows
    .filter((r) => r.isITM)
    .map((r) => r.user.id)
  const chartUserIds = [...new Set([userId, ...itmUserIds])]

  const allSnapshots = await db.rankingSnapshot.findMany({
    where: { contestId: contest.id, userId: { in: chartUserIds } },
    orderBy: { matchday: "asc" },
    include: { user: { select: { id: true, firstName: true } } },
  })

  const snapshotsByUser: Record<string, { matchday: number; rank: number; points: number }[]> = {}
  for (const s of allSnapshots) {
    if (!snapshotsByUser[s.userId]) snapshotsByUser[s.userId] = []
    snapshotsByUser[s.userId].push({ matchday: s.matchday, rank: s.rank, points: s.totalPoints })
  }

  const chartSeries = chartUserIds
    .filter((id) => snapshotsByUser[id]?.length)
    .map((id) => {
      const entry = rows.find((r) => r.user.id === id)
      return {
        userId: id,
        userName: entry?.user.firstName ?? "?",
        isMe: id === userId,
        rank: entry?.rank ?? 99,
        data: snapshotsByUser[id],
      }
    })

  const evolutionData: RankingEvolutionPoint[] = (snapshotsByUser[userId] ?? []).map((s) => ({
    matchday: s.matchday,
    rank: s.rank,
    points: s.points,
  }))

  // Règles du concours
  const s = contest.settings
  const contestSettings = {
    pointsCorrectResult: s?.pointsCorrectResult ?? 3,
    pointsExactScore: s?.pointsExactScore ?? 1,
    pointsWinner: s?.pointsWinner ?? 10,
    pointsTopScorer: s?.pointsTopScorer ?? 5,
    pointsBestAttack: s?.pointsBestAttack ?? 3,
    pointsBestDefense: s?.pointsBestDefense ?? 3,
    pointsGroupFirst: s?.pointsGroupFirst ?? 2,
    pointsGroupSecond: s?.pointsGroupSecond ?? 1,
    knockoutScoringRule: (s?.knockoutScoringRule ?? "REGULAR_TIME") as "REGULAR_TIME" | "FULL_TIME",
    tieBreakerOrder: (Array.isArray(s?.tieBreakerOrder)
      ? s.tieBreakerOrder
      : ["exactScores", "correctResults", "finalWinner"]) as TieBreakerKey[],
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-black text-[var(--foreground)]">Classement</h1>
        <p className="text-sm text-[var(--foreground-muted)]">{contest.name}</p>
      </div>

      {evolutionData.length > 1 && (
        <section className="surface-card p-4">
          <h2 className="text-sm font-semibold text-[var(--foreground)] mb-3">
            Mon évolution
          </h2>
          <RankingChart
            series={chartSeries}
            totalParticipants={entries.length}
            currentUserId={userId}
            itmCount={itmCount}
          />
        </section>
      )}

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

      {/* Onglets Classement / Règles */}
      <ClassementTabs
        rows={rows}
        currentUserId={userId}
        itmCount={itmCount}
        settings={contestSettings}
        hasEntries={entries.length > 0}
      />
    </div>
  )
}
