"use client"

import { useState, useMemo } from "react"
import { ResultEntry } from "./result-entry"
import { KnockoutManager } from "./knockout-manager"
import { cn } from "@/lib/utils"
import type { MatchWithTeams, Team, MatchPhase } from "@/types"

type Match = MatchWithTeams & { regularTimeHome: number | null; regularTimeAway: number | null }

interface Props {
  matches: Match[]
  allTeams: Team[]
  matchday: number
  knockoutScoringRule: "REGULAR_TIME" | "FULL_TIME"
}

const KNOCKOUT_PHASES = ["ROUND_OF_32", "ROUND_OF_16", "QUARTER_FINAL", "SEMI_FINAL", "THIRD_PLACE", "FINAL"]
const KNOCKOUT_LABELS: Record<string, string> = {
  ROUND_OF_32: "1/16",
  ROUND_OF_16: "1/8",
  QUARTER_FINAL: "Quarts",
  SEMI_FINAL: "Demies",
  THIRD_PLACE: "3e place",
  FINAL: "Finale",
}

function formatDay(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z")
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })
}

export function ResultsManager({ matches, allTeams, matchday, knockoutScoringRule }: Props) {
  const groupMatches = useMemo(() => matches.filter((m) => m.phase === "GROUP"), [matches])
  const knockoutMatches = useMemo(() => matches.filter((m) => m.phase !== "GROUP"), [matches])

  const hasGroups = groupMatches.length > 0
  const hasKnockout = knockoutMatches.length > 0

  type Tab = "groups" | "knockout"
  const [tab, setTab] = useState<Tab>(hasGroups ? "groups" : "knockout")

  // --- Onglet POULES ---
  // Jours disponibles (triés)
  const groupDays = useMemo(() => {
    const days = new Set(groupMatches.map((m) => m.kickoff.toISOString().split("T")[0]))
    return Array.from(days).sort()
  }, [groupMatches])

  // Jour actif : le premier jour avec des matchs non terminés, sinon le dernier jour
  const defaultGroupDay = useMemo(() => {
    const pending = groupMatches.find((m) => m.status !== "FINISHED")
    if (pending) return pending.kickoff.toISOString().split("T")[0]
    return groupDays[groupDays.length - 1] ?? groupDays[0] ?? ""
  }, [groupMatches, groupDays])

  const [activeGroupDay, setActiveGroupDay] = useState(defaultGroupDay)

  const groupMatchesForDay = useMemo(
    () => groupMatches.filter((m) => m.kickoff.toISOString().split("T")[0] === activeGroupDay),
    [groupMatches, activeGroupDay]
  )

  // --- Onglet KNOCKOUT ---
  const knockoutPhases = useMemo(() => {
    const phases = new Set(knockoutMatches.map((m) => m.phase))
    return KNOCKOUT_PHASES.filter((p) => phases.has(p as MatchPhase))
  }, [knockoutMatches])

  // Phase active par défaut : première phase avec des matchs sans équipes ou non terminés
  const defaultKnockoutPhase = useMemo(() => {
    for (const phase of KNOCKOUT_PHASES) {
      const phaseMatches = knockoutMatches.filter((m) => m.phase === phase)
      if (phaseMatches.length > 0 && phaseMatches.some((m) => !m.homeTeamId || m.status !== "FINISHED")) {
        return phase
      }
    }
    return knockoutPhases[knockoutPhases.length - 1] ?? KNOCKOUT_PHASES[0]
  }, [knockoutMatches, knockoutPhases])

  const [activeKnockoutPhase, setActiveKnockoutPhase] = useState(defaultKnockoutPhase)

  const knockoutMatchesForPhase = useMemo(
    () => knockoutMatches.filter((m) => m.phase === activeKnockoutPhase),
    [knockoutMatches, activeKnockoutPhase]
  )

  return (
    <div className="flex flex-col gap-3">
      {/* Navigation principale */}
      <div className="flex gap-1 bg-[var(--surface-elevated)] rounded-xl p-1">
        {hasGroups && (
          <button
            onClick={() => setTab("groups")}
            className={cn(
              "flex-1 py-2 rounded-lg text-xs font-semibold transition-all",
              tab === "groups"
                ? "gradient-accent text-white shadow-sm"
                : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            )}
          >
            Poules
          </button>
        )}
        <button
          onClick={() => setTab("knockout")}
          className={cn(
            "flex-1 py-2 rounded-lg text-xs font-semibold transition-all",
            tab === "knockout"
              ? "gradient-accent text-white shadow-sm"
              : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
          )}
        >
          Phases Finales
        </button>
      </div>

      {/* POULES : filtre par jour */}
      {tab === "groups" && (
        <>
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
            {groupDays.map((day) => {
              const dayMatches = groupMatches.filter((m) => m.kickoff.toISOString().split("T")[0] === day)
              const hasPending = dayMatches.some((m) => m.status !== "FINISHED")
              return (
                <button
                  key={day}
                  onClick={() => setActiveGroupDay(day)}
                  className={cn(
                    "shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all relative whitespace-nowrap",
                    activeGroupDay === day
                      ? "bg-[var(--surface-elevated)] text-[var(--foreground)] border border-[var(--border-strong)]"
                      : "bg-[var(--surface)] text-[var(--foreground-muted)] border border-[var(--border)]"
                  )}
                >
                  {formatDay(day)}
                  {hasPending && activeGroupDay !== day && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[var(--warning)]" />
                  )}
                </button>
              )
            })}
          </div>

          <div className="flex flex-col gap-2">
            {groupMatchesForDay.length === 0 ? (
              <div className="text-center py-8 text-[var(--foreground-muted)] text-sm">
                Aucun match ce jour.
              </div>
            ) : (
              groupMatchesForDay.map((match) => (
                <ResultEntry
                  key={match.id}
                  match={match}
                  matchday={matchday}
                  knockoutScoringRule={knockoutScoringRule}
                />
              ))
            )}
          </div>
        </>
      )}

      {/* KNOCKOUT : filtre par phase + gestion équipes + résultats */}
      {tab === "knockout" && (
        <>
          {knockoutPhases.length === 0 ? (
            <div className="text-center py-12 text-[var(--foreground-muted)] text-sm">
              <div className="text-3xl mb-2">🏆</div>
              Aucun match de phase finale configuré.
            </div>
          ) : (
            <>
              <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
                {KNOCKOUT_PHASES.filter((p) => knockoutPhases.includes(p)).map((phase) => {
                  const phaseMatches = knockoutMatches.filter((m) => m.phase === phase)
                  const hasPending = phaseMatches.some((m) => !m.homeTeamId || m.status !== "FINISHED")
                  return (
                    <button
                      key={phase}
                      onClick={() => setActiveKnockoutPhase(phase)}
                      className={cn(
                        "shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all relative",
                        activeKnockoutPhase === phase
                          ? "bg-[var(--surface-elevated)] text-[var(--foreground)] border border-[var(--border-strong)]"
                          : "bg-[var(--surface)] text-[var(--foreground-muted)] border border-[var(--border)]"
                      )}
                    >
                      {KNOCKOUT_LABELS[phase] ?? phase}
                      {hasPending && activeKnockoutPhase !== phase && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[var(--warning)]" />
                      )}
                    </button>
                  )
                })}
              </div>

              <div className="flex flex-col gap-3">
                {knockoutMatchesForPhase.map((match) => (
                  <KnockoutMatchCard
                    key={match.id}
                    match={match}
                    allTeams={allTeams}
                    matchday={matchday}
                    knockoutScoringRule={knockoutScoringRule}
                  />
                ))}
                {knockoutMatchesForPhase.length === 0 && (
                  <div className="text-center py-8 text-[var(--foreground-muted)] text-sm">
                    Aucun match pour cette phase.
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

function KnockoutMatchCard({
  match,
  allTeams,
  matchday,
  knockoutScoringRule,
}: {
  match: Match
  allTeams: Team[]
  matchday: number
  knockoutScoringRule: "REGULAR_TIME" | "FULL_TIME"
}) {
  const hasTeams = !!match.homeTeamId && !!match.awayTeamId

  return (
    <div className="flex flex-col gap-2">
      {/* Assignation des équipes (toujours visible en knockout) */}
      <KnockoutManager match={match} allTeams={allTeams} />

      {/* Saisie du résultat (uniquement si équipes assignées) */}
      {hasTeams && (
        <div className="pl-3 border-l-2 border-[var(--accent)]/20">
          <p className="text-[10px] text-[var(--foreground-subtle)] uppercase tracking-wide mb-1.5">
            Résultat
          </p>
          <ResultEntry
            match={match}
            matchday={matchday}
            knockoutScoringRule={knockoutScoringRule}
          />
        </div>
      )}
    </div>
  )
}
