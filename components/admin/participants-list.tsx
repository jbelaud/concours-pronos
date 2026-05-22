"use client"

import { useState, useTransition } from "react"
import { toggleParticipantPaid } from "@/actions/admin.actions"
import { toast } from "sonner"
import { CheckCircle, Circle } from "lucide-react"

interface Participant {
  id: string
  hasPaid: boolean
  joinedAt: Date
  user: {
    id: string
    firstName: string
    lastName: string
    email: string | null
    role: string
    subProfile: {
      owner: { firstName: string; lastName: string }
    } | null
  }
}

export function ParticipantsList({ participants }: { participants: Participant[] }) {
  return (
    <div className="flex flex-col gap-2">
      {participants.map((p) => (
        <ParticipantRow key={p.id} participant={p} />
      ))}
      {participants.length === 0 && (
        <div className="text-center py-8 text-[var(--foreground-muted)] text-sm">
          Aucun participant.
        </div>
      )}
    </div>
  )
}

function ParticipantRow({ participant }: { participant: Participant }) {
  const [hasPaid, setHasPaid] = useState(participant.hasPaid)
  const [isPending, startTransition] = useTransition()

  const toggle = () => {
    const next = !hasPaid
    setHasPaid(next)
    startTransition(async () => {
      const result = await toggleParticipantPaid(participant.id, next)
      if (!result.success) {
        setHasPaid(!next)
        toast.error("Erreur lors de la mise à jour")
      } else {
        toast.success(next ? `${participant.user.firstName} a payé` : `${participant.user.firstName} marqué non payé`)
      }
    })
  }

  return (
    <div className="surface-card p-3 flex items-center gap-3">
      <button
        onClick={toggle}
        disabled={isPending}
        className="shrink-0 transition-opacity disabled:opacity-50"
        title={hasPaid ? "Marquer comme non payé" : "Marquer comme payé"}
      >
        {hasPaid
          ? <CheckCircle size={22} className="text-[var(--success)]" />
          : <Circle size={22} className="text-[var(--foreground-subtle)]" />
        }
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-sm text-[var(--foreground)]">
            {participant.user.firstName} {participant.user.lastName}
          </span>
          {participant.user.role === "GHOST" && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--purple-dim)] text-[var(--purple)] shrink-0">
              sous-profil
            </span>
          )}
        </div>
        <div className="text-xs text-[var(--foreground-muted)] truncate">
          {participant.user.role === "GHOST" && participant.user.subProfile
            ? `Profil de ${participant.user.subProfile.owner.firstName} ${participant.user.subProfile.owner.lastName}`
            : (participant.user.email ?? "")}
        </div>
      </div>
      <div className="shrink-0">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
          hasPaid
            ? "bg-[var(--success-dim)] text-[var(--success)]"
            : "bg-[var(--surface-elevated)] text-[var(--foreground-muted)]"
        }`}>
          {hasPaid ? "Payé" : "En attente"}
        </span>
      </div>
    </div>
  )
}
