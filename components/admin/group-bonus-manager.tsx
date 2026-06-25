"use client"

import { useState, useTransition } from "react"
import { applyGroupBonusResults } from "@/actions/admin.actions"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { CheckCircle, ChevronDown, ChevronUp } from "lucide-react"

interface GroupTeam {
  code: string
  name: string
  flagEmoji: string | null
  position: number
  points: number
  played: number
}

interface GroupData {
  letter: string
  teams: GroupTeam[]
  allMatchesFinished: boolean
}

interface Props {
  contestId: string
  groups: GroupData[]
  pointsGroupFirst: number
  pointsGroupSecond: number
  initialValidated: Record<string, { firstTeamCode: string; secondTeamCode: string }>
}

function GroupCard({
  contestId,
  group,
  pointsGroupFirst,
  pointsGroupSecond,
  initialFirst,
  initialSecond,
  initialApplied,
}: {
  contestId: string
  group: GroupData
  pointsGroupFirst: number
  pointsGroupSecond: number
  initialFirst: string
  initialSecond: string
  initialApplied: boolean
}) {
  const [open, setOpen] = useState(false)
  const [firstCode, setFirstCode] = useState(initialFirst)
  const [secondCode, setSecondCode] = useState(initialSecond)
  const [applied, setApplied] = useState(initialApplied)
  const [isPending, startTransition] = useTransition()

  const sorted = [...group.teams].sort((a, b) => a.position - b.position)
  const first = sorted.find((t) => t.code === firstCode)
  const second = sorted.find((t) => t.code === secondCode)
  const isComplete = !!firstCode && !!secondCode

  const handleApply = () => {
    if (!firstCode || !secondCode) return
    startTransition(async () => {
      const result = await applyGroupBonusResults({
        contestId,
        letter: group.letter,
        firstTeamCode: firstCode,
        secondTeamCode: secondCode,
      })
      if ("error" in result) {
        toast.error(String(result.error))
      } else {
        toast.success(`Groupe ${group.letter} — points appliqués !`)
        setApplied(true)
        setOpen(false)
      }
    })
  }

  const handleSelectFirst = (code: string) => {
    if (code === secondCode) setSecondCode("")
    setFirstCode(firstCode === code ? "" : code)
    setApplied(false)
  }

  const handleSelectSecond = (code: string) => {
    if (code === firstCode) setFirstCode("")
    setSecondCode(secondCode === code ? "" : code)
    setApplied(false)
  }

  return (
    <div className="surface-card overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-black text-[var(--foreground-muted)] w-5 shrink-0">
            G{group.letter}
          </span>
          {applied ? (
            <div className="flex items-center gap-1.5">
              <span className="text-sm">{first?.flagEmoji}</span>
              <span className="text-xs font-semibold text-[var(--foreground)]">{first?.name}</span>
              <span className="text-[10px] text-[var(--foreground-subtle)]">+</span>
              <span className="text-sm">{second?.flagEmoji}</span>
              <span className="text-xs font-semibold text-[var(--foreground)]">{second?.name}</span>
            </div>
          ) : isComplete ? (
            <div className="flex items-center gap-1.5">
              <span className="text-sm">{first?.flagEmoji}</span>
              <span className="text-xs font-semibold text-[var(--foreground-muted)]">{first?.name}</span>
              <span className="text-[10px] text-[var(--foreground-subtle)]">+</span>
              <span className="text-sm">{second?.flagEmoji}</span>
              <span className="text-xs font-semibold text-[var(--foreground-muted)]">{second?.name}</span>
              <span className="text-[10px] text-[var(--warning)] font-semibold ml-1">non validé</span>
            </div>
          ) : (
            <span className="text-xs text-[var(--foreground-subtle)]">À valider</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {applied && <CheckCircle size={13} className="text-[var(--success)]" />}
          {!group.allMatchesFinished && (
            <span className="text-[10px] text-[var(--warning)]">en cours</span>
          )}
          {open
            ? <ChevronUp size={14} className="text-[var(--foreground-subtle)]" />
            : <ChevronDown size={14} className="text-[var(--foreground-subtle)]" />
          }
        </div>
      </button>

      {open && (
        <div className="border-t border-[var(--border)] px-4 pb-4 flex flex-col gap-3">
          <div className="flex gap-2 pt-3">
            {/* 1er */}
            <div className="flex-1">
              <div className="text-[10px] font-bold text-[var(--accent)] mb-1.5 uppercase tracking-wide text-center">
                1er · +{pointsGroupFirst} pts
              </div>
              <div className="flex flex-col gap-1">
                {sorted.map((team) => (
                  <button
                    key={team.code}
                    onClick={() => handleSelectFirst(team.code)}
                    className={cn(
                      "flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold border transition-all",
                      firstCode === team.code
                        ? "bg-[var(--accent-dim)] border-[var(--accent)]/50 text-[var(--accent)]"
                        : "bg-[var(--surface-elevated)] border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--accent)]/30"
                    )}
                  >
                    <span className="text-base shrink-0">{team.flagEmoji}</span>
                    <span className="truncate flex-1 text-left">{team.name}</span>
                    <span className="text-[10px] opacity-50 shrink-0">{team.points}pts</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2e */}
            <div className="flex-1">
              <div className="text-[10px] font-bold text-[var(--foreground-muted)] mb-1.5 uppercase tracking-wide text-center">
                2e · +{pointsGroupSecond} pts
              </div>
              <div className="flex flex-col gap-1">
                {sorted.map((team) => (
                  <button
                    key={team.code}
                    onClick={() => handleSelectSecond(team.code)}
                    className={cn(
                      "flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold border transition-all",
                      secondCode === team.code
                        ? "bg-[var(--surface-elevated)] border-[var(--foreground-muted)]/60 text-[var(--foreground)]"
                        : "bg-[var(--surface-elevated)] border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--foreground-muted)]/30"
                    )}
                  >
                    <span className="text-base shrink-0">{team.flagEmoji}</span>
                    <span className="truncate flex-1 text-left">{team.name}</span>
                    <span className="text-[10px] opacity-50 shrink-0">{team.points}pts</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {!group.allMatchesFinished && (
            <p className="text-[10px] text-[var(--warning)] text-center">
              ⚠️ Les matchs de ce groupe ne sont pas tous terminés.
            </p>
          )}

          <button
            onClick={handleApply}
            disabled={isPending || !isComplete}
            className={cn(
              "py-2.5 rounded-xl font-bold text-xs transition-all active:scale-95 disabled:opacity-50",
              applied
                ? "bg-[var(--success-dim)] text-[var(--success)] border border-[var(--success)]/30"
                : "gradient-accent text-white hover:opacity-90"
            )}
          >
            {isPending ? (
              <span className="animate-pulse">Application...</span>
            ) : applied ? (
              <span className="flex items-center justify-center gap-1.5">
                <CheckCircle size={13} /> Points appliqués
              </span>
            ) : (
              `Valider le groupe ${group.letter}`
            )}
          </button>
        </div>
      )}
    </div>
  )
}

export function GroupBonusManager({ contestId, groups, pointsGroupFirst, pointsGroupSecond, initialValidated }: Props) {
  const someGroupsUnfinished = groups.some((g) => !g.allMatchesFinished)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2 p-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-xs text-[var(--foreground-muted)]">
        <span className="shrink-0">ℹ️</span>
        <span>
          Valide chaque groupe séparément au fur et à mesure qu&apos;il se termine.
          Le top 2 est pré-rempli depuis les résultats — corrige si besoin avant de valider.
          Tu peux re-valider un groupe pour corriger un choix.
        </span>
      </div>

      {someGroupsUnfinished && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-[var(--warning-dim)] border border-[var(--warning)]/30 text-xs text-[var(--warning)]">
          <span className="shrink-0">⚠️</span>
          <span>Certains groupes ont encore des matchs en cours — leur classement est provisoire.</span>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {groups.map((group) => {
          const validated = initialValidated[group.letter]
          const sorted = [...group.teams].sort((a, b) => a.position - b.position)
          const defaultFirst = validated?.firstTeamCode ?? sorted[0]?.code ?? ""
          const defaultSecond = validated?.secondTeamCode ?? sorted[1]?.code ?? ""
          return (
            <GroupCard
              key={group.letter}
              contestId={contestId}
              group={group}
              pointsGroupFirst={pointsGroupFirst}
              pointsGroupSecond={pointsGroupSecond}
              initialFirst={defaultFirst}
              initialSecond={defaultSecond}
              initialApplied={!!validated}
            />
          )
        })}
      </div>
    </div>
  )
}
