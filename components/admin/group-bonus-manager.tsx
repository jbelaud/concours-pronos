"use client"

import { useState, useTransition } from "react"
import { applyGroupBonusResults } from "@/actions/admin.actions"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { CheckCircle, ChevronDown, ChevronUp, Users } from "lucide-react"

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
}

function GroupCard({
  group,
  firstCode,
  secondCode,
  onSetFirst,
  onSetSecond,
  pointsGroupFirst,
  pointsGroupSecond,
}: {
  group: GroupData
  firstCode: string
  secondCode: string
  onSetFirst: (code: string) => void
  onSetSecond: (code: string) => void
  pointsGroupFirst: number
  pointsGroupSecond: number
}) {
  const [open, setOpen] = useState(false)
  const sorted = [...group.teams].sort((a, b) => a.position - b.position)
  const first = sorted.find((t) => t.code === firstCode)
  const second = sorted.find((t) => t.code === secondCode)

  const isComplete = firstCode && secondCode

  return (
    <div className="surface-card overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-[var(--foreground-muted)] w-5">G{group.letter}</span>
          {isComplete ? (
            <div className="flex items-center gap-1.5">
              <span className="text-sm">{first?.flagEmoji}</span>
              <span className="text-xs font-semibold text-[var(--foreground)]">{first?.name}</span>
              <span className="text-[10px] text-[var(--foreground-subtle)]">+</span>
              <span className="text-sm">{second?.flagEmoji}</span>
              <span className="text-xs font-semibold text-[var(--foreground)]">{second?.name}</span>
            </div>
          ) : (
            <span className="text-xs text-[var(--foreground-muted)]">À valider</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isComplete && <CheckCircle size={13} className="text-[var(--success)]" />}
          {open ? <ChevronUp size={14} className="text-[var(--foreground-subtle)]" /> : <ChevronDown size={14} className="text-[var(--foreground-subtle)]" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 flex flex-col gap-2 border-t border-[var(--border)]">
          <div className="flex gap-2 pt-3">
            <div className="flex-1 text-center">
              <div className="text-[10px] font-bold text-[var(--accent)] mb-1.5 uppercase tracking-wide">
                1er · +{pointsGroupFirst} pts
              </div>
              <div className="flex flex-col gap-1">
                {sorted.map((team) => (
                  <button
                    key={team.code}
                    onClick={() => {
                      if (team.code === secondCode) onSetSecond("")
                      onSetFirst(firstCode === team.code ? "" : team.code)
                    }}
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

            <div className="flex-1 text-center">
              <div className="text-[10px] font-bold text-[var(--foreground-muted)] mb-1.5 uppercase tracking-wide">
                2e · +{pointsGroupSecond} pts
              </div>
              <div className="flex flex-col gap-1">
                {sorted.map((team) => (
                  <button
                    key={team.code}
                    onClick={() => {
                      if (team.code === firstCode) onSetFirst("")
                      onSetSecond(secondCode === team.code ? "" : team.code)
                    }}
                    className={cn(
                      "flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold border transition-all",
                      secondCode === team.code
                        ? "bg-[var(--surface-elevated)] border-[var(--foreground-muted)]/50 text-[var(--foreground)]"
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
            <p className="text-[10px] text-[var(--warning)] text-center mt-1">
              ⚠️ Les matchs de ce groupe ne sont pas tous terminés.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export function GroupBonusManager({ contestId, groups, pointsGroupFirst, pointsGroupSecond }: Props) {
  const [isPending, startTransition] = useTransition()
  const [applied, setApplied] = useState(false)

  // Pre-fill from computed standings (position 1 & 2)
  const initialSelections = Object.fromEntries(
    groups.map((g) => {
      const sorted = [...g.teams].sort((a, b) => a.position - b.position)
      return [
        g.letter,
        {
          first: sorted[0]?.code ?? "",
          second: sorted[1]?.code ?? "",
        },
      ]
    })
  )

  const [selections, setSelections] = useState<Record<string, { first: string; second: string }>>(initialSelections)

  const setFirst = (letter: string, code: string) => {
    setSelections((prev) => ({ ...prev, [letter]: { ...prev[letter], first: code } }))
    setApplied(false)
  }
  const setSecond = (letter: string, code: string) => {
    setSelections((prev) => ({ ...prev, [letter]: { ...prev[letter], second: code } }))
    setApplied(false)
  }

  const allComplete = groups.every(
    (g) => selections[g.letter]?.first && selections[g.letter]?.second
  )

  const handleApply = () => {
    startTransition(async () => {
      const groupResults = groups.map((g) => ({
        letter: g.letter,
        firstTeamCode: selections[g.letter]?.first ?? "",
        secondTeamCode: selections[g.letter]?.second ?? "",
      }))

      const result = await applyGroupBonusResults({ contestId, groupResults })
      if ("error" in result) {
        toast.error(String(result.error))
      } else {
        toast.success("Points groupes appliqués et classement mis à jour !")
        setApplied(true)
      }
    })
  }

  const someGroupsUnfinished = groups.some((g) => !g.allMatchesFinished)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2 p-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-xs text-[var(--foreground-muted)]">
        <span className="shrink-0">ℹ️</span>
        <span>
          Le top 2 de chaque groupe est pré-rempli automatiquement depuis les résultats des matchs.
          Vérifie et corrige si besoin, puis clique sur <strong>&quot;Appliquer&quot;</strong>.
          Tu peux appliquer plusieurs fois — les points groupes sont recalculés à chaque fois.
        </span>
      </div>

      {someGroupsUnfinished && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-[var(--warning-dim)] border border-[var(--warning)]/30 text-xs text-[var(--warning)]">
          <span className="shrink-0">⚠️</span>
          <span>
            Certains groupes n&apos;ont pas encore tous leurs matchs terminés. Les classements sont provisoires.
          </span>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {groups.map((group) => (
          <GroupCard
            key={group.letter}
            group={group}
            firstCode={selections[group.letter]?.first ?? ""}
            secondCode={selections[group.letter]?.second ?? ""}
            onSetFirst={(code) => setFirst(group.letter, code)}
            onSetSecond={(code) => setSecond(group.letter, code)}
            pointsGroupFirst={pointsGroupFirst}
            pointsGroupSecond={pointsGroupSecond}
          />
        ))}
      </div>

      <button
        onClick={handleApply}
        disabled={isPending || !allComplete}
        className={cn(
          "py-3.5 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50",
          applied
            ? "bg-[var(--success-dim)] text-[var(--success)] border border-[var(--success)]/30"
            : "gradient-accent text-white hover:opacity-90"
        )}
      >
        {isPending ? (
          <span className="animate-pulse">Application en cours...</span>
        ) : applied ? (
          <span className="flex items-center justify-center gap-2">
            <CheckCircle size={16} /> Points groupes appliqués
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Users size={16} /> Appliquer les points groupes
          </span>
        )}
      </button>
    </div>
  )
}
