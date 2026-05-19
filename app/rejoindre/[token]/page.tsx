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
      participants: { select: { hasPaid: true } },
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

  // Calcul dynamique du prizepool réel
  const paidCount = contest.participants.filter((p) => p.hasPaid).length
  const totalCount = contest._count.participants
  const collectedAmount = paidCount * (contest.buyIn ?? 0)
  const allPaid = paidCount === totalCount && totalCount > 0

  // Calcul des gains par place à partir des ratios définis par l'admin
  // On applique les mêmes ratios que les payouts admin mais sur le montant collecté
  const prizepool = contest.prizepool
  let dynamicPayouts: Array<{ position: number; amount: number }> = []
  if (prizepool && prizepool.payouts.length > 0 && collectedAmount > 0 && prizepool.totalAmount > 0) {
    dynamicPayouts = prizepool.payouts.map((p) => ({
      position: p.position,
      amount: Math.round((p.amount / prizepool.totalAmount) * collectedAmount),
    }))
  } else if (prizepool && prizepool.payouts.length > 0) {
    dynamicPayouts = prizepool.payouts
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
            <span>👥 {totalCount} participant{totalCount > 1 ? "s" : ""}</span>
            {contest.buyIn > 0 && <span>💰 Buy-in : {contest.buyIn}€</span>}
          </div>

          {/* Prizepool dynamique */}
          {prizepool && dynamicPayouts.length > 0 && (
            <div className="mt-3 pt-3 border-t border-[var(--border)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wide">
                  Cagnotte
                </span>
                <div className="flex items-center gap-1.5">
                  {collectedAmount > 0 && (
                    <span className="text-sm font-black text-[var(--accent)]">{collectedAmount}€</span>
                  )}
                  {!allPaid && totalCount > 0 && (
                    <span className="text-[10px] text-[var(--foreground-subtle)] bg-[var(--surface-elevated)] px-1.5 py-0.5 rounded-full">
                      {paidCount}/{totalCount} payés
                    </span>
                  )}
                  {allPaid && (
                    <span className="text-[10px] text-[var(--success)] bg-[var(--success-dim)] px-1.5 py-0.5 rounded-full">
                      Complet
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                {dynamicPayouts.map((p) => (
                  <div key={p.position} className="flex items-center justify-between text-sm">
                    <span className="text-[var(--foreground-muted)]">
                      {p.position === 1 ? "🥇 1er" : p.position === 2 ? "🥈 2e" : p.position === 3 ? "🥉 3e" : `${p.position}e`}
                    </span>
                    <span className="font-semibold text-[var(--foreground)]">
                      {p.amount}€
                      {!allPaid && collectedAmount > 0 && (
                        <span className="text-[10px] text-[var(--foreground-subtle)] ml-1">*</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
              {!allPaid && collectedAmount > 0 && (
                <p className="text-[10px] text-[var(--foreground-subtle)] mt-2">
                  * Estimé sur {paidCount} paiement{paidCount > 1 ? "s" : ""} reçu{paidCount > 1 ? "s" : ""} — mis à jour à chaque paiement
                </p>
              )}
              {collectedAmount === 0 && (
                <p className="text-[10px] text-[var(--foreground-subtle)] mt-1">
                  Cagnotte calculée dès le premier paiement reçu
                </p>
              )}
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
