import { db } from "@/lib/db"
import { InviteForm } from "@/components/admin/invite-form"
import { formatDate, cn } from "@/lib/utils"
import { Mail, CheckCircle, Clock, XCircle } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Invitations" }

export default async function InvitationsPage() {
  const invites = await db.invite.findMany({
    orderBy: { sentAt: "desc" },
  })

  const contests = await db.contest.findMany({
    where: { status: { in: ["DRAFT", "REGISTRATION", "ONGOING"] } },
    select: { id: true, name: true },
  })

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-black text-[var(--foreground)]">Invitations</h1>
        <p className="text-sm text-[var(--foreground-muted)]">
          Inviter des joueurs par email
        </p>
      </div>

      <InviteForm contests={contests} />

      {/* Invites list */}
      <section>
        <h2 className="text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-wider mb-2">
          Invitations envoyées ({invites.length})
        </h2>
        <div className="flex flex-col gap-2">
          {invites.map((invite) => (
            <div key={invite.id} className="surface-card p-3 flex items-center gap-3">
              <StatusIcon status={invite.status} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-[var(--foreground)] truncate">
                  {invite.firstName} {invite.lastName}
                </div>
                <div className="text-xs text-[var(--foreground-muted)] truncate">
                  {invite.email}
                </div>
              </div>
              <div className="text-right shrink-0">
                <InviteStatusBadge status={invite.status} />
                <div className="text-[10px] text-[var(--foreground-subtle)] mt-0.5">
                  {formatDate(invite.sentAt, "d MMM")}
                </div>
              </div>
            </div>
          ))}
          {invites.length === 0 && (
            <div className="text-center py-8 text-[var(--foreground-muted)] text-sm">
              Aucune invitation envoyée.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function StatusIcon({ status }: { status: string }) {
  if (status === "ACCEPTED") return <CheckCircle size={18} className="text-[var(--success)] shrink-0" />
  if (status === "EXPIRED") return <XCircle size={18} className="text-[var(--error)] shrink-0" />
  return <Clock size={18} className="text-[var(--warning)] shrink-0" />
}

function InviteStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: "bg-[var(--warning-dim)] text-[var(--warning)]",
    ACCEPTED: "bg-[var(--success-dim)] text-[var(--success)]",
    EXPIRED: "bg-[var(--error-dim)] text-[var(--error)]",
  }
  const labels: Record<string, string> = {
    PENDING: "En attente",
    ACCEPTED: "Acceptée",
    EXPIRED: "Expirée",
  }
  return (
    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", styles[status] ?? "")}>
      {labels[status] ?? status}
    </span>
  )
}
