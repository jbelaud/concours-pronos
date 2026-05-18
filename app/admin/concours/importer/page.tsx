"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { importOpenFootballContest, importLocalJsonContest } from "@/actions/import.actions"
import { Download, FileJson, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import type { Metadata } from "next"

const PRESETS = [
  {
    label: "Coupe du Monde 2026",
    year: "2026",
    competition: "worldcup",
    contestName: "Coupe du Monde FIFA 2026",
  },
  {
    label: "Euro 2024",
    year: "2024",
    competition: "euro",
    contestName: "UEFA Euro 2024",
  },
]

const LOCAL_TEMPLATES = [
  { slug: "world-cup-2026", label: "Coupe du Monde 2026 (JSON local)" },
]

export default function ImporterPage() {
  const router = useRouter()
  const [tab, setTab] = useState<"openfootball" | "local">("openfootball")
  const [year, setYear] = useState("2026")
  const [competition, setCompetition] = useState("worldcup")
  const [contestName, setContestName] = useState("Coupe du Monde FIFA 2026")
  const [buyIn, setBuyIn] = useState(20)
  const [localSlug, setLocalSlug] = useState("world-cup-2026")
  const [isPending, startTransition] = useTransition()

  const applyPreset = (preset: (typeof PRESETS)[0]) => {
    setYear(preset.year)
    setCompetition(preset.competition)
    setContestName(preset.contestName)
  }

  const handleOpenFootball = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await importOpenFootballContest({ year, competition, contestName, buyIn })
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success("Tournoi importé depuis OpenFootball !")
        router.push("/admin")
      }
    })
  }

  const handleLocal = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await importLocalJsonContest({ slug: localSlug, contestName, buyIn })
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success("Tournoi importé depuis le fichier local !")
        router.push("/admin")
      }
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-black text-[var(--foreground)]">Importer un tournoi</h1>
        <p className="text-sm text-[var(--foreground-muted)]">
          Importe les équipes, groupes et matchs automatiquement
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[var(--surface-elevated)] rounded-xl border border-[var(--border)]">
        <button
          onClick={() => setTab("openfootball")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
            tab === "openfootball"
              ? "bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--accent)]/30"
              : "text-[var(--foreground-muted)]"
          }`}
        >
          <Download size={14} />
          OpenFootball
        </button>
        <button
          onClick={() => setTab("local")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
            tab === "local"
              ? "bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--accent)]/30"
              : "text-[var(--foreground-muted)]"
          }`}
        >
          <FileJson size={14} />
          Fichier local
        </button>
      </div>

      {tab === "openfootball" && (
        <form onSubmit={handleOpenFootball} className="flex flex-col gap-4">
          {/* Source info */}
          <div className="p-3 rounded-xl bg-[var(--accent-dim)] border border-[var(--accent)]/20 text-xs text-[var(--foreground-muted)]">
            <div className="flex items-center gap-1.5 mb-1 text-[var(--accent)] font-semibold">
              <ExternalLink size={12} />
              Source : openfootball/worldcup.json
            </div>
            Données ouvertes · équipes, groupes, matchs et scores · normalisées automatiquement
          </div>

          {/* Presets */}
          <div>
            <label className="text-xs text-[var(--foreground-muted)] mb-2 block">Raccourcis</label>
            <div className="flex flex-col gap-1.5">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="text-left py-2.5 px-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-sm font-semibold text-[var(--foreground)] hover:border-[var(--accent)]/50 transition-all"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="surface-card p-4 flex flex-col gap-3">
            <div>
              <label className="text-xs text-[var(--foreground-muted)] mb-1 block">Année</label>
              <input
                value={year}
                onChange={(e) => setYear(e.target.value)}
                required
                placeholder="2026"
                className="w-full py-2.5 px-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--foreground-muted)] mb-1 block">Compétition</label>
              <input
                value={competition}
                onChange={(e) => setCompetition(e.target.value)}
                required
                placeholder="worldcup"
                className="w-full py-2.5 px-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--foreground-muted)] mb-1 block">Nom du concours</label>
              <input
                value={contestName}
                onChange={(e) => setContestName(e.target.value)}
                required
                className="w-full py-2.5 px-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[var(--accent)]"
              />
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
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="py-3 rounded-xl gradient-accent text-white font-bold text-sm hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Download size={16} />
            {isPending ? "Importation en cours..." : "Importer depuis OpenFootball"}
          </button>
        </form>
      )}

      {tab === "local" && (
        <form onSubmit={handleLocal} className="flex flex-col gap-4">
          <div className="p-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-xs text-[var(--foreground-muted)]">
            Importe depuis les fichiers JSON locaux dans <code className="text-[var(--accent)]">/data/tournaments/</code>
          </div>

          <div className="surface-card p-4 flex flex-col gap-3">
            <div>
              <label className="text-xs text-[var(--foreground-muted)] mb-1 block">Tournoi local</label>
              <select
                value={localSlug}
                onChange={(e) => setLocalSlug(e.target.value)}
                className="w-full py-2.5 px-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[var(--accent)]"
              >
                {LOCAL_TEMPLATES.map((t) => (
                  <option key={t.slug} value={t.slug}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--foreground-muted)] mb-1 block">Nom du concours</label>
              <input
                value={contestName}
                onChange={(e) => setContestName(e.target.value)}
                required
                className="w-full py-2.5 px-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[var(--accent)]"
              />
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
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="py-3 rounded-xl gradient-accent text-white font-bold text-sm hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <FileJson size={16} />
            {isPending ? "Importation..." : "Importer le fichier local"}
          </button>
        </form>
      )}
    </div>
  )
}
