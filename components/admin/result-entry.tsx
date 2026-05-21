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

  const [homeScore, setHomeScore] = useState(match.homeScore ?? 0)
  const [awayScore, setAwayScore] = useState(match.awayScore ?? 0)
  const [rtHome, setRtHome] = useState(match.regularTimeHome ?? 0)
  const [rtAway, setRtAway] = useState(match.regularTimeAway ?? 0)
  const [hasExtraTime, setHasExtraTime] = useState(
    !!(match.regularTimeHome !== null && match.regularTimeAway !== null)
  )
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(match.status === "FINISHED")
  const [dirty, setDirty] = useState(false)

  const markDirty = () => { setSaved(false); setDirty(true) }

  const handleSave = () => {
    startTransition(async () => {
      const result = await saveMatchResult({
        matchId: match.id,
        homeScore,
        awayScore,
        regularTimeHome: isKnockout && hasExtraTime ? rtHome : undefined,
        regularTimeAway: isKnockout && hasExtraTime ? rtAway : undefined,
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
              {hasExtraTime ? "Score final" : "Score (90')"}
            </span>
          )}
          <div className="flex items-center gap-1">
            <ScoreStepper value={homeScore} onChange={(v) => { setHomeScore(v); markDirty() }} disabled={isPending} />
            <span className="text-[var(--foreground-muted)] font-bold text-xl mx-1">–</span>
            <ScoreStepper value={awayScore} onChange={(v) => { setAwayScore(v); markDirty() }} disabled={isPending} />
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
            onClick={() => { setHasExtraTime(!hasExtraTime); markDirty() }}
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
                <ScoreStepper value={rtHome} onChange={(v) => { setRtHome(v); markDirty() }} disabled={isPending} />
                <span className="text-[var(--foreground-muted)] font-bold text-xl mx-1">–</span>
                <ScoreStepper value={rtAway} onChange={(v) => { setRtAway(v); markDirty() }} disabled={isPending} />
              </div>
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
