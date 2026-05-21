"use client"

import { useMemo } from "react"
import { cn, PHASE_ORDER } from "@/lib/utils"
import type { MatchWithPrediction } from "@/types"

const PHASE_LABELS: Record<string, string> = {
  GROUP: "Phase de groupes",
  ROUND_OF_32: "1/16 de finale",
  ROUND_OF_16: "1/8 de finale",
  QUARTER_FINAL: "Quart de finale",
  SEMI_FINAL: "Demi-finale",
  THIRD_PLACE: "3e place",
  FINAL: "Finale",
}

interface Props {
  matches: MatchWithPrediction[]
  settings: {
    pointsCorrectResult: number
    pointsExactScore: number
    pointsWrongResult: number
  }
}

export function ResultsTab({ matches, settings }: Props) {
  const finishedWithPred = useMemo(() => {
    return matches
      .filter((m) => m.status === "FINISHED" && m.homeScore !== null && m.homeTeamId)
      .sort((a, b) => {
        const po = (PHASE_ORDER[a.phase] ?? 99) - (PHASE_ORDER[b.phase] ?? 99)
        if (po !== 0) return po
        return new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime()
      })
  }, [matches])

  const withPred = finishedWithPred.filter((m) => m.prediction)
  const withoutPred = finishedWithPred.filter((m) => !m.prediction)

  const totalPoints = withPred.reduce((sum, m) => sum + (m.prediction?.points ?? 0), 0)
  const exactCount = withPred.filter((m) => m.prediction?.status === "EXACT_SCORE").length
  const correctCount = withPred.filter((m) => m.prediction?.status === "CORRECT_RESULT").length
  const wrongCount = withPred.filter((m) => m.prediction?.status === "WRONG").length
  const pendingCount = withPred.filter((m) => m.prediction?.status === "PENDING").length

  if (finishedWithPred.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <span className="text-4xl">⏳</span>
        <p className="text-sm text-[var(--foreground-muted)] text-center">
          Aucun match terminé pour le moment.<br />Tes résultats apparaîtront ici.
        </p>
      </div>
    )
  }

  const byPhase = finishedWithPred.reduce<Record<string, MatchWithPrediction[]>>((acc, m) => {
    if (!acc[m.phase]) acc[m.phase] = []
    acc[m.phase].push(m)
    return acc
  }, {})
  const phases = Object.keys(byPhase).sort((a, b) => (PHASE_ORDER[a] ?? 99) - (PHASE_ORDER[b] ?? 99))

  return (
    <div className="flex flex-col gap-4 pb-6">
      {/* Récap global */}
      <div className="surface-card p-3">
        <div className="text-[11px] font-bold text-[var(--foreground-subtle)] uppercase tracking-wide mb-3">
          Récapitulatif
        </div>
        <div className="grid grid-cols-4 gap-2 mb-3">
          <StatChip label="Pts gagnés" value={`+${totalPoints}`} color="accent" />
          <StatChip label="Exact" value={String(exactCount)} color="success" />
          <StatChip label="Correct" value={String(correctCount)} color="warning" />
          <StatChip label="Raté" value={String(wrongCount)} color="muted" />
        </div>
        <ScoreLegend settings={settings} />
      </div>

      {/* Liste par phase */}
      {phases.map((phase) => (
        <div key={phase} className="flex flex-col gap-2">
          <div className="text-[11px] font-bold text-[var(--foreground-subtle)] uppercase tracking-wide px-1">
            {PHASE_LABELS[phase] ?? phase}
          </div>
          {byPhase[phase].map((match) => (
            <ResultMatchCard key={match.id} match={match} />
          ))}
        </div>
      ))}

      {/* Matchs sans prono */}
      {withoutPred.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="text-[11px] font-bold text-[var(--foreground-subtle)] uppercase tracking-wide px-1">
            Sans pronostic
          </div>
          {withoutPred.map((match) => (
            <ResultMatchCard key={match.id} match={match} />
          ))}
        </div>
      )}
    </div>
  )
}

function StatChip({ label, value, color }: { label: string; value: string; color: "accent" | "success" | "warning" | "muted" }) {
  const colorClass = {
    accent: "text-[var(--accent)]",
    success: "text-[var(--success)]",
    warning: "text-[var(--warning)]",
    muted: "text-[var(--foreground-muted)]",
  }[color]

  return (
    <div className="flex flex-col items-center gap-0.5 bg-[var(--surface-elevated)] rounded-xl py-2">
      <span className={cn("text-base font-black tabular-nums", colorClass)}>{value}</span>
      <span className="text-[9px] text-[var(--foreground-subtle)]">{label}</span>
    </div>
  )
}

function ScoreLegend({ settings }: { settings: Props["settings"] }) {
  return (
    <div className="flex gap-3 text-[10px] text-[var(--foreground-subtle)]">
      <span className="text-[var(--success)] font-semibold">Score exact</span>
      <span className="text-[var(--foreground-subtle)]">= +{settings.pointsCorrectResult + settings.pointsExactScore} pts</span>
      <span className="mx-1">·</span>
      <span className="text-[var(--warning)] font-semibold">Bonne issue</span>
      <span className="text-[var(--foreground-subtle)]">= +{settings.pointsCorrectResult} pts</span>
    </div>
  )
}

function ResultMatchCard({ match }: { match: MatchWithPrediction }) {
  const pred = match.prediction
  const hasResult = match.homeScore !== null && match.awayScore !== null

  const realResult = hasResult
    ? match.homeScore! > match.awayScore! ? "home"
    : match.homeScore! === match.awayScore! ? "draw"
    : "away"
    : null

  const predResult = pred
    ? pred.homeScore > pred.awayScore ? "home"
    : pred.homeScore === pred.awayScore ? "draw"
    : "away"
    : null

  const status = pred?.status ?? null
  const points = pred?.points ?? null

  const statusStyle: Record<string, { bg: string; border: string; badge: string; label: string }> = {
    EXACT_SCORE: { bg: "bg-[var(--success-dim)]", border: "border-[var(--success)]/20", badge: "bg-[var(--success)] text-white", label: "Exact" },
    CORRECT_RESULT: { bg: "bg-[var(--warning-dim)]", border: "border-[var(--warning)]/20", badge: "bg-[var(--warning)] text-white", label: "Correct" },
    WRONG: { bg: "bg-[var(--surface-elevated)]", border: "border-[var(--border)]", badge: "bg-[var(--foreground-subtle)]/30 text-[var(--foreground-muted)]", label: "Raté" },
    PENDING: { bg: "bg-[var(--surface-elevated)]", border: "border-[var(--border)]", badge: "bg-[var(--foreground-subtle)]/30 text-[var(--foreground-muted)]", label: "En attente" },
  }

  const style = status ? (statusStyle[status] ?? { bg: "bg-[var(--surface-elevated)]", border: "border-[var(--border)]", badge: "bg-[var(--foreground-subtle)]/20 text-[var(--foreground-subtle)]", label: "?" }) : { bg: "bg-[var(--surface-elevated)]", border: "border-[var(--border)]", badge: "bg-[var(--foreground-subtle)]/20 text-[var(--foreground-subtle)]", label: "Pas de prono" }

  return (
    <div className={cn("rounded-2xl border p-3 flex flex-col gap-2", style.bg, style.border)}>
      {/* Équipes + scores */}
      <div className="flex items-center gap-2">
        <span className="text-xl leading-none">{match.homeTeam?.flagEmoji ?? "🏳️"}</span>
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--foreground)] truncate">{match.homeTeam?.name}</span>
            {hasResult && (
              <span className={cn("text-sm font-black tabular-nums ml-2", realResult === "home" ? "text-[var(--success)]" : "text-[var(--foreground-muted)]")}>
                {match.homeScore}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--foreground)] truncate">{match.awayTeam?.name}</span>
            {hasResult && (
              <span className={cn("text-sm font-black tabular-nums ml-2", realResult === "away" ? "text-[var(--success)]" : "text-[var(--foreground-muted)]")}>
                {match.awayScore}
              </span>
            )}
          </div>
        </div>
        <span className="text-xl leading-none">{match.awayTeam?.flagEmoji ?? "🏳️"}</span>
      </div>

      {/* Mon prono + badge résultat */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {pred ? (
            <>
              <span className="text-[10px] text-[var(--foreground-subtle)]">Mon prono :</span>
              <span className={cn(
                "text-xs font-black tabular-nums",
                status === "EXACT_SCORE" ? "text-[var(--success)]"
                  : status === "CORRECT_RESULT" ? "text-[var(--warning)]"
                  : "text-[var(--foreground-muted)]"
              )}>
                {pred.homeScore} – {pred.awayScore}
              </span>
            </>
          ) : (
            <span className="text-[10px] text-[var(--foreground-subtle)] italic">Pas de pronostic</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {points !== null && status !== "PENDING" && (
            <span className={cn("text-xs font-black tabular-nums", points > 0 ? "text-[var(--success)]" : "text-[var(--foreground-muted)]")}>
              {points > 0 ? `+${points}` : "0"} pt{points > 1 ? "s" : ""}
            </span>
          )}
          <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full", style.badge)}>
            {style.label}
          </span>
        </div>
      </div>
    </div>
  )
}
