"use client"

import { useState, useMemo, useRef, useLayoutEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { MatchCard } from "../match-card"
import { CommunityMatchStats } from "../community-match-stats"
import { QuickPickButton } from "../quick-pick-button"
import { PHASE_ORDER } from "@/lib/utils"
import { ChevronDown, ChevronUp, Info, CalendarDays } from "lucide-react"
import { cn } from "@/lib/utils"
import type { MatchWithPrediction } from "@/types"

interface CommunityPrediction {
  matchId: string
  homeScore: number
  awayScore: number
  user: { id: string; firstName: string; lastName: string; avatarSeed: string }
}

interface Props {
  matches: MatchWithPrediction[]
  contestId: string
  communityPredictions: CommunityPrediction[]
  knockoutScoringRule: "REGULAR_TIME" | "FULL_TIME"
}

const ELIM_LABELS: Record<string, string> = {
  ROUND_OF_32: "1/16",
  ROUND_OF_16: "1/8",
  QUARTER_FINAL: "1/4",
  SEMI_FINAL: "1/2",
  THIRD_PLACE: "3e place",
  FINAL: "Finale",
}

const KNOCKOUT_PHASES = ["ROUND_OF_32", "ROUND_OF_16", "QUARTER_FINAL", "SEMI_FINAL", "THIRD_PLACE", "FINAL"]

function formatDayShort(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z")
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })
}

// Dropdown positionné en fixed pour échapper aux overflow parents
function DayDropdown({
  days,
  activeDay,
  hasPendingFn,
  onSelect,
  onClose,
  anchorRef,
}: {
  days: string[]
  activeDay: string
  hasPendingFn: (day: string) => boolean
  onSelect: (day: string) => void
  onClose: () => void
  anchorRef: React.RefObject<HTMLButtonElement | null>
}) {
  const [pos, setPos] = useState({ top: 0, left: 0, width: 100 })
  const [mounted, setMounted] = useState(false)

  useLayoutEffect(() => {
    setMounted(true)
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 100) })
    }

    function handleClick(e: MouseEvent) {
      if (anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [anchorRef, onClose])

  if (!mounted) return null

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
        {days.map((day) => (
          <button
            key={day}
            onClick={() => { onSelect(day); onClose() }}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 text-xs font-semibold transition-all hover:bg-[var(--surface)]",
              activeDay === day ? "text-[var(--accent)]" : "text-[var(--foreground)]"
            )}
          >
            {formatDayShort(day)}
            {hasPendingFn(day) && <span className="w-1.5 h-1.5 rounded-full bg-[var(--error)] ml-2 shrink-0" />}
          </button>
        ))}
      </div>
    </motion.div>,
    document.body
  )
}

export function MatchesTab({ matches, contestId, communityPredictions, knockoutScoringRule }: Props) {
  const pendingGroupCount = useMemo(
    () => matches.filter((m) => m.phase === "GROUP" && m.homeTeamId && !m.isLocked && !m.prediction).length,
    [matches]
  )

  const communityByMatch = useMemo(() => {
    const map: Record<string, CommunityPrediction[]> = {}
    for (const p of communityPredictions) {
      if (!map[p.matchId]) map[p.matchId] = []
      map[p.matchId].push(p)
    }
    return map
  }, [communityPredictions])

  const { groupLetters, elimPhases } = useMemo(() => {
    const groups = new Set<string>()
    const elim = new Set<string>()
    for (const m of matches) {
      if (m.phase === "GROUP" && m.groupLetter) groups.add(m.groupLetter)
      else if (m.phase !== "GROUP") elim.add(m.phase)
    }
    return {
      groupLetters: Array.from(groups).sort(),
      elimPhases: Array.from(elim).sort((a, b) => (PHASE_ORDER[a] ?? 99) - (PHASE_ORDER[b] ?? 99)),
    }
  }, [matches])

  const groupDays = useMemo(() => {
    const days = new Set(matches.filter((m) => m.phase === "GROUP").map((m) => m.kickoff.toISOString().split("T")[0]))
    return Array.from(days).sort()
  }, [matches])

  const hasGroupMatches = groupLetters.length > 0
  const hasElimMatches = elimPhases.length > 0

  // Auto-switch to knockout if there are pending predictions there and none in groups
  const hasKnockoutPending = matches.some((m) => m.phase !== "GROUP" && m.homeTeamId && !m.isLocked && !m.prediction)
  const hasGroupPending = matches.some((m) => m.phase === "GROUP" && !m.isLocked && !m.prediction)

  type MainTab = "groups" | "knockout"
  const [mainTab, setMainTab] = useState<MainTab>(
    hasGroupMatches && !(!hasGroupPending && hasKnockoutPending) ? "groups" : "knockout"
  )

  type GroupFilter = "day" | string
  const [groupFilter, setGroupFilter] = useState<GroupFilter>("day")
  const [showDayDropdown, setShowDayDropdown] = useState(false)
  const dayBtnRef = useRef<HTMLButtonElement>(null)

  const defaultDay = useMemo(() => {
    const pending = matches.find((m) => m.phase === "GROUP" && !m.isLocked)
    if (pending) return pending.kickoff.toISOString().split("T")[0]
    return groupDays[groupDays.length - 1] ?? groupDays[0] ?? ""
  }, [matches, groupDays])

  const [activeDay, setActiveDay] = useState(defaultDay)
  const [activeKnockoutPhase, setActiveKnockoutPhase] = useState<string>(elimPhases[0] ?? "ROUND_OF_16")

  const dayHasPending = useCallback(
    (day: string) => matches.filter((m) => m.phase === "GROUP" && m.kickoff.toISOString().split("T")[0] === day).some((m) => !m.isLocked && !m.prediction),
    [matches]
  )

  const currentMatches = useMemo(() => {
    if (mainTab === "groups") {
      if (groupFilter === "day") return matches.filter((m) => m.phase === "GROUP" && m.kickoff.toISOString().split("T")[0] === activeDay)
      return matches.filter((m) => m.phase === "GROUP" && m.groupLetter === groupFilter)
    }
    return matches.filter((m) => m.phase === activeKnockoutPhase)
  }, [matches, mainTab, groupFilter, activeDay, activeKnockoutPhase])

  return (
    <div className="flex flex-col gap-0 pb-6">
      {/* Navigation principale */}
      <div className="flex gap-1 mb-3 bg-[var(--surface-elevated)] rounded-xl p-1">
        {hasGroupMatches && (
          <button
            onClick={() => setMainTab("groups")}
            className={cn("flex-1 py-2 rounded-lg text-xs font-semibold transition-all", mainTab === "groups" ? "gradient-accent text-white shadow-sm" : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]")}
          >
            Poules
          </button>
        )}
        <button
          onClick={() => { setMainTab("knockout"); if (!activeKnockoutPhase && elimPhases[0]) setActiveKnockoutPhase(elimPhases[0]) }}
          className={cn("flex-1 py-2 rounded-lg text-xs font-semibold transition-all relative", mainTab === "knockout" ? "gradient-accent text-white shadow-sm" : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]")}
        >
          Phases Finales
          {hasKnockoutPending && mainTab !== "knockout" && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[var(--error)]" />
          )}
        </button>
      </div>

      {/* Quick Pick — visible uniquement dans l'onglet poules avec matchs restants */}
      {mainTab === "groups" && pendingGroupCount > 0 && (
        <div className="mb-3">
          <QuickPickButton contestId={contestId} pendingGroupCount={pendingGroupCount} />
        </div>
      )}

      {/* === FILTRE POULES === */}
      {mainTab === "groups" && hasGroupMatches && (
        <div className="flex flex-col gap-2 mb-3">
          {/* Bouton Jour + lettres — flex-wrap pour éviter overflow qui casserait le dropdown */}
          <div className="flex gap-1 flex-wrap items-center">
            <button
              ref={dayBtnRef}
              onClick={() => { setGroupFilter("day"); setShowDayDropdown((v) => !v) }}
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

            {groupLetters.map((letter) => {
              const hasPending = matches.filter((m) => m.phase === "GROUP" && m.groupLetter === letter).some((m) => !m.isLocked && !m.prediction)
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
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[var(--error)]" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Dropdown portal */}
          <AnimatePresence>
            {showDayDropdown && groupFilter === "day" && (
              <DayDropdown
                days={groupDays}
                activeDay={activeDay}
                hasPendingFn={dayHasPending}
                onSelect={setActiveDay}
                onClose={() => setShowDayDropdown(false)}
                anchorRef={dayBtnRef}
              />
            )}
          </AnimatePresence>
        </div>
      )}

      {/* === FILTRE PHASES FINALES === */}
      {mainTab === "knockout" && (
        <div className="flex flex-col gap-2 mb-3">
          <div className="flex gap-1 flex-wrap">
            {KNOCKOUT_PHASES.filter((p) => elimPhases.includes(p) || !hasElimMatches).map((phase) => {
              const phaseMatches = matches.filter((m) => m.phase === phase)
              const hasPhase = phaseMatches.length > 0
              const hasPending = phaseMatches.some((m) => m.homeTeamId && !m.isLocked && !m.prediction)
              if (!hasPhase && hasElimMatches) return null
              return (
                <button
                  key={phase}
                  onClick={() => setActiveKnockoutPhase(phase)}
                  className={cn(
                    "shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all relative border",
                    activeKnockoutPhase === phase
                      ? "bg-[var(--surface-elevated)] text-[var(--foreground)] border-[var(--border-strong)]"
                      : "bg-[var(--surface)] text-[var(--foreground-muted)] border-[var(--border)]",
                    !hasPhase && "opacity-40"
                  )}
                >
                  {ELIM_LABELS[phase] ?? phase}
                  {hasPending && activeKnockoutPhase !== phase && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[var(--error)]" />
                  )}
                </button>
              )
            })}
          </div>

          <div className="flex items-start gap-1.5 px-2 py-1.5 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border)]">
            <Info size={11} className="text-[var(--foreground-muted)] mt-0.5 shrink-0" />
            <p className="text-[10px] text-[var(--foreground-muted)]">
              {knockoutScoringRule === "REGULAR_TIME"
                ? "Règle knockout : pronostic évalué sur le score à 90' uniquement."
                : "Règle knockout : pronostic évalué sur le score final après prolongations."
              }
            </p>
          </div>
        </div>
      )}

      {/* Liste des matchs */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${mainTab}-${mainTab === "groups" ? (groupFilter === "day" ? `day-${activeDay}` : groupFilter) : activeKnockoutPhase}`}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.15 }}
          className="flex flex-col gap-2"
        >
          {mainTab === "knockout" ? (
            currentMatches.length === 0 ? (
              <KnockoutPlaceholder phase={activeKnockoutPhase} />
            ) : (
              currentMatches.map((match) => (
                <MatchCardWithCommunity key={match.id} match={match} contestId={contestId} community={communityByMatch[match.id] ?? []} />
              ))
            )
          ) : currentMatches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
              <span className="text-3xl">⏳</span>
              <p className="text-sm text-[var(--foreground-muted)]">Aucun match pour cette sélection.</p>
            </div>
          ) : groupFilter === "day" ? (
            // Vue jour : accordion par groupe
            <GroupDayAccordions matches={currentMatches} contestId={contestId} communityByMatch={communityByMatch} />
          ) : (
            // Vue groupe unique : liste plate
            currentMatches.map((match) => (
              <MatchCardWithCommunity key={match.id} match={match} contestId={contestId} community={communityByMatch[match.id] ?? []} />
            ))
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function GroupDayAccordions({ matches, contestId, communityByMatch }: {
  matches: MatchWithPrediction[]
  contestId: string
  communityByMatch: Record<string, CommunityPrediction[]>
}) {
  // Regroupe les matchs du jour par lettre de groupe
  const byGroup = matches.reduce<Record<string, MatchWithPrediction[]>>((acc, m) => {
    const key = m.groupLetter ?? "?"
    if (!acc[key]) acc[key] = []
    acc[key].push(m)
    return acc
  }, {})
  const groupLetters = Object.keys(byGroup).sort()

  // Si un seul groupe dans la journée, pas besoin d'accordion
  if (groupLetters.length <= 1) {
    return (
      <>
        {matches.map((match) => (
          <MatchCardWithCommunity key={match.id} match={match} contestId={contestId} community={communityByMatch[match.id] ?? []} />
        ))}
      </>
    )
  }

  return (
    <>
      {groupLetters.map((letter) => {
        const groupMatches = byGroup[letter]
        const pending = groupMatches.filter((m) => !m.isLocked && !m.prediction).length
        return (
          <GroupAccordion
            key={letter}
            letter={letter}
            matchCount={groupMatches.length}
            pendingCount={pending}
          >
            {groupMatches.map((match) => (
              <MatchCardWithCommunity key={match.id} match={match} contestId={contestId} community={communityByMatch[match.id] ?? []} />
            ))}
          </GroupAccordion>
        )
      })}
    </>
  )
}

function GroupAccordion({ letter, matchCount, pendingCount, children }: {
  letter: string
  matchCount: number
  pendingCount: number
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(true) // ouvert par défaut pour les matchs (à pronostiquer)

  return (
    <div className="surface-card overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[var(--foreground)]">Groupe {letter}</span>
          <span className="text-[10px] font-semibold text-[var(--foreground-muted)] bg-[var(--surface-elevated)] px-2 py-0.5 rounded-full">
            {matchCount} match{matchCount > 1 ? "s" : ""}
          </span>
          {pendingCount > 0 && (
            <span className="text-[10px] font-semibold text-[var(--error)] bg-[var(--error)]/10 px-2 py-0.5 rounded-full">
              {pendingCount} à faire
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

function KnockoutPlaceholder({ phase }: { phase: string }) {
  const label = ELIM_LABELS[phase] ?? phase
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-center text-2xl">🏆</div>
      <div>
        <p className="text-sm font-semibold text-[var(--foreground)]">{label}</p>
        <p className="text-xs text-[var(--foreground-muted)] mt-1">Les équipes qualifiées apparaîtront ici automatiquement.</p>
        <p className="text-[10px] text-[var(--foreground-subtle)] mt-1">Tu pourras pronostiquer dès que les équipes sont connues.</p>
      </div>
    </div>
  )
}

function MatchCardWithCommunity({ match, contestId, community }: { match: MatchWithPrediction; contestId: string; community: CommunityPrediction[] }) {
  const [showCommunity, setShowCommunity] = useState(false)
  const hasCommunity = match.isLocked && community.length > 0

  return (
    <div className="flex flex-col gap-0">
      <MatchCard match={match} contestId={contestId} initialHomeScore={match.prediction?.homeScore} initialAwayScore={match.prediction?.awayScore} />
      {hasCommunity && (
        <button
          onClick={() => setShowCommunity(!showCommunity)}
          className="flex items-center justify-center gap-1 py-1.5 text-[11px] text-[var(--foreground-subtle)] hover:text-[var(--foreground-muted)] transition-colors border-t border-[var(--border)] bg-[var(--surface-card)] rounded-b-xl -mt-px"
        >
          {showCommunity ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          {community.length} pronostic{community.length > 1 ? "s" : ""} · Voir la communauté
        </button>
      )}
      <AnimatePresence>
        {showCommunity && hasCommunity && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <CommunityMatchStats match={match} predictions={community} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

