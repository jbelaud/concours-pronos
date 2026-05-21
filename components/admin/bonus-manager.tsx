"use client"

import { useState, useTransition } from "react"
import { applyBonusResults } from "@/actions/admin.actions"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { CheckCircle, Trophy, Crosshair, Swords, Shield, Search, X } from "lucide-react"

interface Team {
  id: string
  name: string
  flagEmoji: string | null
  group: string | null
}

interface ScorerCandidate {
  id: string
  name: string
  teamCode: string
  isWinner: boolean
}

interface Props {
  contestId: string
  teams: Team[]
  scorerCandidates: ScorerCandidate[]
  settings: {
    pointsWinner: number
    pointsTopScorer: number
    pointsBestAttack: number
    pointsBestDefense: number
  }
  initialWinnerId: string | null
  initialTopScorerIds: string[]
  initialBestAttackIds: string[]
  initialBestDefenseIds: string[]
  allMatchesFinished: boolean
}

// Single-select with search
function TeamSelector({
  label,
  icon,
  points,
  teams,
  selectedId,
  onSelect,
}: {
  label: string
  icon: React.ReactNode
  points: number
  teams: Team[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}) {
  const [search, setSearch] = useState("")
  const selected = teams.find((t) => t.id === selectedId)
  const filtered = teams.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="surface-card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-bold text-[var(--foreground)]">{label}</span>
        </div>
        <span className="text-xs font-semibold text-[var(--accent)] bg-[var(--accent-dim)] px-2 py-0.5 rounded-full">
          +{points} pts
        </span>
      </div>

      {selected && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--accent-dim)] border border-[var(--accent)]/30">
          <span className="text-xl">{selected.flagEmoji}</span>
          <span className="text-sm font-bold text-[var(--accent)]">{selected.name}</span>
          <button
            onClick={() => onSelect(null)}
            className="ml-auto text-[10px] text-[var(--foreground-muted)] hover:text-[var(--error)] transition-colors"
          >
            ✕ Effacer
          </button>
        </div>
      )}

      <div className="relative">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--foreground-subtle)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une équipe…"
          className="w-full pl-7 pr-7 py-1.5 rounded-lg text-xs bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] outline-none focus:border-[var(--accent)]/50"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--foreground-subtle)] hover:text-[var(--foreground)]">
            <X size={12} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto">
        {filtered.map((team) => (
          <button
            key={team.id}
            onClick={() => onSelect(selectedId === team.id ? null : team.id)}
            className={cn(
              "flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold border transition-all text-left",
              selectedId === team.id
                ? "bg-[var(--accent-dim)] border-[var(--accent)]/50 text-[var(--accent)]"
                : "bg-[var(--surface-elevated)] border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--accent)]/30 hover:text-[var(--foreground)]"
            )}
          >
            <span className="text-base shrink-0">{team.flagEmoji}</span>
            <span className="truncate">{team.name}</span>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-2 text-xs text-[var(--foreground-subtle)] text-center py-3">Aucun résultat</p>
        )}
      </div>
    </div>
  )
}

// Multi-select with search — for attack, defense, and scorer
function MultiTeamSelector({
  label,
  icon,
  points,
  accent,
  teams,
  selectedIds,
  onToggle,
}: {
  label: string
  icon: React.ReactNode
  points: number
  accent: "error" | "success" | "warning"
  teams: Team[]
  selectedIds: string[]
  onToggle: (id: string) => void
}) {
  const [search, setSearch] = useState("")
  const filtered = teams.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  )

  const colorClass = {
    error: { tag: "bg-[var(--error-dim)] border-[var(--error)]/30 text-[var(--error)]", btn: "bg-[var(--error-dim)] border-[var(--error)]/50 text-[var(--error)]", hover: "hover:border-[var(--error)]/30" },
    success: { tag: "bg-[var(--success-dim)] border-[var(--success)]/30 text-[var(--success)]", btn: "bg-[var(--success-dim)] border-[var(--success)]/50 text-[var(--success)]", hover: "hover:border-[var(--success)]/30" },
    warning: { tag: "bg-[var(--warning-dim)] border-[var(--warning)]/30 text-[var(--warning)]", btn: "bg-[var(--warning-dim)] border-[var(--warning)]/50 text-[var(--warning)]", hover: "hover:border-[var(--warning)]/30" },
  }[accent]

  return (
    <div className="surface-card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-bold text-[var(--foreground)]">{label}</span>
        </div>
        <span className="text-xs font-semibold text-[var(--accent)] bg-[var(--accent-dim)] px-2 py-0.5 rounded-full">
          +{points} pts
        </span>
      </div>
      <p className="text-[10px] text-[var(--foreground-muted)]">
        Sélection multiple possible en cas d&apos;ex aequo.
      </p>

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {teams
            .filter((t) => selectedIds.includes(t.id))
            .map((t) => (
              <div key={t.id} className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold", colorClass.tag)}>
                <span>{t.flagEmoji}</span>
                <span>{t.name}</span>
                <button onClick={() => onToggle(t.id)} className="ml-0.5 hover:opacity-60">
                  <X size={10} />
                </button>
              </div>
            ))}
        </div>
      )}

      <div className="relative">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--foreground-subtle)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une équipe…"
          className="w-full pl-7 pr-7 py-1.5 rounded-lg text-xs bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] outline-none focus:border-[var(--accent)]/50"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--foreground-subtle)] hover:text-[var(--foreground)]">
            <X size={12} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto">
        {filtered.map((team) => {
          const isSelected = selectedIds.includes(team.id)
          return (
            <button
              key={team.id}
              onClick={() => onToggle(team.id)}
              className={cn(
                "flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold border transition-all text-left",
                isSelected
                  ? colorClass.btn
                  : cn("bg-[var(--surface-elevated)] border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]", colorClass.hover)
              )}
            >
              <span className="text-base shrink-0">{team.flagEmoji}</span>
              <span className="truncate flex-1">{team.name}</span>
              {isSelected && <CheckCircle size={11} />}
            </button>
          )
        })}
        {filtered.length === 0 && (
          <p className="col-span-2 text-xs text-[var(--foreground-subtle)] text-center py-3">Aucun résultat</p>
        )}
      </div>
    </div>
  )
}

function ScorerSelector({
  scorerCandidates,
  selectedIds,
  onToggle,
  points,
}: {
  scorerCandidates: ScorerCandidate[]
  selectedIds: string[]
  onToggle: (id: string) => void
  points: number
}) {
  const [search, setSearch] = useState("")
  const filtered = scorerCandidates.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.teamCode.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="surface-card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crosshair size={16} className="text-[var(--warning)]" />
          <span className="text-sm font-bold text-[var(--foreground)]">Meilleur buteur</span>
        </div>
        <span className="text-xs font-semibold text-[var(--accent)] bg-[var(--accent-dim)] px-2 py-0.5 rounded-full">
          +{points} pts
        </span>
      </div>
      <p className="text-[10px] text-[var(--foreground-muted)]">
        Sélection multiple possible en cas d&apos;ex aequo.
      </p>

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {scorerCandidates
            .filter((s) => selectedIds.includes(s.id))
            .map((s) => (
              <div key={s.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--warning-dim)] border border-[var(--warning)]/30 text-xs font-semibold text-[var(--warning)]">
                ⚽ {s.name}
                <button onClick={() => onToggle(s.id)} className="ml-0.5 hover:opacity-60">
                  <X size={10} />
                </button>
              </div>
            ))}
        </div>
      )}

      <div className="relative">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--foreground-subtle)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un joueur ou une sélection…"
          className="w-full pl-7 pr-7 py-1.5 rounded-lg text-xs bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] outline-none focus:border-[var(--accent)]/50"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--foreground-subtle)] hover:text-[var(--foreground)]">
            <X size={12} />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-1 max-h-52 overflow-y-auto">
        {filtered.map((scorer) => {
          const isSelected = selectedIds.includes(scorer.id)
          return (
            <button
              key={scorer.id}
              onClick={() => onToggle(scorer.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-left",
                isSelected
                  ? "bg-[var(--warning-dim)] border-[var(--warning)]/50 text-[var(--warning)]"
                  : "bg-[var(--surface-elevated)] border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--warning)]/30 hover:text-[var(--foreground)]"
              )}
            >
              <span className="text-sm">⚽</span>
              <span className="flex-1">{scorer.name}</span>
              <span className="text-[10px] opacity-60">{scorer.teamCode}</span>
              {isSelected && <CheckCircle size={12} />}
            </button>
          )
        })}
        {filtered.length === 0 && (
          <p className="text-xs text-[var(--foreground-subtle)] text-center py-3">Aucun résultat</p>
        )}
      </div>
    </div>
  )
}

export function BonusManager({
  contestId,
  teams,
  scorerCandidates,
  settings,
  initialWinnerId,
  initialTopScorerIds,
  initialBestAttackIds,
  initialBestDefenseIds,
  allMatchesFinished,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [applied, setApplied] = useState(false)

  const [winnerId, setWinnerId] = useState<string | null>(initialWinnerId)
  const [topScorerIds, setTopScorerIds] = useState<string[]>(initialTopScorerIds)
  const [bestAttackIds, setBestAttackIds] = useState<string[]>(initialBestAttackIds)
  const [bestDefenseIds, setBestDefenseIds] = useState<string[]>(initialBestDefenseIds)

  const toggleScorer = (id: string) => {
    setTopScorerIds((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id])
    setApplied(false)
  }

  const toggleAttack = (id: string) => {
    setBestAttackIds((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id])
    setApplied(false)
  }

  const toggleDefense = (id: string) => {
    setBestDefenseIds((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id])
    setApplied(false)
  }

  const handleApply = () => {
    startTransition(async () => {
      const result = await applyBonusResults({
        contestId,
        winnerId,
        topScorerIds,
        bestAttackIds,
        bestDefenseIds,
      })
      if ("error" in result) {
        toast.error(String(result.error))
      } else {
        toast.success("Points bonus appliqués et classement recalculé !")
        setApplied(true)
      }
    })
  }

  const hasAnySelection = winnerId || topScorerIds.length > 0 || bestAttackIds.length > 0 || bestDefenseIds.length > 0

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2 p-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-xs text-[var(--foreground-muted)]">
        <span className="shrink-0">ℹ️</span>
        <span>
          Sélectionne les lauréats ci-dessous puis clique sur <strong>&quot;Appliquer&quot;</strong>.
          Les points sont recalculés pour tous les participants et le classement est mis à jour instantanément.
          Tu peux appliquer plusieurs fois si tu corriges un choix.
        </span>
      </div>

      {/* Vainqueur du tournoi — single select */}
      <TeamSelector
        label="Vainqueur du tournoi"
        icon={<Trophy size={16} className="text-[var(--gold)]" />}
        points={settings.pointsWinner}
        teams={teams}
        selectedId={winnerId}
        onSelect={(id) => { setWinnerId(id); setApplied(false) }}
      />

      {/* Meilleur buteur — multi select */}
      <ScorerSelector
        scorerCandidates={scorerCandidates}
        selectedIds={topScorerIds}
        onToggle={toggleScorer}
        points={settings.pointsTopScorer}
      />

      {/* Disclaimer si tous les matchs ne sont pas terminés */}
      {!allMatchesFinished && (initialBestAttackIds.length > 0 || initialBestDefenseIds.length > 0) && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-[var(--warning-dim)] border border-[var(--warning)]/30 text-xs text-[var(--warning)]">
          <span className="shrink-0">⚠️</span>
          <span>
            Tous les matchs ne sont pas encore terminés. La meilleure attaque et la meilleure défense sont calculées sur les matchs joués jusqu&apos;ici — la sélection peut encore évoluer.
          </span>
        </div>
      )}

      {/* Meilleure attaque — multi select */}
      <MultiTeamSelector
        label="Meilleure attaque"
        icon={<Swords size={16} className="text-[var(--error)]" />}
        points={settings.pointsBestAttack}
        accent="error"
        teams={teams}
        selectedIds={bestAttackIds}
        onToggle={toggleAttack}
      />

      {/* Meilleure défense — multi select */}
      <MultiTeamSelector
        label="Meilleure défense"
        icon={<Shield size={16} className="text-[var(--success)]" />}
        points={settings.pointsBestDefense}
        accent="success"
        teams={teams}
        selectedIds={bestDefenseIds}
        onToggle={toggleDefense}
      />

      <button
        onClick={handleApply}
        disabled={isPending || !hasAnySelection}
        className={cn(
          "py-3.5 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50",
          applied
            ? "bg-[var(--success-dim)] text-[var(--success)] border border-[var(--success)]/30"
            : "gradient-accent text-white hover:opacity-90"
        )}
      >
        {isPending ? (
          <span className="animate-pulse">Application en cours...</span>
        ) : applied ? (
          <span className="flex items-center justify-center gap-2"><CheckCircle size={16} /> Points appliqués — Classement mis à jour</span>
        ) : (
          "Appliquer les points bonus"
        )}
      </button>
    </div>
  )
}
