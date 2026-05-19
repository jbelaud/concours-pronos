"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MatchCard } from "../match-card"
import { CommunityMatchStats } from "../community-match-stats"
import { PHASE_LABELS, PHASE_ORDER, formatKickoff, isMatchLocked } from "@/lib/utils"
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

const PHASE_SHORT: Record<string, string> = {
  GROUP: "Groupes",
  ROUND_OF_32: "1/16",
  ROUND_OF_16: "1/8",
  QUARTER_FINAL: "1/4",
  SEMI_FINAL: "1/2",
  THIRD_PLACE: "3e place",
  FINAL: "Finale",
}

export function MatchesTab({ matches, contestId, communityPredictions }: Props) {
  const phases = useMemo(() => {
    const byPhase = matches.reduce<Record<string, MatchWithPrediction[]>>((acc, m) => {
      if (!acc[m.phase]) acc[m.phase] = []
      acc[m.phase].push(m)
      return acc
    }, {})
    return Object.keys(byPhase)
      .sort((a, b) => (PHASE_ORDER[a] ?? 99) - (PHASE_ORDER[b] ?? 99))
      .map((phase) => ({ phase, matches: byPhase[phase] }))
  }, [matches])

  const [activePhase, setActivePhase] = useState<string>(phases[0]?.phase ?? "GROUP")

  const communityByMatch = useMemo(() => {
    const map: Record<string, CommunityPrediction[]> = {}
    for (const p of communityPredictions) {
      if (!map[p.matchId]) map[p.matchId] = []
      map[p.matchId].push(p)
    }
    return map
  }, [communityPredictions])

  const currentMatches = phases.find((p) => p.phase === activePhase)?.matches ?? []

  return (
    <div className="flex flex-col gap-3 pb-6">
      {/* Phase selector — scroll horizontal */}
      {phases.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-0 scrollbar-none">
          {phases.map(({ phase }) => (
            <button
              key={phase}
              onClick={() => setActivePhase(phase)}
              className={cn(
                "shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                activePhase === phase
                  ? "gradient-accent text-white"
                  : "bg-[var(--surface-elevated)] text-[var(--foreground-muted)] border border-[var(--border)]"
              )}
            >
              {PHASE_SHORT[phase] ?? phase}
            </button>
          ))}
        </div>
      )}

      {/* Matches list */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activePhase}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.15 }}
          className="flex flex-col gap-2"
        >
          {currentMatches.map((match) => (
            <MatchCardWithCommunity
              key={match.id}
              match={match}
              contestId={contestId}
              community={communityByMatch[match.id] ?? []}
            />
          ))}
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

      {/* Bouton stats communauté (seulement après verrouillage) */}
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
            <CommunityMatchStats
              match={match}
              predictions={community}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
