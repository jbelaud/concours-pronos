"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MatchCard } from "../match-card"
import { CommunityMatchStats } from "../community-match-stats"
import { PHASE_ORDER, formatKickoff } from "@/lib/utils"
import { ChevronDown, ChevronUp, Info } from "lucide-react"
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
  QUARTER_FINAL: "Quarts",
  SEMI_FINAL: "Demies",
  THIRD_PLACE: "3e place",
  FINAL: "Finale",
}

const KNOCKOUT_PHASES = ["ROUND_OF_32", "ROUND_OF_16", "QUARTER_FINAL", "SEMI_FINAL", "THIRD_PLACE", "FINAL"]

export function MatchesTab({ matches, contestId, communityPredictions, knockoutScoringRule }: Props) {
  const communityByMatch = useMemo(() => {
    const map: Record<string, CommunityPrediction[]> = {}
    for (const p of communityPredictions) {
      if (!map[p.matchId]) map[p.matchId] = []
      map[p.matchId].push(p)
    }
    return map
  }, [communityPredictions])

  // Séparation poules / knockout
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

  const hasGroupMatches = groupLetters.length > 0
  const hasElimMatches = elimPhases.length > 0

  // Navigation principale : Poules / Phases Finales
  type MainTab = "groups" | "knockout"
  const defaultMainTab: MainTab = hasGroupMatches ? "groups" : "knockout"
  const [mainTab, setMainTab] = useState<MainTab>(defaultMainTab)

  // Sous-filtre poules (lettre)
  const [activeGroupLetter, setActiveGroupLetter] = useState<string>(groupLetters[0] ?? "A")

  // Sous-filtre knockout (phase)
  const [activeKnockoutPhase, setActiveKnockoutPhase] = useState<string>(elimPhases[0] ?? "ROUND_OF_16")

  const currentMatches = useMemo(() => {
    if (mainTab === "groups") {
      return matches.filter((m) => m.phase === "GROUP" && m.groupLetter === activeGroupLetter)
    } else {
      return matches.filter((m) => m.phase === activeKnockoutPhase)
    }
  }, [matches, mainTab, activeGroupLetter, activeKnockoutPhase])

  // Grouper les matchs knockout par date
  const matchesByDay = useMemo(() => {
    if (mainTab !== "knockout") return null
    const byDay: Record<string, MatchWithPrediction[]> = {}
    for (const m of currentMatches) {
      const day = m.kickoff.toISOString().split("T")[0]
      if (!byDay[day]) byDay[day] = []
      byDay[day].push(m)
    }
    return byDay
  }, [currentMatches, mainTab])

  return (
    <div className="flex flex-col gap-0 pb-6">
      {/* Navigation principale — Poules / Phases Finales */}
      <div className="flex gap-1 mb-2 bg-[var(--surface-elevated)] rounded-xl p-1">
        {hasGroupMatches && (
          <button
            onClick={() => setMainTab("groups")}
            className={cn(
              "flex-1 py-2 rounded-lg text-xs font-semibold transition-all",
              mainTab === "groups"
                ? "gradient-accent text-white shadow-sm"
                : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            )}
          >
            Poules
          </button>
        )}
        <button
          onClick={() => { setMainTab("knockout"); if (!activeKnockoutPhase && elimPhases[0]) setActiveKnockoutPhase(elimPhases[0]) }}
          className={cn(
            "flex-1 py-2 rounded-lg text-xs font-semibold transition-all",
            mainTab === "knockout"
              ? "gradient-accent text-white shadow-sm"
              : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
          )}
        >
          Phases Finales
        </button>
      </div>

      {/* Sous-onglets groupes */}
      {mainTab === "groups" && hasGroupMatches && (
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none mb-3">
          {groupLetters.map((letter) => {
            const groupMatches = matches.filter((m) => m.phase === "GROUP" && m.groupLetter === letter)
            const hasPending = groupMatches.some((m) => !m.isLocked && !m.prediction)
            return (
              <button
                key={letter}
                onClick={() => setActiveGroupLetter(letter)}
                className={cn(
                  "shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all relative",
                  activeGroupLetter === letter
                    ? "bg-[var(--surface-elevated)] text-[var(--foreground)] border border-[var(--border-strong)]"
                    : "bg-[var(--surface)] text-[var(--foreground-muted)] border border-[var(--border)]"
                )}
              >
                {letter}
                {hasPending && activeGroupLetter !== letter && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[var(--error)]" />
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Sous-onglets knockout */}
      {mainTab === "knockout" && (
        <div className="flex flex-col gap-2 mb-3">
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
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
                    "shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all relative",
                    activeKnockoutPhase === phase
                      ? "bg-[var(--surface-elevated)] text-[var(--foreground)] border border-[var(--border-strong)]"
                      : "bg-[var(--surface)] text-[var(--foreground-muted)] border border-[var(--border)]",
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

          {/* Info règle de scoring knockout */}
          <div className="flex items-start gap-1.5 px-2 py-1.5 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border)]">
            <Info size={11} className="text-[var(--foreground-muted)] mt-0.5 shrink-0" />
            <p className="text-[10px] text-[var(--foreground-muted)]">
              {knockoutScoringRule === "REGULAR_TIME"
                ? "Règle knockout : pronostic évalué sur le score à 90' uniquement. Les prolongations ne comptent pas."
                : "Règle knockout : pronostic évalué sur le score final après prolongations (hors tirs au but)."
              }
            </p>
          </div>
        </div>
      )}

      {/* Liste des matchs */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${mainTab}-${mainTab === "groups" ? activeGroupLetter : activeKnockoutPhase}`}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.15 }}
          className="flex flex-col gap-2"
        >
          {mainTab === "knockout" && matchesByDay ? (
            Object.entries(matchesByDay).length === 0 && currentMatches.length === 0 ? (
              <KnockoutPlaceholder phase={activeKnockoutPhase} />
            ) : (
              currentMatches.map((match) => (
                <MatchCardWithCommunity
                  key={match.id}
                  match={match}
                  contestId={contestId}
                  community={communityByMatch[match.id] ?? []}
                />
              ))
            )
          ) : (
            currentMatches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
                <span className="text-3xl">⏳</span>
                <p className="text-sm text-[var(--foreground-muted)]">
                  Les équipes ne sont pas encore connues.
                </p>
              </div>
            ) : (
              currentMatches.map((match) => (
                <MatchCardWithCommunity
                  key={match.id}
                  match={match}
                  contestId={contestId}
                  community={communityByMatch[match.id] ?? []}
                />
              ))
            )
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function KnockoutPlaceholder({ phase }: { phase: string }) {
  const label = ELIM_LABELS[phase] ?? phase
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-center text-2xl">
        🏆
      </div>
      <div>
        <p className="text-sm font-semibold text-[var(--foreground)]">{label}</p>
        <p className="text-xs text-[var(--foreground-muted)] mt-1">
          Les équipes qualifiées apparaîtront ici automatiquement.
        </p>
        <p className="text-[10px] text-[var(--foreground-subtle)] mt-1">
          Tu pourras pronostiquer dès que les équipes sont connues.
        </p>
      </div>
    </div>
  )
}

function MatchCardWithCommunity({
  match,
  contestId,
  community,
}: {
  match: MatchWithPrediction
  contestId: string
  community: CommunityPrediction[]
}) {
  const [showCommunity, setShowCommunity] = useState(false)
  const hasCommunity = match.isLocked && community.length > 0

  return (
    <div className="flex flex-col gap-0">
      <MatchCard
        match={match}
        contestId={contestId}
        initialHomeScore={match.prediction?.homeScore}
        initialAwayScore={match.prediction?.awayScore}
      />

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
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <CommunityMatchStats match={match} predictions={community} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
