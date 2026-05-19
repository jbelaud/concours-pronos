"use client"

import { useTransition } from "react"
import { updateContestStatus } from "@/actions/admin.actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

const TRANSITIONS: Record<string, { next: "REGISTRATION" | "ONGOING" | "FINISHED"; label: string; cls: string }> = {
  DRAFT:        { next: "REGISTRATION", label: "Ouvrir les inscriptions", cls: "bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--accent)]/30" },
  REGISTRATION: { next: "ONGOING",      label: "Lancer le concours",      cls: "bg-[var(--success-dim)] text-[var(--success)] border-[var(--success)]/30" },
  ONGOING:      { next: "FINISHED",     label: "Terminer le concours",    cls: "bg-[var(--surface-elevated)] text-[var(--foreground-muted)] border-[var(--border)]" },
}

export function ContestStatusButton({ contestId, status }: { contestId: string; status: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const transition = TRANSITIONS[status]
  if (!transition) return null

  const handleClick = () => {
    startTransition(async () => {
      await updateContestStatus(contestId, transition.next)
      toast.success(`Statut mis à jour : ${transition.next === "REGISTRATION" ? "Inscriptions ouvertes" : transition.next === "ONGOING" ? "Concours lancé" : "Concours terminé"}`)
      router.refresh()
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`flex-1 flex items-center justify-center py-2 rounded-lg text-xs font-semibold border transition-all hover:opacity-80 active:scale-95 disabled:opacity-50 ${transition.cls}`}
    >
      {isPending ? "..." : transition.label}
    </button>
  )
}
