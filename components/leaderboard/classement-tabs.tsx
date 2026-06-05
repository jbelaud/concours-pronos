"use client"

import { useState } from "react"
import { BarChart3, BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import { LeaderboardList } from "@/components/leaderboard/leaderboard-list"
import { ContestRulesTab } from "@/components/leaderboard/contest-rules-tab"
import type { LeaderboardRow } from "@/types"
import type { TieBreakerKey } from "@/lib/ranking"

interface ScoringSettings {
  pointsCorrectResult: number
  pointsExactScore: number
  pointsWinner: number
  pointsTopScorer: number
  pointsBestAttack: number
  pointsBestDefense: number
  pointsGroupFirst: number
  pointsGroupSecond: number
  knockoutScoringRule: "REGULAR_TIME" | "FULL_TIME"
  tieBreakerOrder: TieBreakerKey[]
}

interface Props {
  rows: LeaderboardRow[]
  currentUserId: string
  itmCount: number
  settings: ScoringSettings
  hasEntries: boolean
}

type Tab = "classement" | "regles"

export function ClassementTabs({ rows, currentUserId, itmCount, settings, hasEntries }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("classement")

  return (
    <div className="flex flex-col gap-4">
      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)]">
        <button
          type="button"
          onClick={() => setActiveTab("classement")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-all",
            activeTab === "classement"
              ? "bg-[var(--surface-card)] text-[var(--foreground)] shadow-sm"
              : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
          )}
        >
          <BarChart3 size={14} />
          Classement
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("regles")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-all",
            activeTab === "regles"
              ? "bg-[var(--surface-card)] text-[var(--foreground)] shadow-sm"
              : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
          )}
        >
          <BookOpen size={14} />
          Règles
        </button>
      </div>

      {/* Contenu */}
      {activeTab === "classement" ? (
        <>
          <LeaderboardList
            entries={rows}
            currentUserId={currentUserId}
            itmCount={itmCount}
          />
          {!hasEntries && (
            <div className="text-center py-12 text-[var(--foreground-muted)] text-sm">
              Aucun participant n&apos;a encore de points.
            </div>
          )}
        </>
      ) : (
        <ContestRulesTab settings={settings} />
      )}
    </div>
  )
}
