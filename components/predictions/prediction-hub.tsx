"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Trophy, Users, Star, BarChart2 } from "lucide-react"
import { MatchesTab } from "./tabs/matches-tab"
import { TournamentTab } from "./tabs/tournament-tab"
import { CommunityTab } from "./tabs/community-tab"
import { ResultsTab } from "./tabs/results-tab"
import { cn } from "@/lib/utils"
import type { MatchWithPrediction, Team, ScorerCandidate } from "@/types"

interface GroupWithTeams {
  id: string
  letter: string
  name: string
  teams: Array<{ teamId: string; team: Team }>
}

interface BonusPred {
  id: string
  winnerId: string | null
  topScorerId: string | null
  topScorerFreeText: string | null
  bestAttackId: string | null
  bestDefenseId: string | null
  winner: Team | null
  bestAttack: Team | null
  bestDefense: Team | null
  groupPredictions: Array<{ groupLetter: string; firstTeamCode: string; secondTeamCode: string }>
}

interface CommunityPrediction {
  matchId: string
  homeScore: number
  awayScore: number
  user: { id: string; firstName: string; lastName: string; avatarSeed: string }
}

export interface CommunityBonusPrediction {
  id: string
  userId: string
  topScorerFreeText: string | null
  winner: { id: string; name: string; flagEmoji: string | null } | null
  bestAttack: { id: string; name: string; flagEmoji: string | null } | null
  bestDefense: { id: string; name: string; flagEmoji: string | null } | null
  groupPredictions: Array<{ groupLetter: string; firstTeamCode: string; secondTeamCode: string }>
  user: { id: string; firstName: string; lastName: string; avatarSeed: string }
}

interface Props {
  contest: { id: string; name: string; status: string }
  matches: MatchWithPrediction[]
  communityPredictions: CommunityPrediction[]
  communityBonusPredictions: CommunityBonusPrediction[]
  teams: Team[]
  groups: GroupWithTeams[]
  scorerCandidates: ScorerCandidate[]
  myBonusPred: BonusPred | null
  firstMatchKickoff: Date | null
  tournamentLocked: boolean
  pendingMatchCount: number
  bonusCompleted: number
  bonusTotal: number
  userId: string
  knockoutScoringRule: "REGULAR_TIME" | "FULL_TIME"
  settings: {
    pointsCorrectResult: number
    pointsExactScore: number
    pointsWrongResult: number
  }
}

const TABS = [
  { id: "matches",    label: "Matchs",     icon: Trophy },
  { id: "tournament", label: "Tournoi",    icon: Star },
  { id: "results",    label: "Résultats",  icon: BarChart2 },
  { id: "community",  label: "Communauté", icon: Users },
] as const

type TabId = typeof TABS[number]["id"]

export function PredictionHub(props: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("matches")

  const { pendingMatchCount, bonusCompleted, bonusTotal, tournamentLocked } = props

  return (
    <div className="flex flex-col gap-0 -mx-4">
      {/* Header */}
      <div className="px-4 pt-2 pb-3">
        <h1 className="text-2xl font-black text-[var(--foreground)]">Pronostics</h1>
        <p className="text-sm text-[var(--foreground-muted)]">{props.contest.name}</p>
      </div>

      {/* Progress summary */}
      <div className="px-4 mb-3">
        <ProgressSummary
          pendingMatchCount={pendingMatchCount}
          bonusCompleted={bonusCompleted}
          bonusTotal={bonusTotal}
          tournamentLocked={tournamentLocked}
          onGoTournament={() => setActiveTab("tournament")}
          onGoMatches={() => setActiveTab("matches")}
        />
      </div>

      {/* Sticky tab bar */}
      <div className="sticky top-0 z-20 bg-[var(--background)] border-b border-[var(--border)] px-4 py-2">
        <div className="flex gap-1 overflow-x-auto scrollbar-none bg-[var(--surface-elevated)] rounded-xl p-1">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            const badge =
              tab.id === "matches" && pendingMatchCount > 0 ? pendingMatchCount :
              tab.id === "tournament" && !tournamentLocked && bonusCompleted < bonusTotal ? bonusTotal - bonusCompleted :
              null

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 shrink-0 flex items-center justify-center gap-1 py-2 px-2 rounded-lg text-[11px] font-semibold transition-all relative whitespace-nowrap",
                  isActive
                    ? "gradient-accent text-white shadow-sm"
                    : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                )}
              >
                <Icon size={12} />
                {tab.label}
                {badge !== null && (
                  <span className={cn(
                    "absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center",
                    isActive ? "bg-white text-[var(--purple)]" : "bg-[var(--error)] text-white"
                  )}>
                    {badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-4 pt-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === "matches" && (
              <MatchesTab
                matches={props.matches}
                contestId={props.contest.id}
                communityPredictions={props.communityPredictions}
                knockoutScoringRule={props.knockoutScoringRule}
              />
            )}
            {activeTab === "tournament" && (
              <TournamentTab
                contestId={props.contest.id}
                teams={props.teams}
                groups={props.groups}
                scorerCandidates={props.scorerCandidates}
                myBonusPred={props.myBonusPred}
                firstMatchKickoff={props.firstMatchKickoff}
                tournamentLocked={props.tournamentLocked}
              />
            )}
            {activeTab === "results" && (
              <ResultsTab
                matches={props.matches}
                settings={props.settings}
              />
            )}
            {activeTab === "community" && (
              <CommunityTab
                matches={props.matches}
                communityPredictions={props.communityPredictions}
                communityBonusPredictions={props.communityBonusPredictions}
                groups={props.groups}
                userId={props.userId}
                tournamentLocked={props.tournamentLocked}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

function ProgressSummary({
  pendingMatchCount, bonusCompleted, bonusTotal, tournamentLocked, onGoTournament, onGoMatches,
}: {
  pendingMatchCount: number
  bonusCompleted: number
  bonusTotal: number
  tournamentLocked: boolean
  onGoTournament: () => void
  onGoMatches: () => void
}) {
  const hasPendingBonus = !tournamentLocked && bonusCompleted < bonusTotal
  const hasPendingMatches = pendingMatchCount > 0

  if (!hasPendingBonus && !hasPendingMatches) {
    return (
      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--success-dim)] border border-[var(--success)]/20">
        <span className="text-base">✅</span>
        <span className="text-xs font-semibold text-[var(--success)]">Tous tes pronostics sont à jour !</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      {hasPendingBonus && (
        <button onClick={onGoTournament} className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--warning-dim)] border border-[var(--warning)]/20 w-full text-left">
          <div className="flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <div>
              <div className="text-xs font-semibold text-[var(--warning)]">Pronostics tournoi incomplets</div>
              <div className="text-[10px] text-[var(--foreground-muted)]">{bonusCompleted}/{bonusTotal} remplis · Verrouillés au 1er match</div>
            </div>
          </div>
          <span className="text-[10px] text-[var(--warning)] font-semibold">Compléter →</span>
        </button>
      )}
      {hasPendingMatches && (
        <button onClick={onGoMatches} className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--accent-dim)] border border-[var(--accent)]/20 w-full text-left">
          <div className="flex items-center gap-2">
            <span className="text-base">⚽</span>
            <div>
              <div className="text-xs font-semibold text-[var(--accent)]">{pendingMatchCount} match{pendingMatchCount > 1 ? "s" : ""} à pronostiquer</div>
              <div className="text-[10px] text-[var(--foreground-muted)]">Verrouillés au coup d&apos;envoi</div>
            </div>
          </div>
          <span className="text-[10px] text-[var(--accent)] font-semibold">Voir →</span>
        </button>
      )}
    </div>
  )
}
