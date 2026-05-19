"use client"

import { useMemo } from "react"
import { FootballAvatar } from "@/components/shared/football-avatar"
import { cn } from "@/lib/utils"
import type { MatchWithPrediction } from "@/types"

interface CommunityPrediction {
  matchId: string
  homeScore: number
  awayScore: number
  user: { id: string; firstName: string; lastName: string; avatarSeed: string }
}

interface Props {
  match: MatchWithPrediction
  predictions: CommunityPrediction[]
}

export function CommunityMatchStats({ match, predictions }: Props) {
  const stats = useMemo(() => {
    const total = predictions.length
    if (total === 0) return null

    let homeWin = 0, draw = 0, awayWin = 0
    for (const p of predictions) {
      if (p.homeScore > p.awayScore) homeWin++
      else if (p.homeScore === p.awayScore) draw++
      else awayWin++
    }

    return {
      total,
      homeWinPct: Math.round((homeWin / total) * 100),
      drawPct: Math.round((draw / total) * 100),
      awayWinPct: Math.round((awayWin / total) * 100),
    }
  }, [predictions])

  if (!stats) return null

  // Déterminer le résultat réel si match terminé
  const realResult = match.status === "FINISHED" && match.homeScore !== null && match.awayScore !== null
    ? match.homeScore > match.awayScore ? "home" : match.homeScore === match.awayScore ? "draw" : "away"
    : null

  return (
    <div className="surface-card rounded-t-none border-t-0 p-3 flex flex-col gap-3">
      {/* Barre de distribution */}
      <div>
        <div className="flex items-center justify-between text-[10px] text-[var(--foreground-muted)] mb-1.5">
          <span className="font-semibold">{match.homeTeam?.name}</span>
          <span>Nul</span>
          <span className="font-semibold">{match.awayTeam?.name}</span>
        </div>
        <div className="flex rounded-lg overflow-hidden h-5 gap-px">
          <div
            className={cn(
              "flex items-center justify-center text-[10px] font-bold text-white transition-all",
              realResult === "home" ? "bg-[var(--success)]" : "bg-[var(--accent)]/60"
            )}
            style={{ width: `${stats.homeWinPct}%`, minWidth: stats.homeWinPct > 0 ? "28px" : "0" }}
          >
            {stats.homeWinPct > 10 ? `${stats.homeWinPct}%` : ""}
          </div>
          <div
            className={cn(
              "flex items-center justify-center text-[10px] font-bold text-white transition-all",
              realResult === "draw" ? "bg-[var(--success)]" : "bg-[var(--foreground-subtle)]"
            )}
            style={{ width: `${stats.drawPct}%`, minWidth: stats.drawPct > 0 ? "28px" : "0" }}
          >
            {stats.drawPct > 10 ? `${stats.drawPct}%` : ""}
          </div>
          <div
            className={cn(
              "flex items-center justify-center text-[10px] font-bold text-white transition-all",
              realResult === "away" ? "bg-[var(--success)]" : "bg-[var(--purple)]/60"
            )}
            style={{ width: `${stats.awayWinPct}%`, minWidth: stats.awayWinPct > 0 ? "28px" : "0" }}
          >
            {stats.awayWinPct > 10 ? `${stats.awayWinPct}%` : ""}
          </div>
        </div>
        <div className="flex items-center justify-between text-[10px] text-[var(--foreground-subtle)] mt-1">
          <span>{stats.homeWinPct}%</span>
          <span>{stats.drawPct}%</span>
          <span>{stats.awayWinPct}%</span>
        </div>
      </div>

      {/* Liste des pronostics */}
      <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
        {predictions.map((p) => {
          const result = p.homeScore > p.awayScore ? "home" : p.homeScore === p.awayScore ? "draw" : "away"
          const isExact = match.status === "FINISHED" && match.homeScore === p.homeScore && match.awayScore === p.awayScore
          const isCorrect = match.status === "FINISHED" && realResult === result && !isExact

          return (
            <div
              key={p.user.id}
              className={cn(
                "flex items-center gap-2 py-1 px-2 rounded-lg",
                isExact ? "bg-[var(--success-dim)]" : isCorrect ? "bg-[var(--accent-dim)]" : "bg-[var(--surface-elevated)]"
              )}
            >
              <FootballAvatar seed={p.user.avatarSeed} size={22} />
              <span className="flex-1 text-xs text-[var(--foreground)] truncate">
                {p.user.firstName} {p.user.lastName}
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
}
