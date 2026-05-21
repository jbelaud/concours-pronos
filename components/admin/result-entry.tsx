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
  match: MatchWithTeams & { regularTimeHome?: number | null; regularTimeAway?: number | null }
  matchday: number
  knockoutScoringRule?: "REGULAR_TIME" | "FULL_TIME"
  onSaved?: () => void
}

const isKnockoutPhase = (phase: string) => phase !== "GROUP"

export function ResultEntry({ match, matchday, knockoutScoringRule = "REGULAR_TIME", onSaved }: ResultEntryProps) {
  const isKnockout = isKnockoutPhase(match.phase)

  // Convention for knockout results:
  // - homeScore/awayScore = score at 90' (or after ET if no penalties)
  // - regularTimeHome/Away = score at 90' when ET/penalties happened
  // - If draw after ET → penaltyWinner designates who won on penalties
  //   stored as: homeScore > awayScore (home wins) or vice versa,
  //   with regularTimeHome = regularTimeAway = the actual drawn score
  const hasPenalties = !!(
    match.regularTimeHome !== null &&
    match.regularTimeAway !== null &&
    match.homeScore !== match.awayScore
  )
  const initialPenWinner: "home" | "away" | null = hasPenalties
    ? (match.homeScore! > match.awayScore! ? "home" : "away")
    : null

  const [homeScore, setHomeScore] = useState(
    hasPenalties ? (match.regularTimeHome ?? 0) : (match.homeScore ?? 0)
  )
  const [awayScore, setAwayScore] = useState(
    hasPenalties ? (match.regularTimeAway ?? 0) : (match.awayScore ?? 0)
  )
  const [rtHome, setRtHome] = useState(match.regularTimeHome ?? 0)
  const [rtAway, setRtAway] = useState(match.regularTimeAway ?? 0)
  const [hasExtraTime, setHasExtraTime] = useState(
    !!(match.regularTimeHome !== null && match.regularTimeAway !== null)
  )
  const [penaltyWinner, setPenaltyWinner] = useState<"home" | "away" | null>(initialPenWinner)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(match.status === "FINISHED")
  const [dirty, setDirty] = useState(false)

  const markDirty = () => { setSaved(false); setDirty(true) }

  // Whether the current score is a draw (requires penalty winner in knockout)
  const isDrawn = homeScore === awayScore

  const handleSave = () => {
    // In knockout, if draw + penalties: store real score in regularTime, penalty score in homeScore/awayScore
    let finalHome = homeScore
    let finalAway = awayScore
    let finalRtHome: number | undefined = undefined
    let finalRtAway: number | undefined = undefined

    if (isKnockout && hasExtraTime) {
      finalRtHome = homeScore
      finalRtAway = awayScore
      if (isDrawn && penaltyWinner) {
        // Encode penalty winner: store a 1-0 or 0-1 on top of the regularTime score
        finalHome = homeScore + (penaltyWinner === "home" ? 1 : 0)
        finalAway = awayScore + (penaltyWinner === "away" ? 1 : 0)
      } else {
        finalHome = homeScore
        finalAway = awayScore
      }
    }

    startTransition(async () => {
      const result = await saveMatchResult({
        matchId: match.id,
        homeScore: finalHome,
        awayScore: finalAway,
        regularTimeHome: finalRtHome,
        regularTimeAway: finalRtAway,
        matchday,
      })

      if (result && "error" in result) {
        toast.error(String(result.error))
      } else {
        setSaved(true)
        setDirty(false)
        toast.success(`Résultat enregistré : ${homeScore}–${awayScore}`)
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

      {/* Teams & score entry — Score final */}
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
              {hasExtraTime ? "Score 90'" : "Score (90')"}
            </span>
          )}
          <div className="flex items-center gap-1">
            <ScoreStepper value={homeScore} onChange={(v) => { setHomeScore(v); setPenaltyWinner(null); markDirty() }} disabled={isPending || hasExtraTime} />
            <span className="text-[var(--foreground-muted)] font-bold text-xl mx-1">–</span>
            <ScoreStepper value={awayScore} onChange={(v) => { setAwayScore(v); setPenaltyWinner(null); markDirty() }} disabled={isPending || hasExtraTime} />
          </div>
          {hasExtraTime && isDrawn && penaltyWinner && (
            <span className="text-[10px] text-[var(--success)] font-semibold mt-0.5">
              T.A.B. → {penaltyWinner === "home" ? (match.homeTeam?.name ?? "Dom.") : (match.awayTeam?.name ?? "Ext.")}
            </span>
          )}
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
            onClick={() => { setHasExtraTime(!hasExtraTime); setPenaltyWinner(null); markDirty() }}
            className={cn(
              "flex items-center gap-2 text-xs font-semibold py-1.5 px-3 rounded-lg transition-all",
              hasExtraTime
                ? "bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--accent)]/30"
                : "bg-[var(--surface-elevated)] text-[var(--foreground-muted)] border border-[var(--border)]"
            )}
          >
            ⏱️ {hasExtraTime ? "Prolongations / T.A.B. activés" : "Match nul → Prolongations / T.A.B. ?"}
          </button>

          {hasExtraTime && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="flex flex-col gap-2 p-3 bg-[var(--surface-elevated)] rounded-xl border border-[var(--border)]"
            >
              <p className="text-[10px] text-[var(--foreground-muted)] flex items-center gap-1">
                <Info size={10} />
                Score à 90&apos; (avant prolongations)
                {knockoutScoringRule === "REGULAR_TIME" && (
                  <span className="text-[var(--accent)] ml-1">· Utilisé pour les pronostics</span>
                )}
              </p>
              <div className="flex items-center gap-2 justify-center">
                <ScoreStepper value={homeScore} onChange={(v) => { setHomeScore(v); setPenaltyWinner(null); markDirty() }} disabled={isPending} />
                <span className="text-[var(--foreground-muted)] font-bold text-xl mx-1">–</span>
                <ScoreStepper value={awayScore} onChange={(v) => { setAwayScore(v); setPenaltyWinner(null); markDirty() }} disabled={isPending} />
              </div>

              {/* Sélecteur T.A.B. — visible uniquement si score nul après prolongations */}
              {isDrawn && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col gap-1.5"
                >
                  <p className="text-[10px] text-[var(--warning)] font-semibold flex items-center gap-1">
                    🎯 Match nul — Vainqueur aux tirs au but
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
            </motion.div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 mt-4">
        {saved && !dirty ? (
          /* Match déjà enregistré — afficher état + bouton corriger */
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
            disabled={isPending}
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
