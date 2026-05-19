"use client"

import { useState, useTransition } from "react"
import { updateContestPayment } from "@/actions/admin.actions"
import { toast } from "sonner"
import { Building2, Save, ChevronDown, ChevronUp } from "lucide-react"

interface ContestPaymentFormProps {
  contestId: string
  iban: string | null
  paymentInstructions: string | null
}

export function ContestPaymentForm({ contestId, iban: initialIban, paymentInstructions: initialInstructions }: ContestPaymentFormProps) {
  const [open, setOpen] = useState(false)
  const [iban, setIban] = useState(initialIban ?? "")
  const [paymentInstructions, setPaymentInstructions] = useState(initialInstructions ?? "")
  const [isPending, startTransition] = useTransition()

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateContestPayment({ contestId, iban, paymentInstructions })
      if (result.success) {
        toast.success("Coordonnées de paiement mises à jour")
        setOpen(false)
      }
    })
  }

  return (
    <div className="border border-[var(--border)] rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-[var(--surface-elevated)] text-sm"
      >
        <div className="flex items-center gap-2 text-[var(--foreground-muted)]">
          <Building2 size={14} />
          <span className="font-semibold">
            {initialIban ? "IBAN configuré" : "Configurer le paiement IBAN"}
          </span>
          {initialIban && (
            <span className="text-[10px] font-mono text-[var(--foreground-subtle)] truncate max-w-[120px]">
              {initialIban.slice(0, 12)}…
            </span>
          )}
        </div>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {open && (
        <div className="p-3 flex flex-col gap-3 bg-[var(--surface)]">
          <div>
            <label className="text-xs text-[var(--foreground-muted)] mb-1 block">IBAN</label>
            <input
              value={iban}
              onChange={(e) => setIban(e.target.value)}
              placeholder="FR76 xxxx xxxx xxxx xxxx xxxx xxx"
              className="w-full py-2 px-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] text-sm font-mono focus:outline-none focus:border-[var(--accent)] placeholder:text-[var(--foreground-subtle)]"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--foreground-muted)] mb-1 block">Instructions</label>
            <textarea
              value={paymentInstructions}
              onChange={(e) => setPaymentInstructions(e.target.value)}
              rows={2}
              placeholder="Ex : Virement au nom de Jean Dupont, référence : ConcoursPronos 2026"
              className="w-full py-2 px-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[var(--accent)] placeholder:text-[var(--foreground-subtle)] resize-none"
            />
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="flex items-center justify-center gap-2 py-2 rounded-xl gradient-accent text-white text-sm font-semibold hover:opacity-90 transition-all active:scale-95 disabled:opacity-70"
          >
            <Save size={14} />
            {isPending ? "Sauvegarde..." : "Sauvegarder"}
          </button>
        </div>
      )}
    </div>
  )
}
