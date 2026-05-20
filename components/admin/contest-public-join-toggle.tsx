"use client"

import { useState, useTransition } from "react"
import { Globe, Lock } from "lucide-react"
import { togglePublicJoin } from "@/actions/admin.actions"
import { toast } from "sonner"

interface Props {
  contestId: string
  allowPublicJoin: boolean
}

export function ContestPublicJoinToggle({ contestId, allowPublicJoin: initialValue }: Props) {
  const [enabled, setEnabled] = useState(initialValue)
  const [isPending, startTransition] = useTransition()

  const handleToggle = () => {
    const next = !enabled
    setEnabled(next)
    startTransition(async () => {
      const result = await togglePublicJoin(contestId, next)
      if (!result.success) {
        setEnabled(!next)
        toast.error("Erreur lors de la mise à jour")
      } else {
        toast.success(next ? "Inscriptions publiques activées" : "Inscriptions publiques désactivées")
      }
    })
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {enabled
          ? <Globe size={14} className="text-[var(--success)]" />
          : <Lock size={14} className="text-[var(--foreground-muted)]" />
        }
        <div>
          <p className="text-xs font-semibold text-[var(--foreground)]">
            Inscriptions via lien
          </p>
          <p className="text-[10px] text-[var(--foreground-muted)]">
            {enabled ? "Ouvertes — n'importe qui avec le lien peut rejoindre" : "Fermées — lien désactivé"}
          </p>
        </div>
      </div>
      <button
        onClick={handleToggle}
        disabled={isPending}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
          enabled ? "bg-[var(--success)]" : "bg-[var(--surface-elevated)] border border-[var(--border)]"
        } ${isPending ? "opacity-60" : ""}`}
        aria-label={enabled ? "Désactiver les inscriptions publiques" : "Activer les inscriptions publiques"}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
            enabled ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  )
}
