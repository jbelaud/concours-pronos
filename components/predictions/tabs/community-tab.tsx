"use client"

import { useMemo } from "react"
import { FootballAvatar } from "@/components/shared/football-avatar"
import { cn, PHASE_ORDER } from "@/lib/utils"
import type { MatchWithPrediction } from "@/types"

interface CommunityPrediction {
  matchId: string
  homeScore: number
  awayScore: number
  user: { id: string; firstName: string; lastName: string; avatarSeed: string }
}

interface Props {
  matches: MatchWithPrediction[]
  communityPredictions: CommunityPrediction[]
  userId: string
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

export function CommunityTab({ matches, communityPredictions, userId }: Props) {
  const communityByMatch = useMemo(() => {
    const map: Record<string, CommunityPrediction[]> = {}
    for (const p of communityPredictions) {
      if (!map[p.matchId]) map[p.matchId] = []
      map[p.matchId].push(p)
    }
    return map
  }, [communityPredictions])

  const lockedMatches = useMemo(() => {
    return matches
      .filter((m) => m.isLocked && communityByMatch[m.id]?.length > 0)
      .sort((a, b) => {
        const phaseOrder = (PHASE_ORDER[a.phase] ?? 99) - (PHASE_ORDER[b.phase] ?? 99)
        if (phaseOrder !== 0) return phaseOrder
        return new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime()
      })
  }, [matches, communityByMatch])

  if (lockedMatches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <span className="text-4xl">🔒</span>
        <p className="text-sm text-[var(--foreground-muted)] text-center">
          Les pronostics de la communauté seront visibles après le coup d'envoi des matchs.
        </p>
      </div>
    )
  }

  // Group by phase
  const byPhase = lockedMatches.reduce<Record<string, MatchWithPrediction[]>>((acc, m) => {
    if (!acc[m.phase]) acc[m.phase] = []
    acc[m.phase].push(m)
    return acc
  }, {})

  const phases = Object.keys(byPhase).sort(
    (a, b) => (PHASE_ORDER[a] ?? 99) - (PHASE_ORDER[b] ?? 99)
  )

  return (
    <div className="flex flex-col gap-4 pb-6">
      {phases.map((phase) => (
        <div key={phase} className="flex flex-col gap-2">
          <div className="text-[11px] font-bold text-[var(--foreground-subtle)] uppercase tracking-wide px-1">
            {PHASE_SHORT[phase] ?? phase}
          </div>
          {byPhase[phase].map((match) => {
            const preds = communityByMatch[match.id] ?? []
            const realResult =
              match.status === "FINISHED" && match.homeScore !== null && match.awayScore !== null
                ? match.homeScore > match.awayScore ? "home"
                : match.homeScore === match.awayScore ? "draw"
                : "away"
                : null

            let homeWin = 0, draw = 0, awayWin = 0
            for (const p of preds) {
              if (p.homeScore > p.awayScore) homeWin++
              else if (p.homeScore === p.awayScore) draw++
              else awayWin++
            }
            const total = preds.length
            const homeWinPct = Math.round((homeWin / total) * 100)
            const drawPct = Math.round((draw / total) * 100)
            const awayWinPct = Math.round((awayWin / total) * 100)

            return (
              <div key={match.id} className="surface-card overflow-hidden">
                {/* Match header */}
                <div className="flex items-center gap-2 px-3 pt-3 pb-2">
                  <span className="text-lg leading-none">{match.homeTeam?.flagEmoji ?? "🏳️"}</span>
                  <span className="flex-1 text-xs font-semibold text-[var(--foreground)] truncate text-right">
                    {match.homeTeam?.name}
                  </span>
                  {match.status === "FINISHED" && match.homeScore !== null ? (
                    <span className="text-sm font-black text-[var(--foreground)] tabular-nums px-2">
                      {match.homeScore} – {match.awayScore}
                    </span>
                  ) : (
                    <span className="text-[11px] text-[var(--foreground-subtle)] px-2">vs</span>
                  )}
                  <span className="flex-1 text-xs font-semibold text-[var(--foreground)] truncate">
                    {match.awayTeam?.name}
                  </span>
                  <span className="text-lg leading-none">{match.awayTeam?.flagEmoji ?? "🏳️"}</span>
                </div>

                {/* Distribution bar */}
                <div className="px-3 pb-2">
                  <div className="flex rounded-lg overflow-hidden h-4 gap-px mb-1">
                    <div
                      className={cn(
                        "flex items-center justify-center text-[9px] font-bold text-white transition-all",
                        realResult === "home" ? "bg-[var(--success)]" : "bg-[var(--accent)]/60"
                      )}
                      style={{ width: `${homeWinPct}%`, minWidth: homeWinPct > 0 ? "24px" : "0" }}
                    >
                      {homeWinPct > 12 ? `${homeWinPct}%` : ""}
                    </div>
                    <div
                      className={cn(
                        "flex items-center justify-center text-[9px] font-bold text-white transition-all",
                        realResult === "draw" ? "bg-[var(--success)]" : "bg-[var(--foreground-subtle)]"
                      )}
                      style={{ width: `${drawPct}%`, minWidth: drawPct > 0 ? "24px" : "0" }}
                    >
                      {drawPct > 12 ? `${drawPct}%` : ""}
                    </div>
                    <div
                      className={cn(
                        "flex items-center justify-center text-[9px] font-bold text-white transition-all",
                        realResult === "away" ? "bg-[var(--success)]" : "bg-[var(--purple)]/60"
                      )}
                      style={{ width: `${awayWinPct}%`, minWidth: awayWinPct > 0 ? "24px" : "0" }}
                    >
                      {awayWinPct > 12 ? `${awayWinPct}%` : ""}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-[var(--foreground-subtle)]">
                    <span>{homeWinPct}%</span>
                    <span className="text-[var(--foreground-subtle)]">{total} pronos</span>
                    <span>{awayWinPct}%</span>
                  </div>
                </div>

                {/* Predictions list */}
                <div className="border-t border-[var(--border)] flex flex-col gap-0">
                  {preds.map((p) => {
                    const result = p.homeScore > p.awayScore ? "home" : p.homeScore === p.awayScore ? "draw" : "away"
                    const isMe = p.user.id === userId
                    const isExact = match.status === "FINISHED" && match.homeScore === p.homeScore && match.awayScore === p.awayScore
                    const isCorrect = match.status === "FINISHED" && realResult === result && !isExact

                    return (
                      <div
                        key={p.user.id}
                        className={cn(
                          "flex items-center gap-2 py-1.5 px-3",
                          isExact ? "bg-[var(--success-dim)]" : isCorrect ? "bg-[var(--accent-dim)]" : "",
                          isMe && "font-semibold"
                        )}
                      >
                        <FootballAvatar seed={p.user.avatarSeed} size={20} />
                        <span className={cn(
                          "flex-1 text-xs truncate",
                          isMe ? "text-[var(--accent)]" : "text-[var(--foreground)]"
                        )}>
                          {p.user.firstName} {p.user.lastName}
                          {isMe && <span className="text-[9px] ml-1 opacity-60">(moi)</span>}
                        </span>
                        <span className={cn(
                          "text-xs font-bold tabular-nums",
                          isExact ? "text-[var(--success)]" : isCorrect ? "text-[var(--accent)]" : "text-[var(--foreground-muted)]"
                        )}>
                          {p.homeScore} – {p.awayScore}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
