"use client"

import { useMemo, useState } from "react"
import { FootballAvatar } from "@/components/shared/football-avatar"
import { cn, PHASE_ORDER } from "@/lib/utils"
import { X } from "lucide-react"
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
      {hasBonusPreds && (
        <div className="flex gap-1 bg-[var(--surface-elevated)] rounded-xl p-1">
          {(["matches", "bonus"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setActiveSection(s)}
              className={cn(
                "flex-1 py-2 rounded-lg text-xs font-semibold transition-all",
                activeSection === s ? "gradient-accent text-white shadow-sm" : "text-[var(--foreground-muted)]"
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
  const [modalOpen, setModalOpen] = useState(false)

  const realResult =
    match.status === "FINISHED" && match.homeScore !== null && match.awayScore !== null
      ? match.homeScore > match.awayScore ? "home"
      : match.homeScore === match.awayScore ? "draw"
      : "away"
      : null

  const total = preds.length
  let homeWin = 0, draw = 0, awayWin = 0
  for (const p of preds) {
    if (p.homeScore > p.awayScore) homeWin++
    else if (p.homeScore === p.awayScore) draw++
    else awayWin++
  }
  const homeWinPct = Math.round((homeWin / total) * 100)
  const drawPct = Math.round((draw / total) * 100)
  const awayWinPct = Math.round((awayWin / total) * 100)

  // Top scores par popularité
  const scoreCounts = new Map<string, { homeScore: number; awayScore: number; count: number; users: CommunityPrediction["user"][] }>()
  for (const p of preds) {
    const key = `${p.homeScore}-${p.awayScore}`
    const existing = scoreCounts.get(key)
    if (existing) {
      existing.count++
      existing.users.push(p.user)
    } else {
      scoreCounts.set(key, { homeScore: p.homeScore, awayScore: p.awayScore, count: 1, users: [p.user] })
    }
  }
  const topScores = Array.from(scoreCounts.values()).sort((a, b) => b.count - a.count).slice(0, 3)

  const myPred = preds.find((p) => p.user.id === userId)

  return (
    <>
      <div className="surface-card overflow-hidden">
        {/* Header match */}
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

        {/* Barre distribution */}
        <div className="px-3 pb-2">
          <div className="flex rounded-lg overflow-hidden h-5 gap-px mb-1">
            <div
              className={cn("flex items-center justify-center text-[9px] font-bold text-white transition-all", realResult === "home" ? "bg-[var(--success)]" : "bg-[var(--accent)]/70")}
              style={{ width: `${homeWinPct}%`, minWidth: homeWinPct > 0 ? "28px" : "0" }}
            >
              {homeWinPct > 10 ? `${homeWinPct}%` : ""}
            </div>
            <div
              className={cn("flex items-center justify-center text-[9px] font-bold text-white transition-all", realResult === "draw" ? "bg-[var(--success)]" : "bg-[var(--foreground-subtle)]")}
              style={{ width: `${drawPct}%`, minWidth: drawPct > 0 ? "28px" : "0" }}
            >
              {drawPct > 10 ? `${drawPct}%` : ""}
            </div>
            <div
              className={cn("flex items-center justify-center text-[9px] font-bold text-white transition-all", realResult === "away" ? "bg-[var(--success)]" : "bg-[var(--purple)]/70")}
              style={{ width: `${awayWinPct}%`, minWidth: awayWinPct > 0 ? "28px" : "0" }}
            >
              {awayWinPct > 10 ? `${awayWinPct}%` : ""}
            </div>
          </div>
          <div className="flex items-center justify-between text-[9px] text-[var(--foreground-subtle)]">
            <span>{homeWinPct}%</span>
            <span className="text-[var(--foreground-subtle)]">{total} pronostic{total > 1 ? "s" : ""}</span>
            <span>{awayWinPct}%</span>
          </div>
        </div>

        {/* Top scores */}
        <div className="border-t border-[var(--border)] px-3 py-2 flex flex-col gap-1.5">
          {topScores.map((s, i) => {
            const isExact = match.status === "FINISHED" && match.homeScore === s.homeScore && match.awayScore === s.awayScore
            const pct = Math.round((s.count / total) * 100)
            return (
              <div key={`${s.homeScore}-${s.awayScore}`} className="flex items-center gap-2">
                <span className="text-[10px] text-[var(--foreground-subtle)] w-3 shrink-0">
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                </span>
                <span className={cn(
                  "text-xs font-black tabular-nums w-10 shrink-0",
                  isExact ? "text-[var(--success)]" : "text-[var(--foreground)]"
                )}>
                  {s.homeScore} – {s.awayScore}
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-[var(--surface-elevated)] overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", isExact ? "bg-[var(--success)]" : "bg-[var(--accent)]/60")}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[10px] text-[var(--foreground-muted)] w-12 text-right shrink-0">
                  {s.count} vote{s.count > 1 ? "s" : ""} · {pct}%
                </span>
              </div>
            )
          })}
        </div>

        {/* Footer : mon prono + voir tous */}
        <div className="border-t border-[var(--border)] px-3 py-2 flex items-center justify-between">
          {myPred ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[var(--foreground-subtle)]">Mon prono :</span>
              <span className="text-xs font-bold text-[var(--accent)] tabular-nums">
                {myPred.homeScore} – {myPred.awayScore}
              </span>
            </div>
          ) : (
            <span className="text-[10px] text-[var(--foreground-subtle)] italic">Pas de prono</span>
          )}
          <button
            onClick={() => setModalOpen(true)}
            className="text-[10px] font-semibold text-[var(--accent)] hover:underline"
          >
            Voir les {total} →
          </button>
        </div>
      </div>

      {/* Modal liste complète */}
      {modalOpen && (
        <PredictionsModal
          match={match}
          preds={preds}
          realResult={realResult}
          userId={userId}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  )
}

function PredictionsModal({
  match,
  preds,
  realResult,
  userId,
  onClose,
}: {
  match: MatchWithPrediction
  preds: CommunityPrediction[]
  realResult: "home" | "draw" | "away" | null
  userId: string
  onClose: () => void
}) {
  const sorted = [...preds].sort((a, b) => {
    // Mon prono en premier
    if (a.user.id === userId) return -1
    if (b.user.id === userId) return 1
    // Puis exacts, puis corrects, puis autres
    const scoreOf = (p: CommunityPrediction) => {
      if (match.status === "FINISHED" && match.homeScore === p.homeScore && match.awayScore === p.awayScore) return 2
      const r = p.homeScore > p.awayScore ? "home" : p.homeScore === p.awayScore ? "draw" : "away"
      if (realResult === r) return 1
      return 0
    }
    return scoreOf(b) - scoreOf(a)
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[var(--background)] rounded-t-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[var(--border)]" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
          <span className="text-base">{match.homeTeam?.flagEmoji}</span>
          <span className="flex-1 text-sm font-bold text-[var(--foreground)]">
            {match.homeTeam?.name} vs {match.awayTeam?.name}
          </span>
          <span className="text-base">{match.awayTeam?.flagEmoji}</span>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--surface-elevated)]">
            <X size={16} className="text-[var(--foreground-muted)]" />
          </button>
        </div>

        {/* Liste */}
        <div className="overflow-y-auto flex-1 px-2 py-2 flex flex-col gap-0.5">
          {sorted.map((p) => {
            const result = p.homeScore > p.awayScore ? "home" : p.homeScore === p.awayScore ? "draw" : "away"
            const isMe = p.user.id === userId
            const isExact = match.status === "FINISHED" && match.homeScore === p.homeScore && match.awayScore === p.awayScore
            const isCorrect = match.status === "FINISHED" && realResult === result && !isExact

            return (
              <div
                key={p.user.id}
                className={cn(
                  "flex items-center gap-2 py-2 px-3 rounded-xl",
                  isExact ? "bg-[var(--success-dim)]" : isCorrect ? "bg-[var(--accent-dim)]" : "bg-[var(--surface-elevated)]"
                )}
              >
                <FootballAvatar seed={p.user.avatarSeed} size={24} />
                <span className={cn("flex-1 text-xs truncate", isMe ? "text-[var(--accent)] font-semibold" : "text-[var(--foreground)]")}>
                  {p.user.firstName} {p.user.lastName}
                  {isMe && <span className="text-[9px] ml-1 opacity-60">(moi)</span>}
                </span>
                <span className={cn(
                  "text-xs font-black tabular-nums",
                  isExact ? "text-[var(--success)]" : isCorrect ? "text-[var(--accent)]" : "text-[var(--foreground-muted)]"
                )}>
                  {p.homeScore} – {p.awayScore}
                </span>
              </div>
            )
          })}
        </div>
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

  const total = predictions.length

  return (
    <div className="flex flex-col gap-3">
      <PollBlock
        label="Vainqueur du tournoi"
        icon="🏆"
        total={total}
        myValue={predictions.find((p) => p.user.id === userId)?.winner
          ? `${predictions.find((p) => p.user.id === userId)!.winner!.flagEmoji ?? ""} ${predictions.find((p) => p.user.id === userId)!.winner!.name}`
          : null}
        votes={predictions
          .filter((p) => p.winner)
          .reduce<Record<string, number>>((acc, p) => {
            const key = `${p.winner!.flagEmoji ?? ""} ${p.winner!.name}`
            acc[key] = (acc[key] ?? 0) + 1
            return acc
          }, {})}
      />

      <PollBlock
        label="Meilleur buteur"
        icon="⚽"
        total={total}
        myValue={predictions.find((p) => p.user.id === userId)?.topScorerFreeText ?? null}
        votes={predictions
          .filter((p) => p.topScorerFreeText)
          .reduce<Record<string, number>>((acc, p) => {
            const key = p.topScorerFreeText!
            acc[key] = (acc[key] ?? 0) + 1
            return acc
          }, {})}
      />

      <PollBlock
        label="Meilleure attaque"
        icon="⚔️"
        total={total}
        myValue={predictions.find((p) => p.user.id === userId)?.bestAttack
          ? `${predictions.find((p) => p.user.id === userId)!.bestAttack!.flagEmoji ?? ""} ${predictions.find((p) => p.user.id === userId)!.bestAttack!.name}`
          : null}
        votes={predictions
          .filter((p) => p.bestAttack)
          .reduce<Record<string, number>>((acc, p) => {
            const key = `${p.bestAttack!.flagEmoji ?? ""} ${p.bestAttack!.name}`
            acc[key] = (acc[key] ?? 0) + 1
            return acc
          }, {})}
      />

      <PollBlock
        label="Meilleure défense"
        icon="🛡️"
        total={total}
        myValue={predictions.find((p) => p.user.id === userId)?.bestDefense
          ? `${predictions.find((p) => p.user.id === userId)!.bestDefense!.flagEmoji ?? ""} ${predictions.find((p) => p.user.id === userId)!.bestDefense!.name}`
          : null}
        votes={predictions
          .filter((p) => p.bestDefense)
          .reduce<Record<string, number>>((acc, p) => {
            const key = `${p.bestDefense!.flagEmoji ?? ""} ${p.bestDefense!.name}`
            acc[key] = (acc[key] ?? 0) + 1
            return acc
          }, {})}
      />

      {groups.map((group) => {
        const myGP = predictions.find((p) => p.user.id === userId)?.groupPredictions.find((g) => g.groupLetter === group.letter)
        const myValue = myGP
          ? (() => {
              const first = teamsByCode[myGP.firstTeamCode]
              const second = teamsByCode[myGP.secondTeamCode]
              return first && second ? `🥇 ${first.flagEmoji ?? ""} ${first.name} · 🥈 ${second.flagEmoji ?? ""} ${second.name}` : null
            })()
          : null

        const votes = predictions.reduce<Record<string, number>>((acc, p) => {
          const gp = p.groupPredictions.find((g) => g.groupLetter === group.letter)
          if (!gp) return acc
          const first = teamsByCode[gp.firstTeamCode]
          const second = teamsByCode[gp.secondTeamCode]
          if (!first || !second) return acc
          const key = `${first.flagEmoji ?? ""} ${first.name} · ${second.flagEmoji ?? ""} ${second.name}`
          acc[key] = (acc[key] ?? 0) + 1
          return acc
        }, {})

        return (
          <PollBlock
            key={group.id}
            label={`Groupe ${group.letter} — qualifiés`}
            icon="📊"
            total={total}
            myValue={myValue}
            votes={votes}
          />
        )
      })}
    </div>
  )
}

function PollBlock({
  label,
  icon,
  total,
  myValue,
  votes,
}: {
  label: string
  icon: string
  total: number
  myValue: string | null
  votes: Record<string, number>
}) {
  const [expanded, setExpanded] = useState(false)

  const sorted = Object.entries(votes).sort((a, b) => b[1] - a[1])
  if (sorted.length === 0) return null

  const top = sorted[0][1]
  const visible = expanded ? sorted : sorted.slice(0, 5)
  const hasMore = sorted.length > 5

  return (
    <div className="surface-card overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[var(--border)]">
        <span className="text-sm">{icon}</span>
        <span className="flex-1 text-xs font-bold text-[var(--foreground)]">{label}</span>
        {myValue && (
          <span className="text-[10px] text-[var(--accent)] font-semibold truncate max-w-[120px]">
            Toi : {myValue}
          </span>
        )}
      </div>

      <div className="flex flex-col px-3 py-2 gap-2">
        {visible.map(([name, count], i) => {
          const pct = Math.round((count / total) * 100)
          const isTop = i === 0
          const isMyChoice = myValue?.includes(name.trim()) || name.trim() === myValue?.trim()

          return (
            <div key={name} className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className={cn(
                  "text-xs truncate flex-1",
                  isMyChoice ? "text-[var(--accent)] font-semibold" : isTop ? "text-[var(--foreground)] font-medium" : "text-[var(--foreground-muted)]"
                )}>
                  {i === 0 && "🥇 "}
                  {i === 1 && "🥈 "}
                  {i === 2 && "🥉 "}
                  {name}
                  {isMyChoice && <span className="text-[9px] ml-1 opacity-60">(toi)</span>}
                </span>
                <span className="text-[10px] text-[var(--foreground-subtle)] ml-2 shrink-0">
                  {count} · {pct}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-[var(--surface-elevated)] overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    isMyChoice ? "bg-[var(--accent)]" : isTop ? "bg-[var(--gold)]" : "bg-[var(--foreground-subtle)]/40"
                  )}
                  style={{ width: `${Math.round((count / top) * 100)}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full py-2 text-[10px] font-semibold text-[var(--foreground-subtle)] hover:text-[var(--foreground-muted)] border-t border-[var(--border)] transition-colors"
        >
          {expanded ? "Réduire ▲" : `Voir ${sorted.length - 5} choix de plus ▼`}
        </button>
      )}
    </div>
  )
}
