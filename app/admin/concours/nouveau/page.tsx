"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createContest } from "@/actions/admin.actions"
import { Plus, Minus, Info } from "lucide-react"
import { toast } from "sonner"

const TEMPLATES = [
  { slug: "world-cup-2026", name: "Coupe du Monde FIFA 2026" },
]

function computeDefaultPayouts(totalAmount: number, itmCount: number): Array<{ position: number; amount: number }> {
  if (totalAmount <= 0 || itmCount <= 0) return []
  // Répartition par défaut : 50% / 30% / 15% / 5% (arrondi)
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

export default function NouveauConcoursPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [name, setName] = useState("Coupe du Monde 2026")
  const [templateSlug, setTemplateSlug] = useState("world-cup-2026")
  const [buyIn, setBuyIn] = useState(20)
  const [iban, setIban] = useState("")
  const [paymentInstructions, setPaymentInstructions] = useState("")

  // Scoring
  const [pointsCorrectResult, setPointsCorrectResult] = useState(3)
  const [pointsExactScore, setPointsExactScore] = useState(1)
  const [pointsWrongResult] = useState(0)
  const [pointsWinner, setPointsWinner] = useState(10)
  const [pointsTopScorer, setPointsTopScorer] = useState(5)
  const [pointsBestAttack, setPointsBestAttack] = useState(3)
  const [pointsBestDefense, setPointsBestDefense] = useState(3)
  const [pointsGroupFirst, setPointsGroupFirst] = useState(2)
  const [pointsGroupSecond, setPointsGroupSecond] = useState(1)

  // Prizepool
  const [totalAmount, setTotalAmount] = useState(0)
  const [itmCount, setItmCount] = useState(4)
  const [payouts, setPayouts] = useState([
    { position: 1, amount: 0 },
    { position: 2, amount: 0 },
    { position: 3, amount: 0 },
    { position: 4, amount: 0 },
  ])

  // Synchronise les rangs quand itmCount change
  useEffect(() => {
    setPayouts((prev) => {
      const next = Array.from({ length: itmCount }, (_, i) => ({
        position: i + 1,
        amount: prev[i]?.amount ?? 0,
      }))
      return next
    })
  }, [itmCount])

  // Recalcul automatique quand totalAmount change
  useEffect(() => {
    if (totalAmount > 0) {
      setPayouts(computeDefaultPayouts(totalAmount, itmCount))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalAmount])

  const payoutsSum = payouts.reduce((s, p) => s + p.amount, 0)
  const payoutsDiff = totalAmount > 0 ? totalAmount - payoutsSum : null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (totalAmount > 0 && Math.abs(payoutsDiff ?? 0) > 0.5) {
      toast.error(`La somme des gains (${payoutsSum}€) ne correspond pas au prizepool total (${totalAmount}€).`)
      return
    }

    startTransition(async () => {
      const result = await createContest({
        name,
        templateSlug,
        buyIn,
        iban: iban || undefined,
        paymentInstructions: paymentInstructions || undefined,
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
        },
        prizepool: { totalAmount, itmCount, payouts },
      })

      if ("error" in result) {
        toast.error(String(result.error))
      } else {
        toast.success("Concours créé avec succès !")
        router.push("/admin")
      }
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-black text-[var(--foreground)]">Nouveau concours</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

          <div>
            <label className="text-xs text-[var(--foreground-muted)] mb-1 block">Tournoi</label>
            <select
              value={templateSlug}
              onChange={(e) => setTemplateSlug(e.target.value)}
              className="w-full py-2.5 px-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[var(--accent)]"
            >
              {TEMPLATES.map((t) => (
                <option key={t.slug} value={t.slug}>{t.name}</option>
              ))}
            </select>
          </div>

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
        </section>

        {/* Paiement */}
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

        {/* Système de points */}
        <section className="surface-card p-4 flex flex-col gap-3">
          <h2 className="text-sm font-bold text-[var(--foreground)]">Système de points</h2>
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

        {/* Prizepool */}
        <section className="surface-card p-4 flex flex-col gap-3">
          <h2 className="text-sm font-bold text-[var(--foreground)]">Prizepool</h2>

          {/* Total */}
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
                La répartition est calculée automatiquement mais tu peux l&apos;ajuster ci-dessous
              </p>
            )}
          </div>

          {/* Nombre de places */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--foreground)]">Places payées (ITM)</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setItmCount(Math.max(1, itmCount - 1))}
                className="stepper-btn w-8 h-8 text-base"
              >−</button>
              <span className="w-6 text-center font-bold text-[var(--foreground)]">{itmCount}</span>
              <button
                type="button"
                onClick={() => setItmCount(itmCount + 1)}
                className="stepper-btn w-8 h-8 text-base"
              >+</button>
            </div>
          </div>

          {/* Montants par place */}
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

          {/* Contrôle de cohérence */}
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

        <button
          type="submit"
          disabled={isPending}
          className="py-3 rounded-xl gradient-accent text-white font-bold text-sm hover:opacity-90 transition-all active:scale-95 disabled:opacity-70"
        >
          {isPending ? "Création..." : "Créer le concours"}
        </button>
      </form>
    </div>
  )
}
