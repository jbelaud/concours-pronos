"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import { updateContest } from "@/actions/admin.actions"
import { Info } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

function computeDefaultPayouts(totalAmount: number, itmCount: number): Array<{ position: number; amount: number }> {
  if (totalAmount <= 0 || itmCount <= 0) return []
  const ratios = [0.5, 0.3, 0.15, 0.05, 0.03, 0.02]
  const payouts: Array<{ position: number; amount: number }> = []
  let remaining = totalAmount
  for (let i = 0; i < itmCount; i++) {
    let amount: number
    if (i === itmCount - 1) {
      amount = Math.round(remaining)
    } else {
      const ratio = ratios[i] ?? (1 / itmCount)
      amount = Math.round(totalAmount * ratio)
      remaining -= amount
    }
    payouts.push({ position: i + 1, amount: Math.max(0, amount) })
  }
  return payouts
}

interface Props {
  contestId: string
  initialName: string
  initialIsFree: boolean
  initialBuyIn: number
  initialIban: string
  initialPaymentInstructions: string
  initialSettings: {
    pointsCorrectResult: number
    pointsExactScore: number
    pointsWrongResult: number
    pointsWinner: number
    pointsTopScorer: number
    pointsBestAttack: number
    pointsBestDefense: number
    pointsGroupFirst: number
    pointsGroupSecond: number
    knockoutScoringRule: "REGULAR_TIME" | "FULL_TIME"
  }
  initialPrizepool: {
    totalAmount: number
    itmCount: number
    payouts: Array<{ position: number; amount: number }>
  }
}

export function EditContestForm({
  contestId,
  initialName,
  initialIsFree,
  initialBuyIn,
  initialIban,
  initialPaymentInstructions,
  initialSettings,
  initialPrizepool,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [isFree, setIsFree] = useState(initialIsFree)
  const [name, setName] = useState(initialName)
  const [buyIn, setBuyIn] = useState(initialBuyIn)
  const [iban, setIban] = useState(initialIban)
  const [paymentInstructions, setPaymentInstructions] = useState(initialPaymentInstructions)

  const [pointsCorrectResult, setPointsCorrectResult] = useState(initialSettings.pointsCorrectResult)
  const [pointsExactScore, setPointsExactScore] = useState(initialSettings.pointsExactScore)
  const [pointsWrongResult] = useState(initialSettings.pointsWrongResult)
  const [pointsWinner, setPointsWinner] = useState(initialSettings.pointsWinner)
  const [pointsTopScorer, setPointsTopScorer] = useState(initialSettings.pointsTopScorer)
  const [pointsBestAttack, setPointsBestAttack] = useState(initialSettings.pointsBestAttack)
  const [pointsBestDefense, setPointsBestDefense] = useState(initialSettings.pointsBestDefense)
  const [pointsGroupFirst, setPointsGroupFirst] = useState(initialSettings.pointsGroupFirst)
  const [pointsGroupSecond, setPointsGroupSecond] = useState(initialSettings.pointsGroupSecond)
  const [knockoutScoringRule, setKnockoutScoringRule] = useState<"REGULAR_TIME" | "FULL_TIME">(initialSettings.knockoutScoringRule)

  const [totalAmount, setTotalAmount] = useState(initialPrizepool.totalAmount)
  const [itmCount, setItmCount] = useState(initialPrizepool.itmCount || 4)
  const [payouts, setPayouts] = useState(
    initialPrizepool.payouts.length > 0
      ? initialPrizepool.payouts
      : [{ position: 1, amount: 0 }, { position: 2, amount: 0 }, { position: 3, amount: 0 }, { position: 4, amount: 0 }]
  )

  useEffect(() => {
    setPayouts((prev) => {
      return Array.from({ length: itmCount }, (_, i) => ({
        position: i + 1,
        amount: prev[i]?.amount ?? 0,
      }))
    })
  }, [itmCount])

  const payoutsSum = payouts.reduce((s, p) => s + p.amount, 0)
  const payoutsDiff = totalAmount > 0 ? totalAmount - payoutsSum : null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!isFree && totalAmount > 0 && Math.abs(payoutsDiff ?? 0) > 0.5) {
      toast.error(`La somme des gains (${payoutsSum}€) ne correspond pas au prizepool total (${totalAmount}€).`)
      return
    }

    startTransition(async () => {
      const result = await updateContest({
        contestId,
        name,
        isFree,
        buyIn: isFree ? 0 : buyIn,
        iban: isFree ? undefined : (iban || undefined),
        paymentInstructions: isFree ? undefined : (paymentInstructions || undefined),
        settings: {
          pointsCorrectResult,
          pointsExactScore,
          pointsWrongResult,
          pointsWinner,
          pointsTopScorer,
          pointsBestAttack,
          pointsBestDefense,
          pointsGroupFirst,
          pointsGroupSecond,
          knockoutScoringRule,
        },
        prizepool: isFree ? { totalAmount: 0, itmCount: 0, payouts: [] } : { totalAmount, itmCount, payouts },
      })

      if ("error" in result) {
        toast.error(String(result.error))
      } else {
        toast.success("Concours mis à jour !")
        router.push("/admin/concours")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">

      {/* Type de concours */}
      <section className="surface-card p-4 flex flex-col gap-3">
        <h2 className="text-sm font-bold text-[var(--foreground)]">Type de concours</h2>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setIsFree(false)}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
              !isFree
                ? "border-[var(--accent)] bg-[var(--accent-dim)] text-[var(--accent)]"
                : "border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--foreground-muted)]"
            )}
          >
            <span className="text-2xl">💰</span>
            <span className="text-xs font-bold">Payant</span>
            <span className="text-[10px] text-center opacity-70">Buy-in + cagnotte</span>
          </button>
          <button
            type="button"
            onClick={() => setIsFree(true)}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
              isFree
                ? "border-[var(--success)] bg-[var(--success-dim)] text-[var(--success)]"
                : "border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--foreground-muted)]"
            )}
          >
            <span className="text-2xl">🆓</span>
            <span className="text-xs font-bold">Gratuit</span>
            <span className="text-[10px] text-center opacity-70">Sans mise ni cagnotte</span>
          </button>
        </div>
      </section>

      {/* Général */}
      <section className="surface-card p-4 flex flex-col gap-3">
        <h2 className="text-sm font-bold text-[var(--foreground)]">Général</h2>

        <div>
          <label className="text-xs text-[var(--foreground-muted)] mb-1 block">Nom du concours</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full py-2.5 px-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[var(--accent)]"
          />
        </div>

        {!isFree && (
          <div>
            <label className="text-xs text-[var(--foreground-muted)] mb-1 block">Buy-in (€)</label>
            <input
              type="number"
              min={0}
              value={buyIn}
              onChange={(e) => setBuyIn(Number(e.target.value))}
              className="w-full py-2.5 px-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
        )}
      </section>

      {/* Paiement (payant uniquement) */}
      {!isFree && (
        <section className="surface-card p-4 flex flex-col gap-3">
          <h2 className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
            🏦 Coordonnées de paiement
            <span className="text-[10px] font-normal text-[var(--foreground-subtle)] bg-[var(--surface-elevated)] px-2 py-0.5 rounded-full">optionnel</span>
          </h2>

          <div>
            <label className="text-xs text-[var(--foreground-muted)] mb-1 block">IBAN</label>
            <input
              value={iban}
              onChange={(e) => setIban(e.target.value)}
              placeholder="FR76 xxxx xxxx xxxx xxxx xxxx xxx"
              className="w-full py-2.5 px-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] text-sm font-mono focus:outline-none focus:border-[var(--accent)] placeholder:text-[var(--foreground-subtle)]"
            />
          </div>

          <div>
            <label className="text-xs text-[var(--foreground-muted)] mb-1 block">Instructions de paiement</label>
            <textarea
              value={paymentInstructions}
              onChange={(e) => setPaymentInstructions(e.target.value)}
              rows={3}
              placeholder="Ex : Virement au nom de Jean Dupont, référence : ConcoursPronos 2026"
              className="w-full py-2.5 px-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[var(--accent)] placeholder:text-[var(--foreground-subtle)] resize-none"
            />
          </div>
        </section>
      )}

      {/* Système de points */}
      <section className="surface-card p-4 flex flex-col gap-3">
        <h2 className="text-sm font-bold text-[var(--foreground)]">Système de points — Matchs</h2>
        {[
          { label: "Résultat correct", value: pointsCorrectResult, setter: setPointsCorrectResult },
          { label: "Score exact (bonus)", value: pointsExactScore, setter: setPointsExactScore },
          { label: "Vainqueur du tournoi", value: pointsWinner, setter: setPointsWinner },
          { label: "Meilleur buteur", value: pointsTopScorer, setter: setPointsTopScorer },
          { label: "Meilleure attaque", value: pointsBestAttack, setter: setPointsBestAttack },
          { label: "Meilleure défense", value: pointsBestDefense, setter: setPointsBestDefense },
          { label: "1er de groupe", value: pointsGroupFirst, setter: setPointsGroupFirst },
          { label: "2e de groupe", value: pointsGroupSecond, setter: setPointsGroupSecond },
        ].map(({ label, value, setter }) => (
          <div key={label} className="flex items-center justify-between">
            <span className="text-sm text-[var(--foreground)]">{label}</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setter(Math.max(0, value - 1))} className="stepper-btn w-8 h-8 text-base">−</button>
              <span className="w-6 text-center font-bold text-[var(--foreground)]">{value}</span>
              <button type="button" onClick={() => setter(value + 1)} className="stepper-btn w-8 h-8 text-base">+</button>
            </div>
          </div>
        ))}
      </section>

      {/* Règle de scoring knockout */}
      <section className="surface-card p-4 flex flex-col gap-3">
        <h2 className="text-sm font-bold text-[var(--foreground)]">Règle de scoring — Phases éliminatoires</h2>
        <p className="text-xs text-[var(--foreground-muted)]">
          Comment évaluer les pronostics des matchs à élimination directe en cas de prolongations ?
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setKnockoutScoringRule("REGULAR_TIME")}
            className={cn(
              "flex flex-col gap-1 p-3 rounded-xl border-2 text-left transition-all",
              knockoutScoringRule === "REGULAR_TIME"
                ? "border-[var(--accent)] bg-[var(--accent-dim)]"
                : "border-[var(--border)] bg-[var(--surface-elevated)]"
            )}
          >
            <div className="flex items-center gap-2">
              <span className={cn("text-xs font-bold", knockoutScoringRule === "REGULAR_TIME" ? "text-[var(--accent)]" : "text-[var(--foreground)]")}>
                Option A — Score à 90&apos;
              </span>
              {knockoutScoringRule === "REGULAR_TIME" && (
                <span className="text-[10px] bg-[var(--accent)] text-[var(--background)] px-1.5 py-0.5 rounded-full font-bold">Actif</span>
              )}
            </div>
            <p className="text-[11px] text-[var(--foreground-muted)]">
              Le pronostic est évalué uniquement sur le score à 90&apos;. Les prolongations et tirs au but ne comptent pas pour le score.
            </p>
          </button>
          <button
            type="button"
            onClick={() => setKnockoutScoringRule("FULL_TIME")}
            className={cn(
              "flex flex-col gap-1 p-3 rounded-xl border-2 text-left transition-all",
              knockoutScoringRule === "FULL_TIME"
                ? "border-[var(--purple)] bg-[var(--purple-dim)]"
                : "border-[var(--border)] bg-[var(--surface-elevated)]"
            )}
          >
            <div className="flex items-center gap-2">
              <span className={cn("text-xs font-bold", knockoutScoringRule === "FULL_TIME" ? "text-[var(--purple)]" : "text-[var(--foreground)]")}>
                Option B — Score final (incl. prolongations)
              </span>
              {knockoutScoringRule === "FULL_TIME" && (
                <span className="text-[10px] bg-[var(--purple)] text-white px-1.5 py-0.5 rounded-full font-bold">Actif</span>
              )}
            </div>
            <p className="text-[11px] text-[var(--foreground-muted)]">
              Le pronostic est évalué sur le score final après prolongations. Les tirs au but ne comptent pas.
            </p>
          </button>
        </div>
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border)]">
          <Info size={12} className="text-[var(--foreground-muted)] mt-0.5 shrink-0" />
          <p className="text-[10px] text-[var(--foreground-muted)]">
            Cette règle sera affichée aux participants sur la page des pronostics. Pour les matchs de groupes, c&apos;est toujours le score final à 90&apos; qui compte.
          </p>
        </div>
      </section>

      {/* Prizepool (payant uniquement) */}
      {!isFree && (
        <section className="surface-card p-4 flex flex-col gap-3">
          <h2 className="text-sm font-bold text-[var(--foreground)]">Prizepool</h2>

          <div>
            <label className="text-xs text-[var(--foreground-muted)] mb-1 block">Prizepool total (€)</label>
            <input
              type="number"
              min={0}
              value={totalAmount || ""}
              onChange={(e) => setTotalAmount(Number(e.target.value))}
              placeholder="ex: 500"
              className="w-full py-2.5 px-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[var(--accent)] placeholder:text-[var(--foreground-subtle)]"
            />
            {totalAmount > 0 && (
              <p className="text-[11px] text-[var(--foreground-subtle)] mt-1 flex items-center gap-1">
                <Info size={11} />
                Tu peux ajuster la répartition ci-dessous
              </p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--foreground)]">Places payées (ITM)</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setItmCount(Math.max(1, itmCount - 1))} className="stepper-btn w-8 h-8 text-base">−</button>
              <span className="w-6 text-center font-bold text-[var(--foreground)]">{itmCount}</span>
              <button type="button" onClick={() => setItmCount(itmCount + 1)} className="stepper-btn w-8 h-8 text-base">+</button>
            </div>
          </div>

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
                    const newPayouts = [...payouts]
                    newPayouts[idx] = { ...payout, amount: Number(e.target.value) }
                    setPayouts(newPayouts)
                  }}
                  placeholder="0"
                  className="flex-1 py-2 px-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[var(--accent)]"
                />
                <span className="text-sm text-[var(--foreground-muted)] shrink-0">€</span>
              </div>
            ))}
          </div>

          {totalAmount > 0 && (
            <div className={`text-xs p-2 rounded-lg flex items-center justify-between ${
              Math.abs(payoutsDiff ?? 0) <= 0.5
                ? "bg-[var(--success-dim)] text-[var(--success)]"
                : "bg-[var(--warning-dim)] text-[var(--warning)]"
            }`}>
              <span>Total réparti : {payoutsSum}€</span>
              {Math.abs(payoutsDiff ?? 0) > 0.5 && (
                <span>
                  {(payoutsDiff ?? 0) > 0 ? `−${payoutsDiff}€ non alloués` : `+${Math.abs(payoutsDiff ?? 0)}€ en trop`}
                </span>
              )}
              {Math.abs(payoutsDiff ?? 0) <= 0.5 && <span>✓ Équilibré</span>}
            </div>
          )}
        </section>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="py-3 rounded-xl gradient-accent text-white font-bold text-sm hover:opacity-90 transition-all active:scale-95 disabled:opacity-70"
      >
        {isPending ? "Enregistrement..." : "Enregistrer les modifications"}
      </button>
    </form>
  )
}
