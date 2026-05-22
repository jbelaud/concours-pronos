import { db } from "@/lib/db"
import { ParticipantsList } from "@/components/admin/participants-list"
import { AddUserForm } from "@/components/admin/add-user-form"
import { Users, Banknote } from "lucide-react"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Participants" }

export default async function ParticipantsPage({
  searchParams,
}: {
  searchParams: Promise<{ contestId?: string }>
}) {
  const { contestId: selectedId } = await searchParams

  const contests = await db.contest.findMany({
    where: { status: { in: ["DRAFT", "REGISTRATION", "ONGOING"] } },
    select: { id: true, name: true, buyIn: true, iban: true, paymentInstructions: true },
    orderBy: { createdAt: "desc" },
  })

  const activeContest = selectedId
    ? (contests.find((c) => c.id === selectedId) ?? contests[0])
    : contests[0]
  const activeContestId = activeContest?.id

  const participants = activeContestId
    ? await db.contestParticipant.findMany({
        where: { contestId: activeContestId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
              subProfile: {
                select: {
                  owner: { select: { firstName: true, lastName: true } },
                },
              },
            },
          },
        },
        orderBy: { joinedAt: "asc" },
      })
    : []

  const paidCount = participants.filter((p) => p.hasPaid).length
  const unpaidCount = participants.length - paidCount
  const totalCollected = activeContest ? paidCount * (activeContest.buyIn ?? 0) : 0

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-black text-[var(--foreground)]">Participants</h1>
        <p className="text-sm text-[var(--foreground-muted)]">
          {participants.length} inscrits · {paidCount} ont payé
          {activeContest?.buyIn && activeContest.buyIn > 0 ? ` · ${totalCollected}€ collectés` : ""}
        </p>
      </div>

      {/* Sélecteur de concours si plusieurs actifs */}
      {contests.length > 1 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wide">Concours</p>
          <div className="flex flex-wrap gap-2">
            {contests.map((c) => (
              <Link
                key={c.id}
                href={`/admin/participants?contestId=${c.id}`}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  c.id === activeContestId
                    ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                    : "bg-[var(--surface-elevated)] text-[var(--foreground-muted)] border-[var(--border)] hover:border-[var(--accent)]/40"
                }`}
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Récap paiements */}
      {activeContest && activeContest.buyIn > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <div className="surface-card p-3 text-center">
            <div className="text-xl font-black text-[var(--success)]">{paidCount}</div>
            <div className="text-[10px] text-[var(--foreground-subtle)] uppercase tracking-wide">Payés</div>
          </div>
          <div className="surface-card p-3 text-center">
            <div className="text-xl font-black text-[var(--warning)]">{unpaidCount}</div>
            <div className="text-[10px] text-[var(--foreground-subtle)] uppercase tracking-wide">En attente</div>
          </div>
          <div className="surface-card p-3 text-center">
            <div className="text-xl font-black text-[var(--accent)]">{totalCollected}€</div>
            <div className="text-[10px] text-[var(--foreground-subtle)] uppercase tracking-wide">Collectés</div>
          </div>
        </div>
      )}

      {/* IBAN du concours actif */}
      {activeContest?.iban && (
        <div className="surface-card p-3 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wide">
            <Banknote size={13} />
            IBAN à communiquer
          </div>
          <div className="text-sm font-mono text-[var(--foreground)] break-all">{activeContest.iban}</div>
          {activeContest.paymentInstructions && (
            <div className="text-xs text-[var(--foreground-muted)] whitespace-pre-line">{activeContest.paymentInstructions}</div>
          )}
        </div>
      )}

      <AddUserForm contests={contests} />

      <section>
        <div className="flex items-center gap-2 mb-2">
          <Users size={14} className="text-[var(--foreground-muted)]" />
          <h2 className="text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-wider">
            Liste des participants
          </h2>
        </div>
        <ParticipantsList participants={participants} />
      </section>
    </div>
  )
}
