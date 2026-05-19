import { db } from "@/lib/db"
import { ContestInviteLink } from "@/components/admin/contest-invite-link"
import { Link2, Users } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Invitations" }

export default async function InvitationsPage() {
  const contests = await db.contest.findMany({
    where: { status: { in: ["DRAFT", "REGISTRATION", "ONGOING"] } },
    include: {
      _count: { select: { participants: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-black text-[var(--foreground)]">Invitations</h1>
        <p className="text-sm text-[var(--foreground-muted)]">
          Partage le lien ou le QR code pour inviter des joueurs
        </p>
      </div>

      {contests.length === 0 && (
        <div className="text-center py-12 text-[var(--foreground-muted)] text-sm">
          Aucun concours actif. Crée un concours pour générer un lien d&apos;invitation.
        </div>
      )}

      <div className="flex flex-col gap-4">
        {contests.map((contest) => (
          <section key={contest.id} className="surface-card p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-bold text-[var(--foreground)]">{contest.name}</h2>
                <div className="flex items-center gap-1.5 mt-0.5 text-xs text-[var(--foreground-muted)]">
                  <Users size={12} />
                  <span>{contest._count.participants} participant{contest._count.participants > 1 ? "s" : ""}</span>
                </div>
              </div>
              <StatusBadge status={contest.status} />
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wide mb-2">
                <Link2 size={12} />
                Lien d&apos;invitation
              </div>
              <ContestInviteLink
                contestId={contest.id}
                contestName={contest.name}
                inviteToken={contest.inviteToken ?? null}
              />
            </div>
          </section>
        ))}
      </div>

      <div className="surface-card p-4 bg-[var(--accent-dim)] border-[var(--accent)]/20">
        <h3 className="text-sm font-bold text-[var(--foreground)] mb-1">Comment ça marche ?</h3>
        <ol className="text-xs text-[var(--foreground-muted)] flex flex-col gap-1 list-decimal list-inside">
          <li>Copie le lien ou affiche le QR code ci-dessus</li>
          <li>Partage-le avec les joueurs (WhatsApp, SMS, etc.)</li>
          <li>Ils cliquent, créent leur compte ou se connectent, et rejoignent automatiquement le concours</li>
          <li>Rends-toi dans <strong>Participants</strong> pour marquer les paiements</li>
        </ol>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; cls: string }> = {
    DRAFT: { label: "Brouillon", cls: "bg-[var(--surface-elevated)] text-[var(--foreground-muted)]" },
    REGISTRATION: { label: "Inscriptions", cls: "bg-[var(--success-dim)] text-[var(--success)]" },
    ONGOING: { label: "En cours", cls: "bg-[var(--accent-dim)] text-[var(--accent)]" },
    FINISHED: { label: "Terminé", cls: "bg-[var(--error-dim)] text-[var(--error)]" },
  }
  const { label, cls } = config[status] ?? { label: status, cls: "" }
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${cls}`}>
      {label}
    </span>
  )
}
