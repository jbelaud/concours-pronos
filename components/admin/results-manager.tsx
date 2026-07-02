"use client"

import { useState, useMemo, useRef, useEffect, useLayoutEffect, useCallback } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { createPortal } from "react-dom"
import { ResultEntry } from "./result-entry"
import { KnockoutManager } from "./knockout-manager"
import { cn } from "@/lib/utils"
import { CalendarDays, ChevronDown } from "lucide-react"
import type { MatchWithTeams, Team, MatchPhase } from "@/types"

type Match = MatchWithTeams & { regularTimeHome: number | null; regularTimeAway: number | null; extraTimeHome: number | null; extraTimeAway: number | null }

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

// Dropdown positionné en fixed pour échapper aux overflow parents
function DayDropdown({
  days,
  activeDay,
  matchesByDay,
  onSelect,
  onClose,
  anchorRef,
}: {
  days: string[]
  activeDay: string
  matchesByDay: (day: string) => boolean
  onSelect: (day: string) => void
  onClose: () => void
  anchorRef: React.RefObject<HTMLButtonElement | null>
}) {
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })

  useLayoutEffect(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 100) })
    }
  }, [anchorRef])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [anchorRef, onClose])

  return createPortal(
    <motion.div
      initial={{ opacity: 0, y: -4, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.97 }}
      transition={{ duration: 0.12 }}
      style={{ position: "fixed", top: pos.top, left: pos.left, minWidth: pos.width, zIndex: 9999 }}
      className="bg-[var(--surface-elevated)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden"
    >
      <div className="max-h-52 overflow-y-auto">
        {days.map((day) => {
          const hasPending = matchesByDay(day)
          return (
            <button
              key={day}
              onClick={() => { onSelect(day); onClose() }}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 text-xs font-semibold transition-all hover:bg-[var(--surface)]",
                activeDay === day ? "text-[var(--accent)]" : "text-[var(--foreground)]"
              )}
            >
              {formatDayShort(day)}
              {hasPending && <span className="w-1.5 h-1.5 rounded-full bg-[var(--warning)] ml-2 shrink-0" />}
            </button>
          )
        })}
      </div>
    </motion.div>,
    document.body
  )
}

export function ResultsManager({ matches, allTeams, matchday, knockoutScoringRule }: Props) {
  const groupMatches = useMemo(() => matches.filter((m) => m.phase === "GROUP"), [matches])
  const knockoutMatches = useMemo(() => matches.filter((m) => m.phase !== "GROUP"), [matches])

  const hasGroups = groupMatches.length > 0

  // Ouvrir directement sur Phases Finales s'il y a des matchs knockout en attente
  const hasKnockoutPending = useMemo(
    () => knockoutMatches.some((m) => m.homeTeamId && m.status !== "FINISHED"),
    [knockoutMatches]
  )

  type Tab = "groups" | "knockout"
  const [tab, setTab] = useState<Tab>(hasKnockoutPending ? "knockout" : hasGroups ? "groups" : "knockout")

  // --- Onglet POULES ---
  const groupLetters = useMemo(() => {
    const letters = new Set(groupMatches.map((m) => m.groupLetter ?? ""))
    return Array.from(letters).filter(Boolean).sort()
  }, [groupMatches])

  const groupDays = useMemo(() => {
    const days = new Set(groupMatches.map((m) => m.kickoff.toISOString().split("T")[0]))
    return Array.from(days).sort()
  }, [groupMatches])

  type GroupFilter = "day" | string
  const [groupFilter, setGroupFilter] = useState<GroupFilter>("day")
  const [showDayDropdown, setShowDayDropdown] = useState(false)
  const dayBtnRef = useRef<HTMLButtonElement>(null)

  const defaultDay = useMemo(() => {
    const pending = groupMatches.find((m) => m.status !== "FINISHED")
    if (pending) return pending.kickoff.toISOString().split("T")[0]
    return groupDays[groupDays.length - 1] ?? groupDays[0] ?? ""
  }, [groupMatches, groupDays])

  const [activeDay, setActiveDay] = useState(defaultDay)

  const groupMatchesFiltered = useMemo(() => {
    if (groupFilter === "day") {
      return groupMatches.filter((m) => m.kickoff.toISOString().split("T")[0] === activeDay)
    }
    return groupMatches.filter((m) => m.groupLetter === groupFilter)
  }, [groupMatches, groupFilter, activeDay])

  const dayHasPending = useCallback(
    (day: string) => groupMatches.filter((m) => m.kickoff.toISOString().split("T")[0] === day).some((m) => m.status !== "FINISHED"),
    [groupMatches]
  )

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
          {/* Ligne de filtres — PAS de overflow-x-auto pour que le portal puisse s'afficher */}
          <div className="flex gap-1 flex-wrap items-center">
            {/* Bouton Jour */}
            <button
              ref={dayBtnRef}
              onClick={() => {
                setGroupFilter("day")
                setShowDayDropdown((v) => !v)
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border shrink-0",
                groupFilter === "day"
                  ? "bg-[var(--surface-elevated)] text-[var(--foreground)] border-[var(--border-strong)]"
                  : "bg-[var(--surface)] text-[var(--foreground-muted)] border-[var(--border)]"
              )}
            >
              <CalendarDays size={12} />
              {groupFilter === "day" ? formatDayShort(activeDay) : "Jour"}
              <ChevronDown size={10} className={cn("transition-transform", showDayDropdown && "rotate-180")} />
            </button>

            {/* Lettres de groupe */}
            {groupLetters.map((letter) => {
              const hasPending = groupMatches.filter((m) => m.groupLetter === letter).some((m) => m.status !== "FINISHED")
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

          {/* Dropdown en portal */}
          <AnimatePresence>
            {showDayDropdown && groupFilter === "day" && (
              <DayDropdown
                days={groupDays}
                activeDay={activeDay}
                matchesByDay={dayHasPending}
                onSelect={setActiveDay}
                onClose={() => setShowDayDropdown(false)}
                anchorRef={dayBtnRef}
              />
            )}
          </AnimatePresence>

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
              <div className="flex gap-1 flex-wrap">
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
                {(() => {
                  const firstPendingId = knockoutMatchesForPhase.find(
                    (m) => m.homeTeamId && m.awayTeamId && m.status !== "FINISHED"
                  )?.id ?? null
                  return knockoutMatchesForPhase.map((match) => (
                    <KnockoutMatchCard
                      key={match.id}
                      match={match}
                      allTeams={allTeams}
                      matchday={matchday}
                      knockoutScoringRule={knockoutScoringRule}
                      defaultOpen={match.id === firstPendingId}
                    />
                  ))
                })()}
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
  match, allTeams, matchday, knockoutScoringRule, defaultOpen,
}: {
  match: Match
  allTeams: Team[]
  matchday: number
  knockoutScoringRule: "REGULAR_TIME" | "FULL_TIME"
  defaultOpen: boolean
}) {
  const hasTeams = !!match.homeTeamId && !!match.awayTeamId
  const [open, setOpen] = useState(defaultOpen)

  const homeLabel = match.homeTeam?.name ?? (match.knockoutLabel ? match.knockoutLabel.split(" / ")[0] : "?")
  const awayLabel = match.awayTeam?.name ?? (match.knockoutLabel ? match.knockoutLabel.split(" / ")[1] : "?")
  const isFinished = match.status === "FINISHED"

  // TAB : prolongations jouées ET pas de buts en prolongations (extraTime = regularTime) ET score final différent (vainqueur +1)
  // Si extraTimeHome/Away existent et diffèrent du RT → victoire en prolongations, pas un TAB
  const etHome = match.extraTimeHome ?? match.regularTimeHome
  const etAway = match.extraTimeAway ?? match.regularTimeAway
  const isPenalties = isFinished && match.regularTimeHome !== null && match.regularTimeAway !== null
    && match.homeScore !== null && match.awayScore !== null
    && etHome === etAway
    && match.homeScore !== match.awayScore
  const tabWinner: "home" | "away" | null = isPenalties
    ? (match.homeScore! > match.awayScore! ? "home" : "away")
    : null
  // Score 90' (référence pronostic) à afficher dans le header
  const headerScoreHome = match.regularTimeHome ?? match.homeScore
  const headerScoreAway = match.regularTimeAway ?? match.awayScore

  return (
    <div className="surface-card overflow-hidden">
      {/* Header accordéon */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-[var(--surface-elevated)] transition-colors"
      >
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <span className="text-base">{match.homeTeam?.flagEmoji ?? "🏆"}</span>
          <span className="text-xs font-bold truncate">{homeLabel}{tabWinner === "home" ? " *" : ""}</span>
          <span className="text-[var(--foreground-muted)] text-xs font-bold mx-1">vs</span>
          <span className="text-xs font-bold truncate">{tabWinner === "away" ? "* " : ""}{awayLabel}</span>
          <span className="text-base">{match.awayTeam?.flagEmoji ?? "🏆"}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isFinished ? (
            <span className="text-xs font-black tabular-nums text-[var(--success)]">
              {headerScoreHome} – {headerScoreAway}{isPenalties ? " TAB" : ""}
            </span>
          ) : hasTeams ? (
            <span className="text-[10px] font-semibold text-[var(--warning)] bg-[var(--warning)]/10 px-2 py-0.5 rounded-full">
              À saisir
            </span>
          ) : (
            <span className="text-[10px] font-semibold text-[var(--foreground-subtle)] bg-[var(--surface-elevated)] px-2 py-0.5 rounded-full">
              En attente
            </span>
          )}
          <ChevronDown size={14} className={cn("text-[var(--foreground-muted)] transition-transform duration-200", open && "rotate-180")} />
        </div>
      </button>

      {/* Contenu accordéon */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 flex flex-col gap-2 border-t border-[var(--border)]">
              <KnockoutManager match={match} allTeams={allTeams} />
              {hasTeams && (
                <div className="pl-3 border-l-2 border-[var(--accent)]/20">
                  <p className="text-[10px] text-[var(--foreground-subtle)] uppercase tracking-wide mb-1.5">Résultat</p>
                  <ResultEntry match={match} matchday={matchday} knockoutScoringRule={knockoutScoringRule} />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
