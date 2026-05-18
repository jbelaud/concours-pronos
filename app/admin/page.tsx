import { db } from "@/lib/db"
import Link from "next/link"
import { ClipboardCheck, Users, Swords, Plus } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Admin" }

export default async function AdminPage() {
  const contests = await db.contest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { participants: true, matches: true } },
    },
  })

  const pendingInvites = await db.invite.count({ where: { status: "PENDING" } })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-[var(--foreground)]">Tableau de bord</h1>
        <Link
          href="/admin/concours/nouveau"
          className="flex items-center gap-1.5 text-sm font-semibold gradient-accent text-white py-2 px-4 rounded-xl"
        >
          <Plus size={15} />
          Nouveau concours
        </Link>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-2">
        <Link href="/admin/invitations" className="surface-card p-4 flex items-center gap-3">
          <Users size={22} className="text-[var(--accent)]" />
          <div>
            <div className="font-bold text-[var(--foreground)]">{pendingInvites}</div>
            <div className="text-xs text-[var(--foreground-muted)]">Invitations en attente</div>
          </div>
        </Link>
        <Link href="/admin/resultats" className="surface-card p-4 flex items-center gap-3">
          <ClipboardCheck size={22} className="text-[var(--success)]" />
          <div>
            <div className="font-bold text-[var(--foreground)]">Résultats</div>
            <div className="text-xs text-[var(--foreground-muted)]">Saisir les scores</div>
          </div>
        </Link>
      </div>

      {/* Contests list */}
      <section>
        <h2 className="text-sm font-bold text-[var(--foreground-muted)] uppercase tracking-wider mb-2">
          Concours
        </h2>
        <div className="flex flex-col gap-2">
          {contests.map((contest) => (
            <div key={contest.id} className="surface-card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold text-[var(--foreground)]">{contest.name}</div>
                  <div className="text-xs text-[var(--foreground-muted)] mt-0.5">
                    {contest._count.participants} participants · {contest._count.matches} matchs
                  </div>
                </div>
                <StatusBadge status={contest.status} />
              </div>

              <div className="flex gap-2 mt-3">
                <Link
                  href={`/admin/resultats?contestId=${contest.id}`}
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-[var(--surface-elevated)] text-xs font-semibold text-[var(--foreground-muted)] hover:text-[var(--foreground)] border border-[var(--border)] transition-all"
                >
                  <ClipboardCheck size={13} />
                  Résultats
                </Link>
                <Link
                  href={`/admin/knockout?contestId=${contest.id}`}
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-[var(--surface-elevated)] text-xs font-semibold text-[var(--foreground-muted)] hover:text-[var(--foreground)] border border-[var(--border)] transition-all"
                >
                  <Swords size={13} />
                  Knockout
                </Link>
              </div>
            </div>
          ))}

          {contests.length === 0 && (
            <div className="text-center py-12 text-[var(--foreground-muted)] text-sm">
              <div className="text-3xl mb-2">📋</div>
              Aucun concours créé.{" "}
              <Link href="/admin/concours/nouveau" className="text-[var(--accent)]">
                Créer le premier
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: "bg-[var(--surface-elevated)] text-[var(--foreground-muted)]",
    REGISTRATION: "bg-[var(--accent-dim)] text-[var(--accent)]",
    ONGOING: "bg-[var(--success-dim)] text-[var(--success)]",
    FINISHED: "bg-[var(--surface-elevated)] text-[var(--foreground-subtle)]",
  }
  const labels: Record<string, string> = {
    DRAFT: "Brouillon",
    REGISTRATION: "Inscriptions",
    ONGOING: "En cours",
    FINISHED: "Terminé",
  }
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${styles[status] ?? ""}`}>
      {labels[status] ?? status}
    </span>
  )
}
