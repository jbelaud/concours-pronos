import Link from "next/link"
import { db } from "@/lib/db"
import { Plus } from "lucide-react"
import { DeleteContestButton } from "@/components/admin/delete-contest-button"
import { FixFlagsButton } from "@/components/admin/fix-flags-button"
import { ContestInviteLink } from "@/components/admin/contest-invite-link"
import { ContestPaymentForm } from "@/components/admin/contest-payment-form"
import { ContestPrizepoolForm } from "@/components/admin/contest-prizepool-form"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Concours" }

export default async function ConcoursPage() {
  const contests = await db.contest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      settings: true,
      prizepool: { include: { payouts: { orderBy: { position: "asc" } } } },
      _count: { select: { participants: true } },
    },
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-[var(--foreground)]">Concours</h1>
        <Link
          href="/admin/concours/nouveau"
          className="flex items-center gap-1.5 gradient-accent text-white text-sm font-semibold py-2 px-4 rounded-xl"
        >
          <Plus size={15} />
          Nouveau
        </Link>
      </div>

      <div className="flex flex-col gap-4">
        {contests.map((contest) => (
          <div key={contest.id} className="surface-card p-4 flex flex-col gap-3">
            {/* Header */}
            <div>
              <div className="font-bold text-[var(--foreground)]">{contest.name}</div>
              <div className="text-xs text-[var(--foreground-muted)] mt-0.5">
                {contest._count.participants} participants · Buy-in : {contest.buyIn}€
              </div>
              <div className="text-xs text-[var(--foreground-muted)]">
                Points correct : {contest.settings?.pointsCorrectResult ?? 3} ·
                Exact : +{contest.settings?.pointsExactScore ?? 1}
              </div>
            </div>

            {/* Lien d'invitation */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--foreground-subtle)] mb-1.5">Lien d&apos;invitation</p>
              <ContestInviteLink
                contestId={contest.id}
                contestName={contest.name}
                inviteToken={contest.inviteToken ?? null}
              />
            </div>

            {/* IBAN / Paiement */}
            <ContestPaymentForm
              contestId={contest.id}
              iban={contest.iban ?? null}
              paymentInstructions={contest.paymentInstructions ?? null}
            />

            {/* Prizepool */}
            <ContestPrizepoolForm
              contestId={contest.id}
              totalAmount={contest.prizepool?.totalAmount ?? 0}
              itmCount={contest.prizepool?.itmCount ?? 4}
              payouts={contest.prizepool?.payouts ?? []}
            />

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <FixFlagsButton contestId={contest.id} />
              <DeleteContestButton contestId={contest.id} contestName={contest.name} />
            </div>
          </div>
        ))}
        {contests.length === 0 && (
          <div className="text-center py-12 text-[var(--foreground-muted)] text-sm">
            Aucun concours. Crée-en un !
          </div>
        )}
      </div>
    </div>
  )
}
