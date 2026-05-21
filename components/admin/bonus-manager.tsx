"use client"

import { useState, useTransition } from "react"
import { applyBonusResults } from "@/actions/admin.actions"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { CheckCircle, Trophy, Crosshair, Swords, Shield } from "lucide-react"

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
}

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
  const selected = teams.find((t) => t.id === selectedId)

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

      <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto">
        {teams.map((team) => (
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
        Sélectionne un ou plusieurs buteurs ex aequo.
      </p>

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {scorerCandidates
            .filter((s) => selectedIds.includes(s.id))
            .map((s) => (
              <div key={s.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--warning-dim)] border border-[var(--warning)]/30 text-xs font-semibold text-[var(--warning)]">
                ⚽ {s.name}
                <button onClick={() => onToggle(s.id)} className="text-[var(--warning)] hover:text-[var(--error)] ml-0.5">✕</button>
              </div>
            ))}
        </div>
      )}

      <div className="flex flex-col gap-1 max-h-52 overflow-y-auto">
        {scorerCandidates.map((scorer) => {
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
        {scorerCandidates.length === 0 && (
          <p className="text-xs text-[var(--foreground-subtle)] text-center py-3">
            Aucun candidat buteur configuré pour ce concours.
          </p>
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
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [applied, setApplied] = useState(false)

  const [winnerId, setWinnerId] = useState<string | null>(initialWinnerId)
  const [topScorerIds, setTopScorerIds] = useState<string[]>(initialTopScorerIds)
  const [bestAttackId, setBestAttackId] = useState<string | null>(null)
  const [bestDefenseId, setBestDefenseId] = useState<string | null>(null)

  const toggleScorer = (id: string) => {
    setTopScorerIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
    setApplied(false)
  }

  const handleApply = () => {
    startTransition(async () => {
      const result = await applyBonusResults({
        contestId,
        winnerId,
        topScorerIds,
        bestAttackId,
        bestDefenseId,
      })
      if ("error" in result) {
        toast.error(String(result.error))
      } else {
        toast.success("Points bonus appliqués et classement recalculé !")
        setApplied(true)
      }
    })
  }

  const hasAnySelection = winnerId || topScorerIds.length > 0 || bestAttackId || bestDefenseId

  return (
    <div className="flex flex-col gap-3">
      {/* Info */}
      <div className="flex items-start gap-2 p-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-xs text-[var(--foreground-muted)]">
        <span className="shrink-0">ℹ️</span>
        <span>
          Sélectionne les lauréats ci-dessous puis clique sur <strong>"Appliquer"</strong>.
          Les points sont recalculés pour tous les participants et le classement est mis à jour instantanément.
          Tu peux appliquer plusieurs fois si tu corriges un choix.
        </span>
      </div>

      {/* Vainqueur du tournoi */}
      <TeamSelector
        label="Vainqueur du tournoi"
        icon={<Trophy size={16} className="text-[var(--gold)]" />}
        points={settings.pointsWinner}
        teams={teams}
        selectedId={winnerId}
        onSelect={(id) => { setWinnerId(id); setApplied(false) }}
      />

      {/* Meilleur buteur */}
      <ScorerSelector
        scorerCandidates={scorerCandidates}
        selectedIds={topScorerIds}
        onToggle={toggleScorer}
        points={settings.pointsTopScorer}
      />

      {/* Meilleure attaque */}
      <TeamSelector
        label="Meilleure attaque"
        icon={<Swords size={16} className="text-[var(--error)]" />}
        points={settings.pointsBestAttack}
        teams={teams}
        selectedId={bestAttackId}
        onSelect={(id) => { setBestAttackId(id); setApplied(false) }}
      />

      {/* Meilleure défense */}
      <TeamSelector
        label="Meilleure défense"
        icon={<Shield size={16} className="text-[var(--success)]" />}
        points={settings.pointsBestDefense}
        teams={teams}
        selectedId={bestDefenseId}
        onSelect={(id) => { setBestDefenseId(id); setApplied(false) }}
      />

      {/* Bouton appliquer */}
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
