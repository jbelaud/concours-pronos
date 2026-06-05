import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { EditContestForm } from "@/components/admin/edit-contest-form"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Modifier le concours" }

interface Props {
  params: Promise<{ id: string }>
}

export default async function ModifierConcoursPage({ params }: Props) {
  const { id } = await params

  const contest = await db.contest.findUnique({
    where: { id },
    include: {
      settings: true,
      prizepool: { include: { payouts: { orderBy: { position: "asc" } } } },
    },
  })

  if (!contest) notFound()

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-black text-[var(--foreground)]">Modifier le concours</h1>
      <EditContestForm
        contestId={contest.id}
        initialName={contest.name}
        initialIsFree={contest.isFree}
        initialBuyIn={contest.buyIn}
        initialIban={contest.iban ?? ""}
        initialPaymentInstructions={contest.paymentInstructions ?? ""}
        initialSettings={{
          pointsCorrectResult: contest.settings?.pointsCorrectResult ?? 3,
          pointsExactScore: contest.settings?.pointsExactScore ?? 1,
          pointsWrongResult: contest.settings?.pointsWrongResult ?? 0,
          pointsWinner: contest.settings?.pointsWinner ?? 10,
          pointsTopScorer: contest.settings?.pointsTopScorer ?? 5,
          pointsBestAttack: contest.settings?.pointsBestAttack ?? 3,
          pointsBestDefense: contest.settings?.pointsBestDefense ?? 3,
          pointsGroupFirst: contest.settings?.pointsGroupFirst ?? 2,
          pointsGroupSecond: contest.settings?.pointsGroupSecond ?? 1,
          knockoutScoringRule: (contest.settings?.knockoutScoringRule ?? "REGULAR_TIME") as "REGULAR_TIME" | "FULL_TIME",
          tieBreakerOrder: (Array.isArray(contest.settings?.tieBreakerOrder)
            ? contest.settings.tieBreakerOrder
            : ["exactScores", "correctResults", "finalWinner"]) as import("@/lib/ranking").TieBreakerKey[],
        }}
        initialPrizepool={{
          totalAmount: contest.prizepool?.totalAmount ?? 0,
          itmCount: contest.prizepool?.itmCount ?? 4,
          payouts: contest.prizepool?.payouts ?? [],
        }}
      />
    </div>
  )
}
