"use client"

import { useState, useTransition } from "react"
import { motion } from "framer-motion"
import { CheckCircle, ChevronRight, Info } from "lucide-react"
import { ScoreStepper } from "@/components/predictions/score-stepper"
import { saveMatchResult } from "@/actions/admin.actions"
import { formatKickoff, cn, parseKnockoutLabel } from "@/lib/utils"
import type { MatchWithTeams } from "@/types"
import { toast } from "sonner"

interface ResultEntryProps {
  match: MatchWithTeams & {
    regularTimeHome?: number | null
    regularTimeAway?: number | null
    extraTimeHome?: number | null
    extraTimeAway?: number | null
  }
  matchday: number
  knockoutScoringRule?: "REGULAR_TIME" | "FULL_TIME"
  onSaved?: () => void
}

const isKnockoutPhase = (phase: string) => phase !== "GROUP"

export function ResultEntry({ match, matchday, knockoutScoringRule = "REGULAR_TIME", onSaved }: ResultEntryProps) {
  const isKnockout = isKnockoutPhase(match.phase)

  // Detect existing state from DB
  const hasExtraTimeInDb = match.regularTimeHome !== null && match.regularTimeAway !== null
  const hasPenaltiesInDb = hasExtraTimeInDb && match.homeScore !== match.awayScore

  // rtScore = score à 90' (champ principal hors extra-time, ou regularTime si extra-time)
  const initialRtHome = hasExtraTimeInDb ? (match.regularTimeHome ?? 0) : (match.homeScore ?? 0)
  const initialRtAway = hasExtraTimeInDb ? (match.regularTimeAway ?? 0) : (match.awayScore ?? 0)
  // etScore = score à 120' (extraTime)
  const initialEtHome = match.extraTimeHome ?? initialRtHome
  const initialEtAway = match.extraTimeAway ?? initialRtAway
  const initialPenWinner: "home" | "away" | null = hasPenaltiesInDb
    ? (match.homeScore! > match.awayScore! ? "home" : "away")
    : null

  const [rtHome, setRtHome] = useState(initialRtHome)
  const [rtAway, setRtAway] = useState(initialRtAway)
  const [etHome, setEtHome] = useState(initialEtHome)
  const [etAway, setEtAway] = useState(initialEtAway)
  const [hasExtraTime, setHasExtraTime] = useState(hasExtraTimeInDb)
  const [penaltyWinner, setPenaltyWinner] = useState<"home" | "away" | null>(initialPenWinner)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(match.status === "FINISHED")
  const [dirty, setDirty] = useState(false)

  const markDirty = () => { setSaved(false); setDirty(true) }

  // Score affiché dans la zone principale = rt si pas d'extra-time, sinon on affiche rt dans le panneau
  const isDrawnAfterET = hasExtraTime && etHome === etAway

  const handleSave = () => {
    let finalHome: number
    let finalAway: number
    let finalRtHome: number | undefined
    let finalRtAway: number | undefined
    let finalEtHome: number | undefined
    let finalEtAway: number | undefined

    if (isKnockout && hasExtraTime) {
      finalRtHome = rtHome
      finalRtAway = rtAway
      finalEtHome = etHome
      finalEtAway = etAway
      if (isDrawnAfterET && penaltyWinner) {
        // Encode penalty winner: vainqueur TAB = score 120' + 1
        finalHome = etHome + (penaltyWinner === "home" ? 1 : 0)
        finalAway = etAway + (penaltyWinner === "away" ? 1 : 0)
      } else {
        // Victoire nette en prolongation
        finalHome = etHome
        finalAway = etAway
      }
    } else {
      finalHome = rtHome
      finalAway = rtAway
    }

    startTransition(async () => {
      const result = await saveMatchResult({
        matchId: match.id,
        homeScore: finalHome,
        awayScore: finalAway,
        regularTimeHome: finalRtHome,
        regularTimeAway: finalRtAway,
        extraTimeHome: finalEtHome,
        extraTimeAway: finalEtAway,
        matchday,
      })

      if (result && "error" in result) {
        toast.error(String(result.error))
      } else {
        setSaved(true)
        setDirty(false)
        const scoreLabel = hasExtraTime
          ? `${rtHome}–${rtAway} (90') · ${etHome}–${etAway} (120')${isDrawnAfterET && penaltyWinner ? ` · T.A.B. ${penaltyWinner === "home" ? match.homeTeam?.name : match.awayTeam?.name}` : ""}`
          : `${rtHome}–${rtAway}`
        toast.success(`Résultat enregistré : ${scoreLabel}`)
        onSaved?.()
      }
    })
  }

  const knockoutSlots = !match.homeTeamId ? parseKnockoutLabel(match.knockoutLabel ?? null) : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "surface-card p-4",
        saved && "border-[var(--success)]/30 bg-[var(--success-dim)]"
      )}
    >
      {/* Match info */}
      <div className="text-xs text-[var(--foreground-muted)] mb-3">
        {match.groupLetter ? `Groupe ${match.groupLetter} · ` : match.knockoutLabel ? `${match.knockoutLabel} · ` : ""}
        {formatKickoff(match.kickoff)}
      </div>

      {/* Score à 90' — toujours visible */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex flex-col items-center gap-1">
          <span className="text-2xl">{match.homeTeam?.flagEmoji ?? "🏆"}</span>
          <span className={`text-xs font-bold text-center truncate max-w-[72px] ${!match.homeTeam ? "text-[var(--foreground-muted)]" : ""}`}>
            {match.homeTeam?.name ?? knockoutSlots?.[0] ?? "?"}
          </span>
        </div>

        <div className="flex flex-col items-center gap-1">
          {isKnockout && (
            <span className="text-[10px] text-[var(--foreground-subtle)] mb-1">
              Score 90&apos;
              {knockoutScoringRule === "REGULAR_TIME" && (
                <span className="text-[var(--accent)] ml-1">· pronostics</span>
              )}
            </span>
          )}
          <div className="flex items-center gap-1">
            <ScoreStepper value={rtHome} onChange={(v) => { setRtHome(v); markDirty() }} disabled={isPending} />
            <span className="text-[var(--foreground-muted)] font-bold text-xl mx-1">–</span>
            <ScoreStepper value={rtAway} onChange={(v) => { setRtAway(v); markDirty() }} disabled={isPending} />
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center gap-1">
          <span className="text-2xl">{match.awayTeam?.flagEmoji ?? "🏆"}</span>
          <span className={`text-xs font-bold text-center truncate max-w-[72px] ${!match.awayTeam ? "text-[var(--foreground-muted)]" : ""}`}>
            {match.awayTeam?.name ?? knockoutSlots?.[1] ?? "?"}
          </span>
        </div>
      </div>

      {/* Toggle prolongations (knockout uniquement) */}
      {isKnockout && (
        <div className="mt-3 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              const next = !hasExtraTime
              setHasExtraTime(next)
              if (next) {
                // Initialise le score 120' au score 90'
                setEtHome(rtHome)
                setEtAway(rtAway)
              }
              setPenaltyWinner(null)
              markDirty()
            }}
            className={cn(
              "flex items-center gap-2 text-xs font-semibold py-1.5 px-3 rounded-lg transition-all",
              hasExtraTime
                ? "bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--accent)]/30"
                : "bg-[var(--surface-elevated)] text-[var(--foreground-muted)] border border-[var(--border)]"
            )}
          >
            ⏱️ {hasExtraTime ? "Prolongations activées" : "Match nul → Prolongations ?"}
          </button>

          {hasExtraTime && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="flex flex-col gap-3 p-3 bg-[var(--surface-elevated)] rounded-xl border border-[var(--border)]"
            >
              {/* Score à 120' */}
              <div className="flex flex-col gap-1.5">
                <p className="text-[10px] text-[var(--foreground-muted)] flex items-center gap-1">
                  <Info size={10} />
                  Score à 120&apos; (après prolongations)
                </p>
                <div className="flex items-center gap-2 justify-center">
                  <ScoreStepper
                    value={etHome}
                    onChange={(v) => { setEtHome(v); setPenaltyWinner(null); markDirty() }}
                    disabled={isPending}
                    min={rtHome}
                  />
                  <span className="text-[var(--foreground-muted)] font-bold text-xl mx-1">–</span>
                  <ScoreStepper
                    value={etAway}
                    onChange={(v) => { setEtAway(v); setPenaltyWinner(null); markDirty() }}
                    disabled={isPending}
                    min={rtAway}
                  />
                </div>
              </div>

              {/* T.A.B. uniquement si encore nul à 120' */}
              {isDrawnAfterET && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col gap-1.5"
                >
                  <p className="text-[10px] text-[var(--warning)] font-semibold flex items-center gap-1">
                    🎯 Encore nul — Vainqueur aux tirs au but
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setPenaltyWinner("home"); markDirty() }}
                      className={cn(
                        "flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all border",
                        penaltyWinner === "home"
                          ? "bg-[var(--success)] text-white border-transparent"
                          : "bg-[var(--surface)] text-[var(--foreground-muted)] border-[var(--border)] hover:border-[var(--accent)]/40"
                      )}
                    >
                      {match.homeTeam?.flagEmoji ?? "🏠"} {match.homeTeam?.name ?? "Domicile"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setPenaltyWinner("away"); markDirty() }}
                      className={cn(
                        "flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all border",
                        penaltyWinner === "away"
                          ? "bg-[var(--success)] text-white border-transparent"
                          : "bg-[var(--surface)] text-[var(--foreground-muted)] border-[var(--border)] hover:border-[var(--accent)]/40"
                      )}
                    >
                      {match.awayTeam?.flagEmoji ?? "✈️"} {match.awayTeam?.name ?? "Extérieur"}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Résumé vainqueur si victoire nette en prolongation */}
              {!isDrawnAfterET && (etHome !== rtHome || etAway !== rtAway) && (
                <p className="text-[10px] text-[var(--success)] font-semibold">
                  ✅ Victoire {etHome > etAway ? (match.homeTeam?.name ?? "Domicile") : (match.awayTeam?.name ?? "Extérieur")} en prolongation
                </p>
              )}
            </motion.div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 mt-4">
        {saved && !dirty ? (
          <div className="flex-1 flex items-center gap-2">
            <div className="flex items-center gap-2 py-2.5 px-3 rounded-xl bg-[var(--success-dim)] text-[var(--success)] border border-[var(--success)]/30 text-sm font-semibold flex-1">
              <CheckCircle size={15} />
              Enregistré
            </div>
            <button
              onClick={markDirty}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold bg-[var(--surface-elevated)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] border border-[var(--border)] transition-all shrink-0"
            >
              ✏️ Corriger
            </button>
          </div>
        ) : (
          <button
            onClick={handleSave}
            disabled={isPending || (isKnockout && hasExtraTime && isDrawnAfterET && !penaltyWinner)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-[var(--accent)] text-[var(--background)] hover:opacity-90 active:scale-95 disabled:opacity-70 transition-all"
          >
            {isPending ? <span className="animate-pulse">Sauvegarde...</span> : dirty ? "✅ Enregistrer la correction" : "Enregistrer"}
          </button>
        )}

        {onSaved && (
          <button
            onClick={() => {
              if (dirty) handleSave()
              onSaved()
            }}
            disabled={isPending}
            className="flex items-center gap-1 px-3 py-2.5 rounded-xl text-sm font-semibold bg-[var(--surface-elevated)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] border border-[var(--border)] transition-all"
          >
            Suivant
            <ChevronRight size={14} />
          </button>
        )}
      </div>
    </motion.div>
  )
}
