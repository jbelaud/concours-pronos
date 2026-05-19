"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MatchCard } from "../match-card"
import { CommunityMatchStats } from "../community-match-stats"
import { PHASE_ORDER, formatKickoff } from "@/lib/utils"
import { ChevronDown, ChevronUp } from "lucide-react"
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
}

const ELIM_LABELS: Record<string, string> = {
  ROUND_OF_32: "1/16",
  ROUND_OF_16: "1/8",
  QUARTER_FINAL: "1/4",
  SEMI_FINAL: "1/2",
  THIRD_PLACE: "3e",
  FINAL: "Finale",
}

type FilterKey = `group-${string}` | `phase-${string}`

export function MatchesTab({ matches, contestId, communityPredictions }: Props) {
  const communityByMatch = useMemo(() => {
    const map: Record<string, CommunityPrediction[]> = {}
    for (const p of communityPredictions) {
      if (!map[p.matchId]) map[p.matchId] = []
      map[p.matchId].push(p)
    }
    return map
  }, [communityPredictions])

  // Build filter options
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

  const defaultFilter: FilterKey = groupLetters.length > 0
    ? `group-${groupLetters[0]}`
    : elimPhases.length > 0 ? `phase-${elimPhases[0]}` : `group-A`

  const [activeFilter, setActiveFilter] = useState<FilterKey>(defaultFilter)

  const currentMatches = useMemo(() => {
    if (activeFilter.startsWith("group-")) {
      const letter = activeFilter.replace("group-", "")
      return matches.filter((m) => m.phase === "GROUP" && m.groupLetter === letter)
    } else {
      const phase = activeFilter.replace("phase-", "")
      return matches.filter((m) => m.phase === phase)
    }
  }, [matches, activeFilter])

  const hasGroupMatches = groupLetters.length > 0
  const hasElimMatches = elimPhases.length > 0

  return (
    <div className="flex flex-col gap-3 pb-6">
      {/* Filter pills — scrollable */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none -mx-0">
        {/* Group pills */}
        {hasGroupMatches && groupLetters.map((letter) => {
          const key: FilterKey = `group-${letter}`
          const groupMatches = matches.filter((m) => m.phase === "GROUP" && m.groupLetter === letter)
          const hasPending = groupMatches.some((m) => !m.isLocked && !m.prediction)
          return (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={cn(
                "shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all relative",
                activeFilter === key
                  ? "gradient-accent text-white"
                  : "bg-[var(--surface-elevated)] text-[var(--foreground-muted)] border border-[var(--border)]"
              )}
            >
              {letter}
              {hasPending && activeFilter !== key && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[var(--error)]" />
              )}
            </button>
          )
        })}

        {/* Separator */}
        {hasGroupMatches && hasElimMatches && (
          <div className="w-px self-stretch bg-[var(--border)] mx-1 shrink-0" />
        )}

        {/* Elim pills */}
        {hasElimMatches && elimPhases.map((phase) => {
          const key: FilterKey = `phase-${phase}`
          const phaseMatches = matches.filter((m) => m.phase === phase)
          const hasPending = phaseMatches.some((m) => m.homeTeamId && !m.isLocked && !m.prediction)
          return (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={cn(
                "shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all relative",
                activeFilter === key
                  ? "gradient-accent text-white"
                  : "bg-[var(--surface-elevated)] text-[var(--foreground-muted)] border border-[var(--border)]"
              )}
            >
              {ELIM_LABELS[phase] ?? phase}
              {hasPending && activeFilter !== key && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[var(--error)]" />
              )}
            </button>
          )
        })}
      </div>

      {/* Match list */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeFilter}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.15 }}
          className="flex flex-col gap-2"
        >
          {currentMatches.length === 0 ? (
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
          )}
        </motion.div>
      </AnimatePresence>
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
