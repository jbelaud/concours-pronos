import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { notFound } from "next/navigation"
import { JoinContestClient } from "./join-contest-client"
import { CopyIbanButton } from "@/components/shared/copy-iban-button"
import { CountdownTimer } from "@/components/shared/countdown-timer"
import type { Metadata } from "next"
import { Users, Trophy, Banknote, Star, LogIn } from "lucide-react"
import Link from "next/link"

export const metadata: Metadata = { title: "Rejoindre un concours — ConcoursPronos" }

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
      allowPublicJoin: true,
      _count: { select: { participants: true } },
      participants: { select: { hasPaid: true } },
      prizepool: { include: { payouts: { orderBy: { position: "asc" } } } },
      template: { select: { name: true, edition: true, startDate: true } },
    },
  })

  if (!contest || contest.status === "FINISHED") {
    notFound()
  }

  const session = await auth()
  const userId = session?.user?.id

  let alreadyJoined = false
  if (userId) {
    const existing = await db.contestParticipant.findUnique({
      where: { contestId_userId: { contestId: contest.id, userId } },
    })
    alreadyJoined = !!existing
  }

  const paidCount = contest.participants.filter((p) => p.hasPaid).length
  const totalCount = contest._count.participants
  const collectedAmount = paidCount * (contest.buyIn ?? 0)
  const allPaid = paidCount === totalCount && totalCount > 0

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

  const itmCount = prizepool?.itmCount ?? dynamicPayouts.length
  const estimatedTotal = prizepool?.totalAmount ?? 0

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-start p-4 pt-8 pb-12">
      <div className="w-full max-w-sm flex flex-col gap-5">

        {/* Hero header */}
        <div className="text-center flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl gradient-accent flex items-center justify-center text-3xl shadow-lg">
            ⚽
          </div>
          <div>
            <p className="text-xs text-[var(--accent)] uppercase tracking-widest font-bold mb-1">
              ConcoursPronos
            </p>
            <h1 className="text-2xl font-black text-[var(--foreground)] leading-tight">
              {contest.name}
            </h1>
            {contest.template && (
              <p className="text-sm text-[var(--foreground-muted)] mt-1">
                {contest.template.name} · {contest.template.edition}
              </p>
            )}
          </div>
        </div>

        {/* Stats rapides */}
        <div className="grid grid-cols-3 gap-2">
          <div className="surface-card p-3 flex flex-col items-center gap-1 text-center">
            <Users size={18} className="text-[var(--accent)]" />
            <span className="text-xl font-black text-[var(--foreground)]">{totalCount}</span>
            <span className="text-[10px] text-[var(--foreground-muted)] uppercase tracking-wide">
              Participants
            </span>
          </div>

          <div className="surface-card p-3 flex flex-col items-center gap-1 text-center">
            <Banknote size={18} className="text-[var(--warning)]" />
            <span className="text-xl font-black text-[var(--foreground)]">
              {contest.buyIn > 0 ? `${contest.buyIn}€` : "Gratuit"}
            </span>
            <span className="text-[10px] text-[var(--foreground-muted)] uppercase tracking-wide">
              Buy-in
            </span>
          </div>

          <div className="surface-card p-3 flex flex-col items-center gap-1 text-center">
            <Trophy size={18} className="text-[var(--gold)]" />
            <span className="text-xl font-black text-[var(--foreground)]">
              {collectedAmount > 0 ? `${collectedAmount}€` : estimatedTotal > 0 ? `${estimatedTotal}€` : "–"}
            </span>
            <span className="text-[10px] text-[var(--foreground-muted)] uppercase tracking-wide">
              Cagnotte
            </span>
          </div>
        </div>

        {/* Prizepool détaillé */}
        {dynamicPayouts.length > 0 && (
          <div className="surface-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <Star size={14} className="text-[var(--gold)]" />
                <span className="text-sm font-semibold text-[var(--foreground)]">Gains</span>
              </div>
              <div className="flex items-center gap-1.5">
                {collectedAmount > 0 && (
                  <span className="text-sm font-black text-[var(--accent)]">{collectedAmount}€ collectés</span>
                )}
                {!allPaid && totalCount > 0 && (
                  <span className="text-[10px] text-[var(--foreground-subtle)] bg-[var(--surface-elevated)] px-1.5 py-0.5 rounded-full">
                    {paidCount}/{totalCount}
                  </span>
                )}
                {allPaid && (
                  <span className="text-[10px] text-[var(--success)] bg-[var(--success-dim)] px-1.5 py-0.5 rounded-full">
                    Complet
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {dynamicPayouts.map((p) => {
                const isItm = p.position <= itmCount
                return (
                  <div
                    key={p.position}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                      p.position === 1
                        ? "bg-[var(--gold)]/10 border border-[var(--gold)]/20"
                        : p.position === 2
                        ? "bg-[var(--silver)]/10 border border-[var(--silver)]/20"
                        : p.position === 3
                        ? "bg-[var(--bronze)]/10 border border-[var(--bronze)]/20"
                        : isItm
                        ? "bg-[var(--success-dim)] border border-[var(--success)]/20"
                        : "bg-[var(--surface-elevated)]"
                    }`}
                  >
                    <span className="text-sm text-[var(--foreground-muted)]">
                      {p.position === 1 ? "🥇 1er" : p.position === 2 ? "🥈 2e" : p.position === 3 ? "🥉 3e" : `${p.position}e`}
                    </span>
                    <span className="font-bold text-[var(--foreground)]">
                      {p.amount}€
                      {!allPaid && collectedAmount > 0 && (
                        <span className="text-[10px] text-[var(--foreground-subtle)] ml-1">*</span>
                      )}
                    </span>
                  </div>
                )
              })}
            </div>
            {!allPaid && collectedAmount > 0 && (
              <p className="text-[10px] text-[var(--foreground-subtle)] mt-2">
                * Estimé sur {paidCount} paiement{paidCount > 1 ? "s" : ""} reçu{paidCount > 1 ? "s" : ""} — mis à jour à chaque paiement
              </p>
            )}
            {collectedAmount === 0 && prizepool && (
              <p className="text-[10px] text-[var(--foreground-subtle)] mt-2">
                Cagnotte calculée dès le premier paiement reçu
              </p>
            )}
          </div>
        )}

        {/* Instructions paiement */}
        {contest.buyIn > 0 && contest.iban && (
          <div className="surface-card p-4 border border-[var(--accent)]/20 flex flex-col gap-3">
            <div className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wide flex items-center gap-1">
              🏦 Paiement par virement
            </div>
            <div className="flex items-center justify-between gap-3 bg-[var(--surface-elevated)] rounded-xl px-3 py-2.5">
              <span className="text-sm font-mono text-[var(--foreground)] break-all leading-snug flex-1">{contest.iban}</span>
              <CopyIbanButton iban={contest.iban} />
            </div>
            {contest.paymentInstructions && (
              <div className="text-xs text-[var(--foreground-muted)] whitespace-pre-line">
                {contest.paymentInstructions}
              </div>
            )}
          </div>
        )}

        {/* Compte à rebours */}
        {contest.template?.startDate && (
          <CountdownTimer targetDate={contest.template.startDate.toISOString()} />
        )}

        {/* CTA join */}
        {!contest.allowPublicJoin && !alreadyJoined ? (
          <div className="surface-card p-4 text-center flex flex-col items-center gap-3">
            <span className="text-2xl">🔒</span>
            <p className="text-sm font-semibold text-[var(--foreground)]">Inscriptions closes</p>
            <p className="text-xs text-[var(--foreground-muted)]">
              Les nouvelles inscriptions sont désactivées. Si tu es déjà inscrit, connecte-toi pour accéder au concours.
            </p>
            <Link
              href="/login"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-accent text-white text-sm font-semibold w-full justify-center"
            >
              <LogIn size={15} />
              Se connecter
            </Link>
          </div>
        ) : (
          <JoinContestClient
            inviteToken={token}
            contestName={contest.name}
            isLoggedIn={!!userId}
            alreadyJoined={alreadyJoined}
            contestStatus={contest.status}
          />
        )}

        {/* Footer */}
        <p className="text-center text-[10px] text-[var(--foreground-subtle)]">
          ConcoursPronos · Concours de pronostics privé
        </p>
      </div>
    </div>
  )
}
