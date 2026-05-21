"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ResultEntry } from "./result-entry"
import { KnockoutManager } from "./knockout-manager"
import { cn } from "@/lib/utils"
import { CalendarDays, ChevronDown } from "lucide-react"
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
  QUARTER_FINAL: "1/4",
  SEMI_FINAL: "1/2",
  THIRD_PLACE: "3e place",
  FINAL: "Finale",
}

function formatDayShort(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z")
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })
}

export function ResultsManager({ matches, allTeams, matchday, knockoutScoringRule }: Props) {
  const groupMatches = useMemo(() => matches.filter((m) => m.phase === "GROUP"), [matches])
  const knockoutMatches = useMemo(() => matches.filter((m) => m.phase !== "GROUP"), [matches])

  const hasGroups = groupMatches.length > 0
  const hasKnockout = knockoutMatches.length > 0

  type Tab = "groups" | "knockout"
  const [tab, setTab] = useState<Tab>(hasGroups ? "groups" : "knockout")

  // --- Onglet POULES ---
  const groupLetters = useMemo(() => {
    const letters = new Set(groupMatches.map((m) => m.groupLetter ?? ""))
    return Array.from(letters).filter(Boolean).sort()
  }, [groupMatches])

  const groupDays = useMemo(() => {
    const days = new Set(groupMatches.map((m) => m.kickoff.toISOString().split("T")[0]))
    return Array.from(days).sort()
  }, [groupMatches])

  // Filtre groupe : "day" ou lettre
  type GroupFilter = "day" | string
  const [groupFilter, setGroupFilter] = useState<GroupFilter>("day")
  const [showDayDropdown, setShowDayDropdown] = useState(false)
  const dayDropdownRef = useRef<HTMLDivElement>(null)

  // Jour actif : premier jour avec des matchs non terminés
  const defaultDay = useMemo(() => {
    const pending = groupMatches.find((m) => m.status !== "FINISHED")
    if (pending) return pending.kickoff.toISOString().split("T")[0]
    return groupDays[groupDays.length - 1] ?? groupDays[0] ?? ""
  }, [groupMatches, groupDays])

  const [activeDay, setActiveDay] = useState(defaultDay)

  // Fermer dropdown si clic extérieur
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dayDropdownRef.current && !dayDropdownRef.current.contains(e.target as Node)) {
        setShowDayDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const groupMatchesFiltered = useMemo(() => {
    if (groupFilter === "day") {
      return groupMatches.filter((m) => m.kickoff.toISOString().split("T")[0] === activeDay)
    }
    return groupMatches.filter((m) => m.groupLetter === groupFilter)
  }, [groupMatches, groupFilter, activeDay])

  // --- Onglet KNOCKOUT ---
  const knockoutPhases = useMemo(() => {
    const phases = new Set(knockoutMatches.map((m) => m.phase))
    return KNOCKOUT_PHASES.filter((p) => phases.has(p as MatchPhase))
  }, [knockoutMatches])

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
              tab === "groups" ? "gradient-accent text-white shadow-sm" : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            )}
          >
            Poules
          </button>
        )}
        <button
          onClick={() => setTab("knockout")}
          className={cn(
            "flex-1 py-2 rounded-lg text-xs font-semibold transition-all",
            tab === "knockout" ? "gradient-accent text-white shadow-sm" : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
          )}
        >
          Phases Finales
        </button>
      </div>

      {/* === FILTRE POULES === */}
      {tab === "groups" && (
        <>
          <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none items-center">
            {/* Bouton Jour avec dropdown */}
            <div className="relative shrink-0" ref={dayDropdownRef}>
              <button
                onClick={() => {
                  setGroupFilter("day")
                  setShowDayDropdown((v) => !v)
                }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border",
                  groupFilter === "day"
                    ? "bg-[var(--surface-elevated)] text-[var(--foreground)] border-[var(--border-strong)]"
                    : "bg-[var(--surface)] text-[var(--foreground-muted)] border-[var(--border)]"
                )}
              >
                <CalendarDays size={12} />
                {groupFilter === "day" ? formatDayShort(activeDay) : "Jour"}
                <ChevronDown size={10} className={cn("transition-transform", showDayDropdown && "rotate-180")} />
              </button>

              <AnimatePresence>
                {showDayDropdown && groupFilter === "day" && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.97 }}
                    transition={{ duration: 0.12 }}
                    className="absolute top-full left-0 mt-1 z-20 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden min-w-[90px]"
                  >
                    <div className="max-h-52 overflow-y-auto">
                      {groupDays.map((day) => {
                        const dayMatches = groupMatches.filter((m) => m.kickoff.toISOString().split("T")[0] === day)
                        const hasPending = dayMatches.some((m) => m.status !== "FINISHED")
                        return (
                          <button
                            key={day}
                            onClick={() => { setActiveDay(day); setShowDayDropdown(false) }}
                            className={cn(
                              "w-full flex items-center justify-between px-3 py-2 text-xs font-semibold transition-all hover:bg-[var(--surface)]",
                              activeDay === day ? "text-[var(--accent)]" : "text-[var(--foreground)]"
                            )}
                          >
                            {formatDayShort(day)}
                            {hasPending && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[var(--warning)] ml-2" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Lettres de groupe */}
            {groupLetters.map((letter) => {
              const lMatches = groupMatches.filter((m) => m.groupLetter === letter)
              const hasPending = lMatches.some((m) => m.status !== "FINISHED")
              return (
                <button
                  key={letter}
                  onClick={() => { setGroupFilter(letter); setShowDayDropdown(false) }}
                  className={cn(
                    "shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all relative border",
                    groupFilter === letter
                      ? "bg-[var(--surface-elevated)] text-[var(--foreground)] border-[var(--border-strong)]"
                      : "bg-[var(--surface)] text-[var(--foreground-muted)] border-[var(--border)]"
                  )}
                >
                  {letter}
                  {hasPending && groupFilter !== letter && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[var(--warning)]" />
                  )}
                </button>
              )
            })}
          </div>

          <div className="flex flex-col gap-2">
            {groupMatchesFiltered.length === 0 ? (
              <div className="text-center py-8 text-[var(--foreground-muted)] text-sm">Aucun match pour cette sélection.</div>
            ) : (
              groupMatchesFiltered.map((match) => (
                <ResultEntry key={match.id} match={match} matchday={matchday} knockoutScoringRule={knockoutScoringRule} />
              ))
            )}
          </div>
        </>
      )}

      {/* === KNOCKOUT === */}
      {tab === "knockout" && (
        <>
          {knockoutPhases.length === 0 ? (
            <div className="text-center py-12 text-[var(--foreground-muted)] text-sm">
              <div className="text-3xl mb-2">🏆</div>
              Aucun match de phase finale configuré.
            </div>
          ) : (
            <>
              <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
                {KNOCKOUT_PHASES.filter((p) => knockoutPhases.includes(p)).map((phase) => {
                  const phaseMatches = knockoutMatches.filter((m) => m.phase === phase)
                  const hasPending = phaseMatches.some((m) => !m.homeTeamId || m.status !== "FINISHED")
                  return (
                    <button
                      key={phase}
                      onClick={() => setActiveKnockoutPhase(phase)}
                      className={cn(
                        "shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all relative border",
                        activeKnockoutPhase === phase
                          ? "bg-[var(--surface-elevated)] text-[var(--foreground)] border-[var(--border-strong)]"
                          : "bg-[var(--surface)] text-[var(--foreground-muted)] border-[var(--border)]"
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
                  <div className="text-center py-8 text-[var(--foreground-muted)] text-sm">Aucun match pour cette phase.</div>
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
  match, allTeams, matchday, knockoutScoringRule,
}: {
  match: Match
  allTeams: Team[]
  matchday: number
  knockoutScoringRule: "REGULAR_TIME" | "FULL_TIME"
}) {
  const hasTeams = !!match.homeTeamId && !!match.awayTeamId

  return (
    <div className="flex flex-col gap-2">
      <KnockoutManager match={match} allTeams={allTeams} />
      {hasTeams && (
        <div className="pl-3 border-l-2 border-[var(--accent)]/20">
          <p className="text-[10px] text-[var(--foreground-subtle)] uppercase tracking-wide mb-1.5">Résultat</p>
          <ResultEntry match={match} matchday={matchday} knockoutScoringRule={knockoutScoringRule} />
        </div>
      )}
    </div>
  )
}
