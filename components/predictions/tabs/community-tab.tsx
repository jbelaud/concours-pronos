"use client"

import { useMemo, useState } from "react"
import { FootballAvatar } from "@/components/shared/football-avatar"
import { cn, PHASE_ORDER } from "@/lib/utils"
import { ChevronDown, ChevronUp } from "lucide-react"
import type { MatchWithPrediction } from "@/types"
import type { CommunityBonusPrediction } from "../prediction-hub"

interface CommunityPrediction {
  matchId: string
  homeScore: number
  awayScore: number
  user: { id: string; firstName: string; lastName: string; avatarSeed: string }
}

interface GroupWithTeams {
  id: string
  letter: string
  name: string
  teams: Array<{ teamId: string; team: { id: string; code: string; name: string; flagEmoji: string | null } }>
}

interface Props {
  matches: MatchWithPrediction[]
  communityPredictions: CommunityPrediction[]
  communityBonusPredictions: CommunityBonusPrediction[]
  groups: GroupWithTeams[]
  userId: string
}

const PHASE_SHORT: Record<string, string> = {
  GROUP: "Groupes",
  ROUND_OF_32: "1/16",
  ROUND_OF_16: "1/8",
  QUARTER_FINAL: "1/4",
  SEMI_FINAL: "1/2",
  THIRD_PLACE: "3e place",
  FINAL: "Finale",
}

export function CommunityTab({ matches, communityPredictions, communityBonusPredictions, groups, userId }: Props) {
  const [activeSection, setActiveSection] = useState<"matches" | "bonus">("matches")

  const communityByMatch = useMemo(() => {
    const map: Record<string, CommunityPrediction[]> = {}
    for (const p of communityPredictions) {
      if (!map[p.matchId]) map[p.matchId] = []
      map[p.matchId].push(p)
    }
    return map
  }, [communityPredictions])

  const lockedMatches = useMemo(() => {
    return matches
      .filter((m) => m.isLocked && communityByMatch[m.id]?.length > 0)
      .sort((a, b) => {
        const phaseOrder = (PHASE_ORDER[a.phase] ?? 99) - (PHASE_ORDER[b.phase] ?? 99)
        if (phaseOrder !== 0) return phaseOrder
        return new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime()
      })
  }, [matches, communityByMatch])

  const hasBonusPreds = communityBonusPredictions.length > 0

  return (
    <div className="flex flex-col gap-3 pb-6">
      {/* Section toggle */}
      {hasBonusPreds && (
        <div className="flex gap-1 bg-[var(--surface-elevated)] rounded-xl p-1">
          {(["matches", "bonus"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setActiveSection(s)}
              className={cn(
                "flex-1 py-2 rounded-lg text-xs font-semibold transition-all",
                activeSection === s
                  ? "gradient-accent text-white shadow-sm"
                  : "text-[var(--foreground-muted)]"
              )}
            >
              {s === "matches" ? "⚽ Matchs" : "🏆 Tournoi"}
            </button>
          ))}
        </div>
      )}

      {activeSection === "matches" && (
        <MatchesSection lockedMatches={lockedMatches} communityByMatch={communityByMatch} userId={userId} />
      )}

      {activeSection === "bonus" && hasBonusPreds && (
        <BonusSection predictions={communityBonusPredictions} groups={groups} userId={userId} />
      )}
    </div>
  )
}

// ── Matches section ───────────────────────────────────────────────────────────

function MatchesSection({
  lockedMatches,
  communityByMatch,
  userId,
}: {
  lockedMatches: MatchWithPrediction[]
  communityByMatch: Record<string, CommunityPrediction[]>
  userId: string
}) {
  if (lockedMatches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <span className="text-4xl">🔒</span>
        <p className="text-sm text-[var(--foreground-muted)] text-center">
          Les pronostics de la communauté seront visibles après le coup d'envoi des matchs.
        </p>
      </div>
    )
  }

  const byPhase = lockedMatches.reduce<Record<string, MatchWithPrediction[]>>((acc, m) => {
    if (!acc[m.phase]) acc[m.phase] = []
    acc[m.phase].push(m)
    return acc
  }, {})

  const phases = Object.keys(byPhase).sort((a, b) => (PHASE_ORDER[a] ?? 99) - (PHASE_ORDER[b] ?? 99))

  return (
    <div className="flex flex-col gap-4">
      {phases.map((phase) => (
        <div key={phase} className="flex flex-col gap-2">
          <div className="text-[11px] font-bold text-[var(--foreground-subtle)] uppercase tracking-wide px-1">
            {PHASE_SHORT[phase] ?? phase}
          </div>
          {byPhase[phase].map((match) => (
            <MatchCommunityCard
              key={match.id}
              match={match}
              preds={communityByMatch[match.id] ?? []}
              userId={userId}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function MatchCommunityCard({
  match,
  preds,
  userId,
}: {
  match: MatchWithPrediction
  preds: CommunityPrediction[]
  userId: string
}) {
  const realResult =
    match.status === "FINISHED" && match.homeScore !== null && match.awayScore !== null
      ? match.homeScore > match.awayScore ? "home"
      : match.homeScore === match.awayScore ? "draw"
      : "away"
      : null

  let homeWin = 0, draw = 0, awayWin = 0
  for (const p of preds) {
    if (p.homeScore > p.awayScore) homeWin++
    else if (p.homeScore === p.awayScore) draw++
    else awayWin++
  }
  const total = preds.length
  const homeWinPct = Math.round((homeWin / total) * 100)
  const drawPct = Math.round((draw / total) * 100)
  const awayWinPct = Math.round((awayWin / total) * 100)

  return (
    <div className="surface-card overflow-hidden">
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <span className="text-lg leading-none">{match.homeTeam?.flagEmoji ?? "🏳️"}</span>
        <span className="flex-1 text-xs font-semibold text-[var(--foreground)] truncate text-right">
          {match.homeTeam?.name}
        </span>
        {match.status === "FINISHED" && match.homeScore !== null ? (
          <span className="text-sm font-black text-[var(--foreground)] tabular-nums px-2">
            {match.homeScore} – {match.awayScore}
          </span>
        ) : (
          <span className="text-[11px] text-[var(--foreground-subtle)] px-2">vs</span>
        )}
        <span className="flex-1 text-xs font-semibold text-[var(--foreground)] truncate">
          {match.awayTeam?.name}
        </span>
        <span className="text-lg leading-none">{match.awayTeam?.flagEmoji ?? "🏳️"}</span>
      </div>

      <div className="px-3 pb-2">
        <div className="flex rounded-lg overflow-hidden h-4 gap-px mb-1">
          <div
            className={cn(
              "flex items-center justify-center text-[9px] font-bold text-white transition-all",
              realResult === "home" ? "bg-[var(--success)]" : "bg-[var(--accent)]/60"
            )}
            style={{ width: `${homeWinPct}%`, minWidth: homeWinPct > 0 ? "24px" : "0" }}
          >
            {homeWinPct > 12 ? `${homeWinPct}%` : ""}
          </div>
          <div
            className={cn(
              "flex items-center justify-center text-[9px] font-bold text-white transition-all",
              realResult === "draw" ? "bg-[var(--success)]" : "bg-[var(--foreground-subtle)]"
            )}
            style={{ width: `${drawPct}%`, minWidth: drawPct > 0 ? "24px" : "0" }}
          >
            {drawPct > 12 ? `${drawPct}%` : ""}
          </div>
          <div
            className={cn(
              "flex items-center justify-center text-[9px] font-bold text-white transition-all",
              realResult === "away" ? "bg-[var(--success)]" : "bg-[var(--purple)]/60"
            )}
            style={{ width: `${awayWinPct}%`, minWidth: awayWinPct > 0 ? "24px" : "0" }}
          >
            {awayWinPct > 12 ? `${awayWinPct}%` : ""}
          </div>
        </div>
        <div className="flex items-center justify-between text-[9px] text-[var(--foreground-subtle)]">
          <span>{homeWinPct}%</span>
          <span>{total} pronos</span>
          <span>{awayWinPct}%</span>
        </div>
      </div>

      <div className="border-t border-[var(--border)] flex flex-col gap-0">
        {preds.map((p) => {
          const result = p.homeScore > p.awayScore ? "home" : p.homeScore === p.awayScore ? "draw" : "away"
          const isMe = p.user.id === userId
          const isExact = match.status === "FINISHED" && match.homeScore === p.homeScore && match.awayScore === p.awayScore
          const isCorrect = match.status === "FINISHED" && realResult === result && !isExact

          return (
            <div
              key={p.user.id}
              className={cn(
                "flex items-center gap-2 py-1.5 px-3",
                isExact ? "bg-[var(--success-dim)]" : isCorrect ? "bg-[var(--accent-dim)]" : ""
              )}
            >
              <FootballAvatar seed={p.user.avatarSeed} size={20} />
              <span className={cn("flex-1 text-xs truncate", isMe ? "text-[var(--accent)] font-semibold" : "text-[var(--foreground)]")}>
                {p.user.firstName} {p.user.lastName}
                {isMe && <span className="text-[9px] ml-1 opacity-60">(moi)</span>}
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

// ── Bonus section ─────────────────────────────────────────────────────────────

function BonusSection({
  predictions,
  groups,
  userId,
}: {
  predictions: CommunityBonusPrediction[]
  groups: GroupWithTeams[]
  userId: string
}) {
  const teamsByCode = useMemo(() => {
    const map: Record<string, { name: string; flagEmoji: string | null }> = {}
    for (const g of groups) {
      for (const gt of g.teams) {
        map[gt.team.code] = { name: gt.team.name, flagEmoji: gt.team.flagEmoji }
      }
    }
    return map
  }, [groups])

  return (
    <div className="flex flex-col gap-3">
      <BonusBlock
        label="Vainqueur du tournoi"
        icon="🏆"
        rows={predictions.map((p) => ({
          user: p.user,
          isMe: p.user.id === userId,
          value: p.winner ? `${p.winner.flagEmoji ?? ""} ${p.winner.name}` : null,
        }))}
      />
      <BonusBlock
        label="Meilleur buteur"
        icon="⚽"
        rows={predictions.map((p) => ({
          user: p.user,
          isMe: p.user.id === userId,
          value: p.topScorerFreeText ?? null,
        }))}
      />
      <BonusBlock
        label="Meilleure attaque"
        icon="⚔️"
        rows={predictions.map((p) => ({
          user: p.user,
          isMe: p.user.id === userId,
          value: p.bestAttack ? `${p.bestAttack.flagEmoji ?? ""} ${p.bestAttack.name}` : null,
        }))}
      />
      <BonusBlock
        label="Meilleure défense"
        icon="🛡️"
        rows={predictions.map((p) => ({
          user: p.user,
          isMe: p.user.id === userId,
          value: p.bestDefense ? `${p.bestDefense.flagEmoji ?? ""} ${p.bestDefense.name}` : null,
        }))}
      />

      {/* Group predictions per group */}
      {groups.map((group) => (
        <BonusBlock
          key={group.id}
          label={`Groupe ${group.letter} — qualifiés`}
          icon="📊"
          rows={predictions.map((p) => {
            const gp = p.groupPredictions.find((g) => g.groupLetter === group.letter)
            if (!gp) return { user: p.user, isMe: p.user.id === userId, value: null }
            const first = teamsByCode[gp.firstTeamCode]
            const second = teamsByCode[gp.secondTeamCode]
            return {
              user: p.user,
              isMe: p.user.id === userId,
              value: first && second
                ? `🥇 ${first.flagEmoji ?? ""} ${first.name} · 🥈 ${second.flagEmoji ?? ""} ${second.name}`
                : null,
            }
          })}
        />
      ))}
    </div>
  )
}

function BonusBlock({
  label,
  icon,
  rows,
}: {
  label: string
  icon: string
  rows: Array<{
    user: { id: string; firstName: string; lastName: string; avatarSeed: string }
    isMe: boolean
    value: string | null
  }>
}) {
  const [expanded, setExpanded] = useState(false)
  const filled = rows.filter((r) => r.value !== null)
  if (filled.length === 0) return null

  const visible = expanded ? filled : filled.slice(0, 4)

  return (
    <div className="surface-card overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[var(--border)]">
        <span className="text-base">{icon}</span>
        <span className="flex-1 text-xs font-bold text-[var(--foreground)]">{label}</span>
        <span className="text-[10px] text-[var(--foreground-subtle)]">{filled.length} pronos</span>
      </div>
      <div className="flex flex-col">
        {visible.map((row) => (
          <div
            key={row.user.id}
            className={cn(
              "flex items-center gap-2 py-1.5 px-3",
              row.isMe && "bg-[var(--accent-dim)]"
            )}
          >
            <FootballAvatar seed={row.user.avatarSeed} size={20} />
            <span className={cn("text-xs shrink-0", row.isMe ? "text-[var(--accent)] font-semibold" : "text-[var(--foreground-muted)]")}>
              {row.user.firstName}
              {row.isMe && <span className="text-[9px] ml-1 opacity-60">(moi)</span>}
            </span>
            <span className="flex-1 text-xs text-[var(--foreground)] truncate text-right">
              {row.value}
            </span>
          </div>
        ))}
        {filled.length > 4 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center justify-center gap-1 py-1.5 text-[11px] text-[var(--foreground-subtle)] hover:text-[var(--foreground-muted)] border-t border-[var(--border)] transition-colors"
          >
            {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            {expanded ? "Réduire" : `Voir ${filled.length - 4} de plus`}
          </button>
        )}
      </div>
    </div>
  )
}
