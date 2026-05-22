"use client"

import { useState, useTransition } from "react"
import { toggleParticipantPaid, removeParticipant } from "@/actions/admin.actions"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { toast } from "sonner"
import { CheckCircle, Circle, UserX } from "lucide-react"

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
  const [list, setList] = useState(participants)

  const onRemove = (id: string) => setList((prev) => prev.filter((p) => p.id !== id))

  return (
    <div className="flex flex-col gap-2">
      {list.map((p) => (
        <ParticipantRow key={p.id} participant={p} onRemove={onRemove} />
      ))}
      {list.length === 0 && (
        <div className="text-center py-8 text-[var(--foreground-muted)] text-sm">
          Aucun participant.
        </div>
      )}
    </div>
  )
}

function ParticipantRow({
  participant,
  onRemove,
}: {
  participant: Participant
  onRemove: (id: string) => void
}) {
  const [hasPaid, setHasPaid] = useState(participant.hasPaid)
  const [isPending, startTransition] = useTransition()
  const [confirmOpen, setConfirmOpen] = useState(false)

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

  const confirmRemove = () => {
    setConfirmOpen(false)
    onRemove(participant.id)
    startTransition(async () => {
      const result = await removeParticipant(participant.id)
      if (!result.success) {
        toast.error("Erreur lors de la suppression")
      } else {
        toast.success(`${participant.user.firstName} ${participant.user.lastName} exclu du concours`)
      }
    })
  }

  return (
    <>
    <ConfirmDialog
      open={confirmOpen}
      title="Exclure du concours"
      description={`Retirer ${participant.user.firstName} ${participant.user.lastName} de ce concours ? Ses pronostics seront conservés mais il n'apparaîtra plus dans le classement.`}
      confirmLabel="Exclure"
      onConfirm={confirmRemove}
      onCancel={() => setConfirmOpen(false)}
    />
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
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
          hasPaid
            ? "bg-[var(--success-dim)] text-[var(--success)]"
            : "bg-[var(--surface-elevated)] text-[var(--foreground-muted)]"
        }`}>
          {hasPaid ? "Payé" : "En attente"}
        </span>
        <button
          onClick={() => setConfirmOpen(true)}
          disabled={isPending}
          title="Exclure du concours"
          className="text-[var(--foreground-subtle)] hover:text-[var(--error)] transition-colors disabled:opacity-50"
        >
          <UserX size={16} />
        </button>
      </div>
    </div>
    </>
  )
}
