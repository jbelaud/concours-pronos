"use client"

import { useState, useTransition, useEffect } from "react"
import { updateContestPrizepool } from "@/actions/admin.actions"
import { toast } from "sonner"
import { Trophy, Save, ChevronDown, ChevronUp, Info } from "lucide-react"

interface Payout {
  position: number
  amount: number
}

interface ContestPrizepoolFormProps {
  contestId: string
  totalAmount: number
  itmCount: number
  payouts: Payout[]
}

function computeDefaultPayouts(total: number, count: number): Payout[] {
  if (total <= 0 || count <= 0) return []
  const ratios = [0.5, 0.3, 0.15, 0.05, 0.03, 0.02]
  let remaining = total
  return Array.from({ length: count }, (_, i) => {
    let amount: number
    if (i === count - 1) {
      amount = Math.round(remaining)
    } else {
      const ratio = ratios[i] ?? (1 / count)
      amount = Math.round(total * ratio)
      remaining -= amount
    }
    return { position: i + 1, amount: Math.max(0, amount) }
  })
}

export function ContestPrizepoolForm({ contestId, totalAmount: initTotal, itmCount: initItm, payouts: initPayouts }: ContestPrizepoolFormProps) {
  const [open, setOpen] = useState(false)
  const [totalAmount, setTotalAmount] = useState(initTotal)
  const [itmCount, setItmCount] = useState(initItm)
  const [payouts, setPayouts] = useState<Payout[]>(initPayouts.length > 0 ? initPayouts : [])
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setPayouts((prev) =>
      Array.from({ length: itmCount }, (_, i) => ({
        position: i + 1,
        amount: prev[i]?.amount ?? 0,
      }))
    )
  }, [itmCount])

  const payoutsSum = payouts.reduce((s, p) => s + p.amount, 0)
  const diff = totalAmount > 0 ? totalAmount - payoutsSum : null

  const handleAutoDistribute = () => {
    if (totalAmount <= 0) {
      toast.error("Entre d'abord le prizepool total")
      return
    }
    setPayouts(computeDefaultPayouts(totalAmount, itmCount))
  }

  const handleSave = () => {
    if (totalAmount > 0 && Math.abs(diff ?? 0) > 0.5) {
      toast.error(`La somme des gains (${payoutsSum}€) ne correspond pas au total (${totalAmount}€)`)
      return
    }
    startTransition(async () => {
      const result = await updateContestPrizepool({ contestId, totalAmount, itmCount, payouts })
      if (result.success) {
        toast.success("Prizepool mis à jour")
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
          <Trophy size={14} />
          <span className="font-semibold">Prizepool</span>
          {initTotal > 0 && (
            <span className="text-[10px] text-[var(--accent)] font-bold">{initTotal}€ total · {initItm} places</span>
          )}
        </div>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {open && (
        <div className="p-3 flex flex-col gap-3 bg-[var(--surface)]">
          {/* Total */}
          <div>
            <label className="text-xs text-[var(--foreground-muted)] mb-1 block">Prizepool total (€)</label>
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                value={totalAmount || ""}
                onChange={(e) => setTotalAmount(Number(e.target.value))}
                placeholder="ex: 500"
                className="flex-1 py-2 px-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[var(--accent)]"
              />
              <button
                type="button"
                onClick={handleAutoDistribute}
                className="text-xs px-3 py-2 rounded-xl bg-[var(--accent-dim)] text-[var(--accent)] font-semibold hover:opacity-80 transition-colors shrink-0"
              >
                Auto
              </button>
            </div>
            <p className="text-[11px] text-[var(--foreground-subtle)] mt-1 flex items-center gap-1">
              <Info size={11} />
              Clique sur &quot;Auto&quot; pour recalculer la répartition automatiquement
            </p>
          </div>

          {/* Nombre de places */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--foreground)]">Places payées (ITM)</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setItmCount(Math.max(1, itmCount - 1))} className="stepper-btn w-8 h-8 text-base">−</button>
              <span className="w-6 text-center font-bold text-[var(--foreground)]">{itmCount}</span>
              <button type="button" onClick={() => setItmCount(itmCount + 1)} className="stepper-btn w-8 h-8 text-base">+</button>
            </div>
          </div>

          {/* Montants */}
          <div className="flex flex-col gap-2">
            {payouts.map((payout, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-base shrink-0 w-8 text-center">
                  {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${payout.position}e`}
                </span>
                <input
                  type="number"
                  min={0}
                  value={payout.amount || ""}
                  onChange={(e) => {
                    const next = [...payouts]
                    next[idx] = { ...payout, amount: Number(e.target.value) }
                    setPayouts(next)
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[var(--accent)]"
                />
                <span className="text-sm text-[var(--foreground-muted)] shrink-0">€</span>
              </div>
            ))}
          </div>

          {/* Cohérence */}
          {totalAmount > 0 && (
            <div className={`text-xs p-2 rounded-lg flex items-center justify-between ${
              Math.abs(diff ?? 0) <= 0.5
                ? "bg-[var(--success-dim)] text-[var(--success)]"
                : "bg-[var(--warning-dim)] text-[var(--warning)]"
            }`}>
              <span>Total réparti : {payoutsSum}€</span>
              {Math.abs(diff ?? 0) > 0.5
                ? <span>{(diff ?? 0) > 0 ? `${diff}€ non alloués` : `${Math.abs(diff ?? 0)}€ en trop`}</span>
                : <span>✓ Équilibré</span>
              }
            </div>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="flex items-center justify-center gap-2 py-2 rounded-xl gradient-accent text-white text-sm font-semibold hover:opacity-90 transition-all active:scale-95 disabled:opacity-70"
          >
            <Save size={14} />
            {isPending ? "Sauvegarde..." : "Sauvegarder le prizepool"}
          </button>
        </div>
      )}
    </div>
  )
}
