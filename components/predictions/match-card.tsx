"use client"

import { useState, useTransition, useCallback } from "react"
import { motion } from "framer-motion"
import { Lock, CheckCircle, AlertCircle } from "lucide-react"
import { ScoreStepper } from "./score-stepper"
import { upsertPrediction } from "@/actions/predictions.actions"
import { formatKickoff, formatTime, isMatchLocked, cn, parseKnockoutLabel } from "@/lib/utils"
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

  // For knockout matches without teams yet, show descriptive slot labels
  const knockoutSlots = !match.homeTeamId ? parseKnockoutLabel(match.knockoutLabel ?? null) : null

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
      className={cn("surface-card p-3 select-none transition-colors", cardBg)}
    >
      {/* Header : phase + heure + statut sauvegarde */}
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[11px] text-[var(--foreground-muted)]">
          {match.groupLetter ? `Groupe ${match.groupLetter} · ` : ""}
          {formatKickoff(match.kickoff, "EEE d MMM")} · {formatTime(match.kickoff)}
        </span>
        <div className="flex items-center gap-1">
          {isPending && <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />}
          {!isPending && !locked && !saved && (
            <span className="w-2 h-2 rounded-full bg-[var(--error)] animate-pulse" title="Pronostic manquant" />
          )}
          {saved && !isPending && !locked && <CheckCircle size={13} className="text-[var(--success)]" />}
          {locked && <Lock size={12} className="text-[var(--foreground-subtle)]" />}
        </div>
      </div>

      {/* Corps : équipe — stepper — séparateur — stepper — équipe */}
      <div className="flex items-center gap-2">

        {/* Équipe domicile */}
        <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <span className="text-2xl leading-none">{match.homeTeam?.flagEmoji ?? "🏆"}</span>
          <span className={`text-[11px] font-semibold text-center leading-tight w-full truncate px-1 ${match.homeTeam ? "text-[var(--foreground)]" : "text-[var(--foreground-muted)]"}`}>
            {match.homeTeam?.name ?? knockoutSlots?.[0] ?? "?"}
          </span>
        </div>

        {/* Zone scores */}
        {finished && match.homeScore !== null ? (
          /* Match terminé : score réel + pronostic en dessous */
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex flex-col items-center">
              <span className="text-3xl font-black text-[var(--foreground)] leading-none">{match.homeScore}</span>
              <span className="text-[10px] text-[var(--foreground-muted)] mt-0.5">({homeScore})</span>
            </div>
            <span className="text-[var(--foreground-muted)] text-xl font-bold">–</span>
            <div className="flex flex-col items-center">
              <span className="text-3xl font-black text-[var(--foreground)] leading-none">{match.awayScore}</span>
              <span className="text-[10px] text-[var(--foreground-muted)] mt-0.5">({awayScore})</span>
            </div>
          </div>
        ) : (
          /* Match à venir : steppers verticaux */
          <div className="flex items-center gap-1.5 shrink-0">
            <ScoreStepper
              value={homeScore}
              onChange={(v) => {
                setHomeScore(v)
                setSaved(false)
                handleScoreChange(v, awayScore)
              }}
              disabled={locked}
            />
            <span className="text-[var(--foreground-subtle)] font-bold text-base px-0.5">–</span>
            <ScoreStepper
              value={awayScore}
              onChange={(v) => {
                setAwayScore(v)
                setSaved(false)
                handleScoreChange(homeScore, v)
              }}
              disabled={locked}
            />
          </div>
        )}

        {/* Équipe extérieur */}
        <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <span className="text-2xl leading-none">{match.awayTeam?.flagEmoji ?? "🏆"}</span>
          <span className={`text-[11px] font-semibold text-center leading-tight w-full truncate px-1 ${match.awayTeam ? "text-[var(--foreground)]" : "text-[var(--foreground-muted)]"}`}>
            {match.awayTeam?.name ?? knockoutSlots?.[1] ?? "?"}
          </span>
        </div>

      </div>

      {/* Résultat du pronostic */}
      {finished && predictionStatus && predictionStatus !== "PENDING" && (
        <div className={cn("flex items-center justify-center gap-1 mt-2 text-[11px] font-semibold", statusColor)}>
          {predictionStatus === "EXACT_SCORE" && (
            <><CheckCircle size={11} /> Score exact · +{match.prediction?.points ?? 0} pts</>
          )}
          {predictionStatus === "CORRECT_RESULT" && (
            <><CheckCircle size={11} /> Résultat correct · +{match.prediction?.points ?? 0} pts</>
          )}
          {predictionStatus === "WRONG" && (
            <><AlertCircle size={11} /> Raté · 0 pt</>
          )}
        </div>
      )}
      {finished && predictionStatus === "PENDING" && (
        <div className="text-center mt-2 text-[11px] text-[var(--foreground-subtle)]">En attente du résultat</div>
      )}
      {locked && !finished && (
        <div className="text-center mt-2 text-[11px] text-[var(--foreground-subtle)]">Match en cours ou terminé</div>
      )}
    </motion.div>
  )
}
