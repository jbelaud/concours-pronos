"use client"

import { useState, useTransition } from "react"
import { assignKnockoutTeam } from "@/actions/admin.actions"
import { formatKickoff, cn } from "@/lib/utils"
import type { MatchWithTeams, Team } from "@/types"
import { toast } from "sonner"
import { CheckCircle } from "lucide-react"

interface KnockoutManagerProps {
  match: MatchWithTeams
  allTeams: Team[]
}

export function KnockoutManager({ match, allTeams }: KnockoutManagerProps) {
  const [homeTeamId, setHomeTeamId] = useState(match.homeTeamId ?? "")
  const [awayTeamId, setAwayTeamId] = useState(match.awayTeamId ?? "")
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(!!match.homeTeamId && !!match.awayTeamId)

  const handleSave = () => {
    startTransition(async () => {
      const result = await assignKnockoutTeam({
        matchId: match.id,
        homeTeamId: homeTeamId || undefined,
        awayTeamId: awayTeamId || undefined,
      })
      if (result && "error" in result) {
        toast.error(String(result.error))
      } else {
        setSaved(true)
        toast.success("Équipes assignées !")
      }
    })
  }

  const teamOptions = allTeams.map((t) => (
    <option key={t.id} value={t.id}>
      {t.flagEmoji} {t.name}
    </option>
  ))

  return (
    <div className={cn("surface-card p-4", saved && "border-[var(--success)]/30")}>
      <div className="text-xs text-[var(--foreground-muted)] mb-3">
        {match.knockoutLabel} · {formatKickoff(match.kickoff)}
        {match.venue && ` · ${match.venue}`}
      </div>

      <div className="flex flex-col gap-2">
        <div>
          <label className="text-xs text-[var(--foreground-muted)] mb-1 block">
            Équipe domicile
          </label>
          <select
            value={homeTeamId}
            onChange={(e) => { setHomeTeamId(e.target.value); setSaved(false) }}
            className="w-full py-2.5 px-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[var(--accent)]"
          >
            <option value="">— Sélectionner une équipe —</option>
            {teamOptions}
          </select>
        </div>

        <div>
          <label className="text-xs text-[var(--foreground-muted)] mb-1 block">
            Équipe extérieur
          </label>
          <select
            value={awayTeamId}
            onChange={(e) => { setAwayTeamId(e.target.value); setSaved(false) }}
            className="w-full py-2.5 px-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[var(--accent)]"
          >
            <option value="">— Sélectionner une équipe —</option>
            {teamOptions}
          </select>
        </div>

        <button
          onClick={handleSave}
          disabled={isPending || (!homeTeamId && !awayTeamId)}
          className={cn(
            "flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 mt-1",
            saved
              ? "bg-[var(--success-dim)] text-[var(--success)] border border-[var(--success)]/30"
              : "gradient-accent text-white hover:opacity-90"
          )}
        >
          {saved ? (
            <>
              <CheckCircle size={15} />
              Assigné
            </>
          ) : isPending ? (
            "Sauvegarde..."
          ) : (
            "Assigner les équipes"
          )}
        </button>
      </div>
    </div>
  )
}
