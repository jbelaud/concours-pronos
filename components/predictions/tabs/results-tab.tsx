"use client"

import { useMemo, useState } from "react"
import { cn, PHASE_ORDER } from "@/lib/utils"
import { ChevronDown, ChevronUp } from "lucide-react"
import type { MatchWithPrediction, ScorerCandidate, Team } from "@/types"

const PHASE_LABELS: Record<string, string> = {
  GROUP: "Phase de groupes",
  ROUND_OF_32: "1/16 de finale",
  ROUND_OF_16: "1/8 de finale",
  QUARTER_FINAL: "Quart de finale",
  SEMI_FINAL: "Demi-finale",
  THIRD_PLACE: "3e place",
  FINAL: "Finale",
}

interface BonusPred {
  winnerId: string | null
  topScorerId: string | null
  topScorerFreeText: string | null
  bestAttackId: string | null
  bestDefenseId: string | null
  points: number
  groupPoints: number
  winner: Team | null
  bestAttack: Team | null
  bestDefense: Team | null
  groupPredictions: Array<{ groupLetter: string; firstTeamCode: string; secondTeamCode: string }>
}

interface Props {
  matches: MatchWithPrediction[]
  settings: {
    pointsCorrectResult: number
    pointsExactScore: number
    pointsWrongResult: number
    pointsWinner: number
    pointsTopScorer: number
    pointsBestAttack: number
    pointsBestDefense: number
    pointsGroupFirst: number
    pointsGroupSecond: number
  }
  myBonusPred: BonusPred | null
  scorerCandidates: ScorerCandidate[]
  validatedGroupBonus: Record<string, { firstTeamCode: string; secondTeamCode: string }>
}

// Accordion générique — fermé par défaut
function Accordion({
  title,
  badge,
  badgeColor = "muted",
  children,
}: {
  title: string
  badge?: string
  badgeColor?: "accent" | "success" | "warning" | "muted"
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  const badgeClass = {
    accent: "text-[var(--accent)] bg-[var(--accent-dim)]",
    success: "text-[var(--success)] bg-[var(--success-dim)]",
    warning: "text-[var(--warning)] bg-[var(--warning-dim)]",
    muted: "text-[var(--foreground-muted)] bg-[var(--surface-elevated)]",
  }[badgeColor]

  return (
    <div className="surface-card overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[var(--foreground)]">{title}</span>
          {badge && (
            <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", badgeClass)}>
              {badge}
            </span>
          )}
        </div>
        {open
          ? <ChevronUp size={14} className="text-[var(--foreground-subtle)] shrink-0" />
          : <ChevronDown size={14} className="text-[var(--foreground-subtle)] shrink-0" />
        }
      </button>
      {open && (
        <div className="border-t border-[var(--border)] px-3 pb-3 pt-2 flex flex-col gap-2">
          {children}
        </div>
      )}
    </div>
  )
}

export function ResultsTab({ matches, settings, myBonusPred, scorerCandidates, validatedGroupBonus }: Props) {
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

  const matchPoints = withPred.reduce((sum, m) => sum + (m.prediction?.points ?? 0), 0)
  const bonusPoints = (myBonusPred?.points ?? 0) + (myBonusPred?.groupPoints ?? 0)
  const totalPoints = matchPoints + bonusPoints
  const exactCount = withPred.filter((m) => m.prediction?.status === "EXACT_SCORE").length
  const correctCount = withPred.filter((m) => m.prediction?.status === "CORRECT_RESULT").length
  const wrongCount = withPred.filter((m) => m.prediction?.status === "WRONG").length
  const pendingCount = withPred.filter((m) => m.prediction?.status === "PENDING").length

  const scorerById = Object.fromEntries(scorerCandidates.map((s) => [s.id, s.name]))
  const scorerName = myBonusPred?.topScorerFreeText
    ?? (myBonusPred?.topScorerId ? scorerById[myBonusPred.topScorerId] : null)
    ?? null

  const validatedGroupLetters = Object.keys(validatedGroupBonus)
  const groupBonusLines = validatedGroupLetters.sort().map((letter) => {
    const actual = validatedGroupBonus[letter]
    const userPred = myBonusPred?.groupPredictions.find((gp) => gp.groupLetter === letter)
    let pts = 0
    let firstOk = false
    let secondOk = false
    if (userPred) {
      if (userPred.firstTeamCode === actual.firstTeamCode) { pts += settings.pointsGroupFirst; firstOk = true }
      if (userPred.secondTeamCode === actual.secondTeamCode) { pts += settings.pointsGroupSecond; secondOk = true }
    }
    return { letter, actual, userPred: userPred ?? null, pts, firstOk, secondOk }
  })

  const hasBonus = bonusPoints > 0 || groupBonusLines.length > 0

  const byPhase = finishedWithPred.reduce<Record<string, MatchWithPrediction[]>>((acc, m) => {
    if (!acc[m.phase]) acc[m.phase] = []
    acc[m.phase].push(m)
    return acc
  }, {})
  const phases = Object.keys(byPhase).sort((a, b) => (PHASE_ORDER[a] ?? 99) - (PHASE_ORDER[b] ?? 99))

  if (finishedWithPred.length === 0 && !hasBonus) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <span className="text-4xl">⏳</span>
        <p className="text-sm text-[var(--foreground-muted)] text-center">
          Aucun match terminé pour le moment.<br />Tes résultats apparaîtront ici.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 pb-6">
      {/* Récap global — toujours visible */}
      <div className="surface-card p-3">
        <div className="text-[11px] font-bold text-[var(--foreground-subtle)] uppercase tracking-wide mb-3">
          Récapitulatif
        </div>
        <div className="grid grid-cols-4 gap-2 mb-3">
          <StatChip label="Total pts" value={`+${totalPoints}`} color="accent" />
          <StatChip label="Score exact" value={String(exactCount)} color="success" />
          <StatChip label="Bon résultat" value={String(correctCount)} color="warning" />
          <StatChip label="Raté" value={String(wrongCount)} color="muted" />
        </div>
        {bonusPoints > 0 && (
          <>
            <div className="flex items-center justify-between text-[10px] mb-1.5 px-1">
              <span className="text-[var(--foreground-subtle)]">Matchs</span>
              <span className="font-bold text-[var(--foreground-muted)]">+{matchPoints} pts</span>
            </div>
            <div className="flex items-center justify-between text-[10px] mb-2 px-1">
              <span className="text-[var(--foreground-subtle)]">Bonus tournoi</span>
              <span className="font-bold text-[var(--accent)]">+{bonusPoints} pts</span>
            </div>
          </>
        )}
        {pendingCount > 0 && (
          <p className="text-[10px] text-[var(--foreground-subtle)] text-center -mt-1 mb-2">
            {pendingCount} match{pendingCount > 1 ? "s" : ""} en attente de résultat officiel
          </p>
        )}
        <ScoreLegend settings={settings} />
      </div>

      {/* Un bloc accordion par phase */}
      {phases.map((phase) => {
        const phaseMatches = byPhase[phase]
        const phasePoints = phaseMatches.reduce((s, m) => s + (m.prediction?.points ?? 0), 0)
        const phaseExact = phaseMatches.filter((m) => m.prediction?.status === "EXACT_SCORE").length
        const phaseCorrect = phaseMatches.filter((m) => m.prediction?.status === "CORRECT_RESULT").length
        return (
          <Accordion
            key={phase}
            title={PHASE_LABELS[phase] ?? phase}
            badge={`+${phasePoints} pts · ${phaseMatches.length} matchs`}
            badgeColor={phasePoints > 0 ? "accent" : "muted"}
          >
            {/* Mini-stats de la phase */}
            <div className="flex gap-2 mb-1">
              <span className="text-[10px] text-[var(--success)]">✓ Exact : {phaseExact}</span>
              <span className="text-[10px] text-[var(--foreground-subtle)]">·</span>
              <span className="text-[10px] text-[var(--warning)]">Bon résultat : {phaseCorrect}</span>
              <span className="text-[10px] text-[var(--foreground-subtle)]">·</span>
              <span className="text-[10px] text-[var(--foreground-subtle)]">Raté : {phaseMatches.length - phaseExact - phaseCorrect}</span>
            </div>
            {phaseMatches.map((match) => (
              <ResultMatchCard key={match.id} match={match} />
            ))}
          </Accordion>
        )
      })}

      {/* Matchs sans prono — dans leur propre bloc */}
      {withoutPred.length > 0 && (
        <Accordion
          title="Sans pronostic"
          badge={`${withoutPred.length} match${withoutPred.length > 1 ? "s" : ""}`}
          badgeColor="muted"
        >
          {withoutPred.map((match) => (
            <ResultMatchCard key={match.id} match={match} />
          ))}
        </Accordion>
      )}

      {/* Bonus groupes — accordion */}
      {groupBonusLines.length > 0 && (
        <Accordion
          title="Bonus groupes"
          badge={`+${myBonusPred?.groupPoints ?? 0} pts · ${groupBonusLines.length} groupe${groupBonusLines.length > 1 ? "s" : ""}`}
          badgeColor={(myBonusPred?.groupPoints ?? 0) > 0 ? "success" : "muted"}
        >
          {groupBonusLines.map(({ letter, actual, userPred, pts, firstOk, secondOk }) => (
            <div key={letter} className="flex items-start gap-2 py-1.5 border-b border-[var(--border)] last:border-0">
              <span className="text-[10px] font-black text-[var(--foreground-subtle)] w-5 shrink-0 pt-0.5">G{letter}</span>
              <div className="flex-1 flex flex-col gap-0.5">
                <div className="flex items-center gap-1">
                  <span className={cn("text-[10px] font-semibold", firstOk ? "text-[var(--success)]" : "text-[var(--foreground-muted)]")}>
                    1. {actual.firstTeamCode}
                  </span>
                  {firstOk && <span className="text-[9px] text-[var(--success)]">✓</span>}
                </div>
                <div className="flex items-center gap-1">
                  <span className={cn("text-[10px] font-semibold", secondOk ? "text-[var(--success)]" : "text-[var(--foreground-muted)]")}>
                    2. {actual.secondTeamCode}
                  </span>
                  {secondOk && <span className="text-[9px] text-[var(--success)]">✓</span>}
                </div>
                {userPred ? (
                  <div className="text-[9px] text-[var(--foreground-subtle)] mt-0.5">
                    Mon prono : {userPred.firstTeamCode} / {userPred.secondTeamCode}
                  </div>
                ) : (
                  <div className="text-[9px] text-[var(--foreground-subtle)] italic mt-0.5">Pas de pronostic</div>
                )}
              </div>
              <span className={cn("text-xs font-black shrink-0", pts > 0 ? "text-[var(--success)]" : "text-[var(--foreground-muted)]")}>
                {pts > 0 ? `+${pts}` : "0"} pt{pts !== 1 ? "s" : ""}
              </span>
            </div>
          ))}
        </Accordion>
      )}

      {/* Bonus compétition (finaux) — accordion */}
      {myBonusPred && (myBonusPred.winnerId || scorerName || myBonusPred.bestAttackId || myBonusPred.bestDefenseId) && (
        <Accordion
          title="Bonus compétition"
          badge={`+${myBonusPred.points} pts`}
          badgeColor={myBonusPred.points > 0 ? "success" : "muted"}
        >
          <BonusLine label="Vainqueur du tournoi" emoji="🏆" prediction={myBonusPred.winner?.name ?? null} pointsMax={settings.pointsWinner} />
          <BonusLine label="Meilleur buteur" emoji="⚽" prediction={scorerName} pointsMax={settings.pointsTopScorer} />
          <BonusLine label="Meilleure attaque" emoji="⚔️" prediction={myBonusPred.bestAttack?.name ?? null} pointsMax={settings.pointsBestAttack} />
          <BonusLine label="Meilleure défense" emoji="🛡️" prediction={myBonusPred.bestDefense?.name ?? null} pointsMax={settings.pointsBestDefense} />
        </Accordion>
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

function BonusLine({ label, emoji, prediction, pointsMax }: {
  label: string
  emoji: string
  prediction: string | null
  pointsMax: number
}) {
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-[var(--border)] last:border-0">
      <span className="text-sm shrink-0">{emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-[var(--foreground-subtle)]">{label}</div>
        {prediction ? (
          <div className="text-xs font-semibold text-[var(--foreground)] truncate">{prediction}</div>
        ) : (
          <div className="text-xs text-[var(--foreground-subtle)] italic">Pas de pronostic</div>
        )}
      </div>
      <span className="text-[10px] text-[var(--foreground-subtle)] shrink-0">max +{pointsMax} pts</span>
    </div>
  )
}

function ScoreLegend({ settings }: { settings: Props["settings"] }) {
  return (
    <div className="flex gap-3 text-[10px] text-[var(--foreground-subtle)]">
      <span className="text-[var(--success)] font-semibold">Score exact</span>
      <span>= +{settings.pointsCorrectResult + settings.pointsExactScore} pts</span>
      <span className="mx-1">·</span>
      <span className="text-[var(--warning)] font-semibold">Bon résultat</span>
      <span>= +{settings.pointsCorrectResult} pts</span>
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

  const status = pred?.status ?? null
  const points = pred?.points ?? null

  const statusStyle: Record<string, { bg: string; border: string; badge: string; label: string }> = {
    EXACT_SCORE:    { bg: "bg-[var(--success-dim)]",   border: "border-[var(--success)]/20",  badge: "bg-[var(--success)] text-white",                              label: "Exact" },
    CORRECT_RESULT: { bg: "bg-[var(--warning-dim)]",   border: "border-[var(--warning)]/20",  badge: "bg-[var(--warning)] text-white",                              label: "Bon résultat" },
    WRONG:          { bg: "bg-[var(--surface-elevated)]", border: "border-[var(--border)]",   badge: "bg-[var(--foreground-subtle)]/30 text-[var(--foreground-muted)]", label: "Raté" },
    PENDING:        { bg: "bg-[var(--surface-elevated)]", border: "border-[var(--border)]",   badge: "bg-[var(--foreground-subtle)]/30 text-[var(--foreground-muted)]", label: "En attente" },
  }
  const style = status
    ? (statusStyle[status] ?? { bg: "bg-[var(--surface-elevated)]", border: "border-[var(--border)]", badge: "bg-[var(--foreground-subtle)]/20 text-[var(--foreground-subtle)]", label: "?" })
    : { bg: "bg-[var(--surface-elevated)]", border: "border-[var(--border)]", badge: "bg-[var(--foreground-subtle)]/20 text-[var(--foreground-subtle)]", label: "Pas de prono" }

  return (
    <div className={cn("rounded-2xl border p-3 flex flex-col gap-2", style.bg, style.border)}>
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
