"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createContest } from "@/actions/admin.actions"
import { Plus, Minus } from "lucide-react"
import { toast } from "sonner"
import type { Metadata } from "next"

const TEMPLATES = [
  { slug: "world-cup-2026", name: "Coupe du Monde FIFA 2026" },
]

export default function NouveauConcoursPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [name, setName] = useState("Coupe du Monde 2026")
  const [templateSlug, setTemplateSlug] = useState("world-cup-2026")
  const [buyIn, setBuyIn] = useState(20)

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
  const [itmCount, setItmCount] = useState(4)
  const [payouts, setPayouts] = useState([
    { position: 1, amount: 250 },
    { position: 2, amount: 100 },
    { position: 3, amount: 50 },
    { position: 4, amount: 20 },
  ])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await createContest({
        name,
        templateSlug,
        buyIn,
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
        prizepool: { itmCount, payouts },
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
        {/* General */}
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

        {/* Scoring */}
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
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--foreground)]">Places ITM</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setItmCount(Math.max(1, itmCount - 1))} className="stepper-btn w-8 h-8 text-base">−</button>
              <span className="w-6 text-center font-bold text-[var(--foreground)]">{itmCount}</span>
              <button type="button" onClick={() => setItmCount(itmCount + 1)} className="stepper-btn w-8 h-8 text-base">+</button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {payouts.map((payout, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-sm text-[var(--foreground-muted)] w-8">{payout.position}e</span>
                <input
                  type="number"
                  min={0}
                  value={payout.amount}
                  onChange={(e) => {
                    const newPayouts = [...payouts]
                    newPayouts[idx] = { ...payout, amount: Number(e.target.value) }
                    setPayouts(newPayouts)
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[var(--accent)]"
                />
                <span className="text-sm text-[var(--foreground-muted)]">€</span>
              </div>
            ))}
          </div>
        </section>

        <button
          type="submit"
          disabled={isPending}
          className="py-3 rounded-xl gradient-accent text-white font-bold text-sm hover:opacity-90 transition-all active:scale-95"
        >
          {isPending ? "Création..." : "Créer le concours"}
        </button>
      </form>
    </div>
  )
}
