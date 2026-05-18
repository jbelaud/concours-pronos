"use client"

import { useState, useTransition } from "react"
import { motion } from "framer-motion"
import { CheckCircle, ChevronRight } from "lucide-react"
import { ScoreStepper } from "@/components/predictions/score-stepper"
import { saveMatchResult } from "@/actions/admin.actions"
import { formatKickoff, cn } from "@/lib/utils"
import type { MatchWithTeams } from "@/types"
import { toast } from "sonner"

interface ResultEntryProps {
  match: MatchWithTeams
  matchday: number
  onSaved?: () => void
}

export function ResultEntry({ match, matchday, onSaved }: ResultEntryProps) {
  const [homeScore, setHomeScore] = useState(match.homeScore ?? 0)
  const [awayScore, setAwayScore] = useState(match.awayScore ?? 0)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(match.status === "FINISHED")

  const handleSave = () => {
    startTransition(async () => {
      const result = await saveMatchResult({
        matchId: match.id,
        homeScore,
        awayScore,
        matchday,
      })

      if (result && "error" in result) {
        toast.error(String(result.error))
      } else {
        setSaved(true)
        toast.success(`Résultat enregistré : ${homeScore}–${awayScore}`)
        onSaved?.()
      }
    })
  }

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

      {/* Teams & score entry */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex flex-col items-center gap-1">
          <span className="text-2xl">{match.homeTeam?.flagEmoji ?? "🏳️"}</span>
          <span className="text-xs font-bold text-center truncate max-w-[72px]">
            {match.homeTeam?.name ?? "À définir"}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <ScoreStepper value={homeScore} onChange={setHomeScore} disabled={isPending} />
          <span className="text-[var(--foreground-muted)] font-bold text-xl mx-1">–</span>
          <ScoreStepper value={awayScore} onChange={setAwayScore} disabled={isPending} />
        </div>

        <div className="flex-1 flex flex-col items-center gap-1">
          <span className="text-2xl">{match.awayTeam?.flagEmoji ?? "🏳️"}</span>
          <span className="text-xs font-bold text-center truncate max-w-[72px]">
            {match.awayTeam?.name ?? "À définir"}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={handleSave}
          disabled={isPending}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all",
            saved
              ? "bg-[var(--success-dim)] text-[var(--success)] border border-[var(--success)]/30"
              : "bg-[var(--accent)] text-[var(--background)] hover:opacity-90 active:scale-95"
          )}
        >
          {saved ? (
            <>
              <CheckCircle size={15} />
              Enregistré
            </>
          ) : isPending ? (
            <span className="animate-pulse">Sauvegarde...</span>
          ) : (
            "Enregistrer"
          )}
        </button>

        {onSaved && (
          <button
            onClick={() => {
              if (!saved) handleSave()
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
