import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { notFound, redirect } from "next/navigation"
import { JoinContestClient } from "./join-contest-client"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Rejoindre un concours" }

interface Props {
  params: Promise<{ token: string }>
}

export default async function RejoindreContestPage({ params }: Props) {
  const { token } = await params

  const contest = await db.contest.findUnique({
    where: { inviteToken: token },
    select: {
      id: true,
      name: true,
      status: true,
      buyIn: true,
      iban: true,
      paymentInstructions: true,
      _count: { select: { participants: true } },
      prizepool: { include: { payouts: { orderBy: { position: "asc" } } } },
    },
  })

  if (!contest || contest.status === "FINISHED") {
    notFound()
  }

  const session = await auth()
  const userId = session?.user?.id

  // Vérifier si déjà inscrit
  let alreadyJoined = false
  if (userId) {
    const existing = await db.contestParticipant.findUnique({
      where: { contestId_userId: { contestId: contest.id, userId } },
    })
    alreadyJoined = !!existing
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full gradient-accent text-white text-sm font-bold mb-4">
            ⚽ ConcoursPronos
          </div>
          <h1 className="text-2xl font-black text-[var(--foreground)] mb-1">
            Rejoindre le concours
          </h1>
          <p className="text-[var(--foreground-muted)] text-sm">
            Tu es invité(e) à participer
          </p>
        </div>

        {/* Infos concours */}
        <div className="surface-card p-4 mb-4">
          <div className="font-bold text-[var(--foreground)] text-lg mb-1">{contest.name}</div>
          <div className="flex items-center gap-3 text-sm text-[var(--foreground-muted)]">
            <span>👥 {contest._count.participants} participants</span>
            {contest.buyIn > 0 && <span>💰 Buy-in : {contest.buyIn}€</span>}
          </div>

          {/* Prizepool */}
          {contest.prizepool && contest.prizepool.payouts.length > 0 && (
            <div className="mt-3 pt-3 border-t border-[var(--border)]">
              <div className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wide mb-2">
                Prizepool
                {contest.prizepool.totalAmount > 0 && (
                  <span className="ml-2 text-[var(--accent)] font-bold">
                    {contest.prizepool.totalAmount}€ total
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-1">
                {contest.prizepool.payouts.map((p) => (
                  <div key={p.position} className="flex items-center justify-between text-sm">
                    <span className="text-[var(--foreground-muted)]">
                      {p.position === 1 ? "🥇" : p.position === 2 ? "🥈" : p.position === 3 ? "🥉" : `${p.position}e`}
                    </span>
                    <span className="font-semibold text-[var(--foreground)]">{p.amount}€</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Instructions paiement si renseignées */}
        {contest.buyIn > 0 && contest.iban && (
          <div className="surface-card p-4 mb-4 border border-[var(--accent)]/20">
            <div className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wide mb-2 flex items-center gap-1">
              🏦 Paiement par virement
            </div>
            <div className="text-sm font-mono text-[var(--foreground)] break-all">{contest.iban}</div>
            {contest.paymentInstructions && (
              <div className="text-xs text-[var(--foreground-muted)] mt-2 whitespace-pre-line">
                {contest.paymentInstructions}
              </div>
            )}
          </div>
        )}

        <JoinContestClient
          inviteToken={token}
          contestName={contest.name}
          isLoggedIn={!!userId}
          alreadyJoined={alreadyJoined}
          contestStatus={contest.status}
        />
      </div>
    </div>
  )
}
