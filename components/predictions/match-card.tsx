"use client"

import { useState, useTransition, useCallback } from "react"
import { motion } from "framer-motion"
import { Lock, CheckCircle, AlertCircle } from "lucide-react"
import { ScoreStepper } from "./score-stepper"
import { upsertPrediction } from "@/actions/predictions.actions"
import { formatKickoff, formatTime, isMatchLocked, cn } from "@/lib/utils"
import type { MatchWithPrediction } from "@/types"
import { toast } from "sonner"

interface MatchCardProps {
  match: MatchWithPrediction
  contestId: string
  initialHomeScore?: number
  initialAwayScore?: number
}

export function MatchCard({
  match,
  contestId,
  initialHomeScore,
  initialAwayScore,
}: MatchCardProps) {
  const locked = isMatchLocked(match.kickoff)
  const finished = match.status === "FINISHED"

  const [homeScore, setHomeScore] = useState(
    initialHomeScore ?? match.prediction?.homeScore ?? 0
  )
  const [awayScore, setAwayScore] = useState(
    initialAwayScore ?? match.prediction?.awayScore ?? 0
  )
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(!!match.prediction)
  const [saveTimer, setSaveTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  const save = useCallback(
    (h: number, a: number) => {
      if (locked) return
      startTransition(async () => {
        const result = await upsertPrediction({
          matchId: match.id,
          contestId,
          homeScore: h,
          awayScore: a,
        })
        if (result?.error) {
          toast.error(result.error)
        } else {
          setSaved(true)
        }
      })
    },
    [match.id, contestId, locked]
  )

  const handleScoreChange = useCallback(
    (home: number, away: number) => {
      if (saveTimer) clearTimeout(saveTimer)
      const t = setTimeout(() => save(home, away), 600)
      setSaveTimer(t)
    },
    [save, saveTimer]
  )

  const predictionStatus = match.prediction?.status

  const statusColor = {
    EXACT_SCORE: "text-[var(--success)]",
    CORRECT_RESULT: "text-[var(--accent)]",
    WRONG: "text-[var(--error)]",
    PENDING: "text-[var(--foreground-muted)]",
  }[predictionStatus ?? "PENDING"]

  const cardBg = finished
    ? predictionStatus === "EXACT_SCORE"
      ? "border-[var(--success)]/30 bg-[var(--success-dim)]"
      : predictionStatus === "CORRECT_RESULT"
        ? "border-[var(--accent)]/30 bg-[var(--accent-dim)]"
        : predictionStatus === "WRONG"
          ? "border-[var(--error)]/30 bg-[var(--error-dim)]"
          : ""
    : ""

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "surface-card p-4 select-none transition-colors",
        cardBg
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-[var(--foreground-muted)]">
          {match.groupLetter ? `Groupe ${match.groupLetter} · ` : ""}
          {formatKickoff(match.kickoff, "EEE d MMM")}
          {" · "}
          {formatTime(match.kickoff)}
        </span>

        <div className="flex items-center gap-1">
          {isPending && (
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
          )}
          {saved && !isPending && !locked && (
            <CheckCircle size={14} className="text-[var(--success)]" />
          )}
          {locked && <Lock size={13} className="text-[var(--foreground-subtle)]" />}
        </div>
      </div>

      {/* Teams & Scores */}
      <div className="flex items-center gap-2">
        {/* Home team */}
        <div className="flex-1 flex flex-col items-center gap-1">
          <span className="text-2xl">{match.homeTeam?.flagEmoji ?? "🏳️"}</span>
          <span className="text-xs font-semibold text-[var(--foreground)] text-center leading-tight max-w-[72px] truncate">
            {match.homeTeam?.name ?? "À définir"}
          </span>
        </div>

        {/* Score steppers / result */}
        <div className="flex items-center gap-1">
          {finished && match.homeScore !== null ? (
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-center">
                <span className="text-3xl font-black text-[var(--foreground)]">
                  {match.homeScore}
                </span>
                <span className="text-xs text-[var(--foreground-muted)]">
                  {homeScore}
                </span>
              </div>
              <span className="text-[var(--foreground-muted)] text-xl font-bold">-</span>
              <div className="flex flex-col items-center">
                <span className="text-3xl font-black text-[var(--foreground)]">
                  {match.awayScore}
                </span>
                <span className="text-xs text-[var(--foreground-muted)]">
                  {awayScore}
                </span>
              </div>
            </div>
          ) : (
            <>
              <ScoreStepper
                value={homeScore}
                onChange={(v) => {
                  setHomeScore(v)
                  setSaved(false)
                  handleScoreChange(v, awayScore)
                }}
                disabled={locked}
              />
              <span className="text-[var(--foreground-muted)] font-bold text-lg mx-1">-</span>
              <ScoreStepper
                value={awayScore}
                onChange={(v) => {
                  setAwayScore(v)
                  setSaved(false)
                  handleScoreChange(homeScore, v)
                }}
                disabled={locked}
              />
            </>
          )}
        </div>

        {/* Away team */}
        <div className="flex-1 flex flex-col items-center gap-1">
          <span className="text-2xl">{match.awayTeam?.flagEmoji ?? "🏳️"}</span>
          <span className="text-xs font-semibold text-[var(--foreground)] text-center leading-tight max-w-[72px] truncate">
            {match.awayTeam?.name ?? "À définir"}
          </span>
        </div>
      </div>

      {/* Points row (when finished) */}
      {finished && predictionStatus && (
        <div className={cn("flex items-center justify-center gap-1 mt-2 text-xs font-semibold", statusColor)}>
          {predictionStatus === "EXACT_SCORE" && (
            <>
              <CheckCircle size={12} />
              Score exact · +{match.prediction?.points ?? 0} pts
            </>
          )}
          {predictionStatus === "CORRECT_RESULT" && (
            <>
              <CheckCircle size={12} />
              Résultat correct · +{match.prediction?.points ?? 0} pts
            </>
          )}
          {predictionStatus === "WRONG" && (
            <>
              <AlertCircle size={12} />
              Raté · 0 pt
            </>
          )}
          {predictionStatus === "PENDING" && (
            <span className="text-[var(--foreground-muted)]">En attente du résultat</span>
          )}
        </div>
      )}

      {/* Locked without result */}
      {locked && !finished && (
        <div className="text-center mt-2 text-xs text-[var(--foreground-subtle)]">
          Match en cours ou terminé
        </div>
      )}
    </motion.div>
  )
}
