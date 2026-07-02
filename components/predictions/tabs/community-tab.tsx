"use client"

import { useMemo, useState } from "react"
import { FootballAvatar } from "@/components/shared/football-avatar"
import { cn, PHASE_ORDER } from "@/lib/utils"
import { ChevronDown, ChevronUp, X } from "lucide-react"
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
  tournamentLocked: boolean
  knockoutScoringRule: "REGULAR_TIME" | "FULL_TIME"
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

export function CommunityTab({ matches, communityPredictions, communityBonusPredictions, groups, userId, tournamentLocked, knockoutScoringRule }: Props) {
  const [activeSection, setActiveSection] = useState<"matches" | "bonus" | "stats">("matches")

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
        return new Date(b.kickoff).getTime() - new Date(a.kickoff).getTime()
      })
  }, [matches, communityByMatch])

  const hasBonusPreds = tournamentLocked && communityBonusPredictions.length > 0

  type Section = "matches" | "bonus" | "stats"
  const sections: { id: Section; label: string }[] = [
    { id: "matches", label: "⚽ Matchs" },
    ...(hasBonusPreds ? [{ id: "bonus" as Section, label: "🏆 Tournoi" }] : []),
    ...(hasBonusPreds ? [{ id: "stats" as Section, label: "📊 Stats" }] : []),
  ]

  return (
    <div className="flex flex-col gap-3 pb-6">
      {hasBonusPreds && (
        <div className="flex gap-1 bg-[var(--surface-elevated)] rounded-xl p-1">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={cn(
                "flex-1 py-2 rounded-lg text-xs font-semibold transition-all",
                activeSection === s.id ? "gradient-accent text-white shadow-sm" : "text-[var(--foreground-muted)]"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {activeSection === "matches" && (
        <MatchesSection lockedMatches={lockedMatches} communityByMatch={communityByMatch} userId={userId} knockoutScoringRule={knockoutScoringRule} />
      )}
      {activeSection === "bonus" && hasBonusPreds && (
        <BonusSection predictions={communityBonusPredictions} groups={groups} userId={userId} />
      )}
      {activeSection === "stats" && hasBonusPreds && (
        <StatsSection predictions={communityBonusPredictions} lockedMatches={lockedMatches} communityByMatch={communityByMatch} groups={groups} userId={userId} knockoutScoringRule={knockoutScoringRule} />
      )}
    </div>
  )
}

// ── Accordion ─────────────────────────────────────────────────────────────────

function Accordion({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="surface-card overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[var(--foreground)]">{title}</span>
          {badge && (
            <span className="text-[10px] font-semibold text-[var(--foreground-muted)] bg-[var(--surface-elevated)] px-2 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </div>
        {open
          ? <ChevronUp size={14} className="text-[var(--foreground-subtle)] shrink-0" />
          : <ChevronDown size={14} className="text-[var(--foreground-subtle)] shrink-0" />
        }
      </button>
      {open && (
        <div className="border-t border-[var(--border)] px-3 pb-3 pt-2 flex flex-col gap-2">
          {children}
        </div>
      )}
    </div>
  )
}

// ── Matches section ───────────────────────────────────────────────────────────

const PHASE_FULL: Record<string, string> = {
  GROUP: "Phase de groupes",
  ROUND_OF_32: "1/16 de finale",
  ROUND_OF_16: "1/8 de finale",
  QUARTER_FINAL: "Quart de finale",
  SEMI_FINAL: "Demi-finale",
  THIRD_PLACE: "3e place",
  FINAL: "Finale",
}

function MatchesSection({
  lockedMatches,
  communityByMatch,
  userId,
  knockoutScoringRule,
}: {
  lockedMatches: MatchWithPrediction[]
  communityByMatch: Record<string, CommunityPrediction[]>
  userId: string
  knockoutScoringRule: "REGULAR_TIME" | "FULL_TIME"
}) {
  if (lockedMatches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <span className="text-4xl">🔒</span>
        <p className="text-sm text-[var(--foreground-muted)] text-center">
          Les pronostics de la communauté seront visibles après le coup d&apos;envoi des matchs.
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
    <div className="flex flex-col gap-2">
      {phases.map((phase) => {
        const phaseMatches = byPhase[phase]
        const totalPreds = phaseMatches.reduce((s, m) => s + (communityByMatch[m.id]?.length ?? 0), 0)
        return (
          <Accordion
            key={phase}
            title={PHASE_FULL[phase] ?? phase}
            badge={`${phaseMatches.length} match${phaseMatches.length > 1 ? "s" : ""} · ${totalPreds} pronos`}
          >
            {phaseMatches.map((match) => (
              <MatchCommunityCard
                key={match.id}
                match={match}
                preds={communityByMatch[match.id] ?? []}
                userId={userId}
                knockoutScoringRule={knockoutScoringRule}
              />
            ))}
          </Accordion>
        )
      })}
    </div>
  )
}

function MatchCommunityCard({
  match,
  preds,
  userId,
  knockoutScoringRule,
}: {
  match: MatchWithPrediction
  preds: CommunityPrediction[]
  userId: string
  knockoutScoringRule: "REGULAR_TIME" | "FULL_TIME"
}) {
  const [modalOpen, setModalOpen] = useState(false)

  // Score de référence pour l'évaluation des pronostics
  const isKnockout = match.phase !== "GROUP"
  const refHome =
    isKnockout && knockoutScoringRule === "REGULAR_TIME" && match.regularTimeHome !== null
      ? match.regularTimeHome
      : match.homeScore
  const refAway =
    isKnockout && knockoutScoringRule === "REGULAR_TIME" && match.regularTimeAway !== null
      ? match.regularTimeAway
      : match.awayScore

  // Score à afficher (sans le +1 TAB encodé)
  const displayHome = isKnockout && match.regularTimeHome !== null ? (match.extraTimeHome ?? match.regularTimeHome) : match.homeScore
  const displayAway = isKnockout && match.regularTimeAway !== null ? (match.extraTimeAway ?? match.regularTimeAway) : match.awayScore

  // Match décidé aux tirs au but : RT nul + score final différent (vainqueur +1 encodé)
  const isPenalties = isKnockout && match.regularTimeHome !== null && match.regularTimeAway !== null
    && match.homeScore !== null && match.awayScore !== null
    && match.regularTimeHome === match.regularTimeAway
    && match.homeScore !== match.awayScore
  const tabWinner: "home" | "away" | null = isPenalties
    ? (match.homeScore! > match.awayScore! ? "home" : "away")
    : null

  const realResult =
    match.status === "FINISHED" && refHome !== null && refAway !== null
      ? refHome > refAway ? "home"
      : refHome === refAway ? "draw"
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
              {displayHome} – {displayAway}{tabWinner ? " *" : ""}
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
            const isExact = match.status === "FINISHED" && refHome === s.homeScore && refAway === s.awayScore
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
          refHome={refHome}
          refAway={refAway}
          displayHome={displayHome}
          displayAway={displayAway}
          tabWinner={tabWinner}
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
  refHome,
  refAway,
  displayHome,
  displayAway,
  tabWinner,
  userId,
  onClose,
}: {
  match: MatchWithPrediction
  preds: CommunityPrediction[]
  realResult: "home" | "draw" | "away" | null
  refHome: number | null
  refAway: number | null
  displayHome: number | null
  displayAway: number | null
  tabWinner: "home" | "away" | null
  userId: string
  onClose: () => void
}) {
  const sorted = [...preds].sort((a, b) => {
    // Mon prono en premier
    if (a.user.id === userId) return -1
    if (b.user.id === userId) return 1
    // Puis exacts, puis corrects, puis autres
    const scoreOf = (p: CommunityPrediction) => {
      if (match.status === "FINISHED" && refHome === p.homeScore && refAway === p.awayScore) return 2
      const r = p.homeScore > p.awayScore ? "home" : p.homeScore === p.awayScore ? "draw" : "away"
      if (realResult === r) return 1
      return 0
    }
    return scoreOf(b) - scoreOf(a)
  })

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm"
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
          <div className="flex-1 flex flex-col min-w-0">
            <span className="text-sm font-bold text-[var(--foreground)] truncate">
              {match.homeTeam?.name}{tabWinner === "home" ? " *" : ""} vs {match.awayTeam?.name}{tabWinner === "away" ? " *" : ""}
            </span>
            {match.status === "FINISHED" && displayHome !== null && (
              <span className="text-[11px] text-[var(--foreground-muted)]">
                Score : {displayHome} – {displayAway}{tabWinner ? " (TAB)" : ""}
              </span>
            )}
          </div>
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
            const isExact = match.status === "FINISHED" && refHome === p.homeScore && refAway === p.awayScore
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

const BONUS_CATEGORIES = [
  { key: "winner",     label: "Vainqueur du tournoi", icon: "🏆" },
  { key: "scorer",     label: "Meilleur buteur",       icon: "⚽" },
  { key: "attack",     label: "Meilleure attaque",     icon: "⚔️" },
  { key: "defense",    label: "Meilleure défense",     icon: "🛡️" },
] as const

type BonusCategoryKey = (typeof BONUS_CATEGORIES)[number]["key"]

function BonusSection({
  predictions,
  groups,
  userId,
}: {
  predictions: CommunityBonusPrediction[]
  groups: GroupWithTeams[]
  userId: string
}) {
  const [openModal, setOpenModal] = useState<{ key: BonusCategoryKey | string; label: string; icon: string } | null>(null)

  const teamsByCode = useMemo(() => {
    const map: Record<string, { name: string; flagEmoji: string | null }> = {}
    for (const g of groups) {
      for (const gt of g.teams) {
        map[gt.team.code] = { name: gt.team.name, flagEmoji: gt.team.flagEmoji }
      }
    }
    return map
  }, [groups])

  const getLabel = (p: CommunityBonusPrediction, key: BonusCategoryKey | string): string | null => {
    if (key === "winner") return p.winner ? `${p.winner.flagEmoji ?? ""} ${p.winner.name}` : null
    if (key === "scorer") {
      if (p.topScorerFreeText) return p.topScorerFreeText
      return null
    }
    if (key === "attack") return p.bestAttack ? `${p.bestAttack.flagEmoji ?? ""} ${p.bestAttack.name}` : null
    if (key === "defense") return p.bestDefense ? `${p.bestDefense.flagEmoji ?? ""} ${p.bestDefense.name}` : null
    // group key e.g. "group-A"
    const letter = key.replace("group-", "")
    const gp = p.groupPredictions.find((g) => g.groupLetter === letter)
    if (!gp) return null
    const first = teamsByCode[gp.firstTeamCode]
    const second = teamsByCode[gp.secondTeamCode]
    return first && second ? `${first.flagEmoji ?? ""} ${first.name}  ·  ${second.flagEmoji ?? ""} ${second.name}` : null
  }

  const categories = [
    ...BONUS_CATEGORIES,
    ...groups.map((g) => ({ key: `group-${g.letter}` as string, label: `Groupe ${g.letter} — qualifiés`, icon: "📋" })),
  ]

  return (
    <div className="flex flex-col gap-2">
      {categories.map(({ key, label, icon }) => {
        const filled = predictions.filter((p) => getLabel(p, key) !== null)
        if (filled.length === 0) return null
        const myPred = predictions.find((p) => p.user.id === userId)
        const myLabel = myPred ? getLabel(myPred, key) : null
        const preview = filled.slice(0, 3)

        return (
          <div key={key} className="surface-card overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[var(--border)]">
              <span className="text-sm">{icon}</span>
              <span className="flex-1 text-xs font-bold text-[var(--foreground)]">{label}</span>
              <span className="text-[10px] text-[var(--foreground-subtle)]">{filled.length} prono{filled.length > 1 ? "s" : ""}</span>
            </div>

            {/* Mon prono */}
            {myLabel && (
              <div className="flex items-center gap-2 px-3 py-2 bg-[var(--accent-dim)] border-b border-[var(--accent)]/20">
                <FootballAvatar seed={myPred!.user.avatarSeed} size={20} />
                <span className="text-[10px] text-[var(--foreground-subtle)] shrink-0">Moi :</span>
                <span className="text-xs font-bold text-[var(--accent)] truncate flex-1">{myLabel}</span>
              </div>
            )}

            {/* Aperçu 3 premiers */}
            <div className="flex flex-col px-3 py-1.5 gap-0.5">
              {preview.filter((p) => p.user.id !== userId).slice(0, myLabel ? 2 : 3).map((p) => (
                <div key={p.user.id} className="flex items-center gap-2 py-1">
                  <FootballAvatar seed={p.user.avatarSeed} size={20} />
                  <span className="text-xs text-[var(--foreground)] truncate flex-1">
                    {p.user.firstName} {p.user.lastName}
                  </span>
                  <span className="text-xs font-semibold text-[var(--foreground-muted)] truncate max-w-[140px]">
                    {getLabel(p, key)}
                  </span>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-[var(--border)] px-3 py-2">
              <button
                onClick={() => setOpenModal({ key, label, icon })}
                className="text-[10px] font-semibold text-[var(--accent)] hover:underline"
              >
                Voir les {filled.length} →
              </button>
            </div>
          </div>
        )
      })}

      {/* Modal liste complète */}
      {openModal && (
        <BonusModal
          category={openModal}
          predictions={predictions}
          getLabel={getLabel}
          userId={userId}
          onClose={() => setOpenModal(null)}
        />
      )}
    </div>
  )
}

function BonusModal({
  category,
  predictions,
  getLabel,
  userId,
  onClose,
}: {
  category: { key: BonusCategoryKey | string; label: string; icon: string }
  predictions: CommunityBonusPrediction[]
  getLabel: (p: CommunityBonusPrediction, key: string) => string | null
  userId: string
  onClose: () => void
}) {
  const filled = [...predictions]
    .filter((p) => getLabel(p, category.key) !== null)
    .sort((a, b) => {
      if (a.user.id === userId) return -1
      if (b.user.id === userId) return 1
      return `${a.user.firstName} ${a.user.lastName}`.localeCompare(`${b.user.firstName} ${b.user.lastName}`)
    })

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[var(--background)] rounded-t-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[var(--border)]" />
        </div>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
          <span className="text-base">{category.icon}</span>
          <span className="flex-1 text-sm font-bold text-[var(--foreground)]">{category.label}</span>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--surface-elevated)]">
            <X size={16} className="text-[var(--foreground-muted)]" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-2 py-2 flex flex-col gap-0.5">
          {filled.map((p) => {
            const isMe = p.user.id === userId
            const val = getLabel(p, category.key)
            return (
              <div
                key={p.user.id}
                className={cn(
                  "flex items-center gap-2 py-2 px-3 rounded-xl",
                  isMe ? "bg-[var(--accent-dim)]" : "bg-[var(--surface-elevated)]"
                )}
              >
                <FootballAvatar seed={p.user.avatarSeed} size={24} />
                <span className={cn("text-xs truncate w-28 shrink-0", isMe ? "text-[var(--accent)] font-semibold" : "text-[var(--foreground)]")}>
                  {p.user.firstName} {p.user.lastName}
                  {isMe && <span className="text-[9px] ml-1 opacity-60">(moi)</span>}
                </span>
                <span className="text-xs font-semibold text-[var(--foreground-muted)] truncate flex-1 text-right">
                  {val}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Stats section ─────────────────────────────────────────────────────────────

function StatBars({ entries, myKey, total }: {
  entries: { key: string; label: string; count: number }[]
  myKey: string | null
  total: number
}) {
  const top = entries[0]?.count ?? 1
  return (
    <div className="flex flex-col px-3 py-2 gap-2">
      {entries.map((e, i) => {
        const pct = Math.round((e.count / total) * 100)
        const isMe = e.key === myKey
        return (
          <div key={e.key} className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <span className={cn("text-xs flex-1 truncate", isMe ? "text-[var(--accent)] font-semibold" : "text-[var(--foreground)]")}>
                {i === 0 ? "🥇 " : i === 1 ? "🥈 " : i === 2 ? "🥉 " : "    "}{e.label}
                {isMe && <span className="text-[9px] ml-1 opacity-60">(toi)</span>}
              </span>
              <span className="text-[10px] text-[var(--foreground-subtle)] shrink-0">{e.count} · {pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--surface-elevated)] overflow-hidden">
              <div
                className={cn("h-full rounded-full", isMe ? "bg-[var(--accent)]" : i === 0 ? "bg-[var(--gold)]" : "bg-[var(--foreground-subtle)]/40")}
                style={{ width: `${Math.round((e.count / top) * 100)}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function StatsSection({
  predictions,
  lockedMatches,
  communityByMatch,
  groups,
  userId,
  knockoutScoringRule,
}: {
  predictions: CommunityBonusPrediction[]
  lockedMatches: MatchWithPrediction[]
  communityByMatch: Record<string, CommunityPrediction[]>
  groups: GroupWithTeams[]
  userId: string
  knockoutScoringRule: "REGULAR_TIME" | "FULL_TIME"
}) {
  const total = predictions.length
  const myPred = predictions.find((p) => p.user.id === userId)

  const teamsByCode = useMemo(() => {
    const map: Record<string, { name: string; flagEmoji: string | null }> = {}
    for (const g of groups) for (const gt of g.teams) map[gt.team.code] = { name: gt.team.name, flagEmoji: gt.team.flagEmoji }
    return map
  }, [groups])

  // Helper : agrège les votes par clé
  const tally = <T,>(items: T[], key: (item: T) => string | null, label: (item: T) => string) => {
    const map: Record<string, { label: string; count: number }> = {}
    for (const item of items) {
      const k = key(item)
      if (!k) continue
      if (!map[k]) map[k] = { label: label(item), count: 0 }
      map[k].count++
    }
    return Object.entries(map).map(([k, v]) => ({ key: k, label: v.label, count: v.count })).sort((a, b) => b.count - a.count)
  }

  const winnerEntries = tally(predictions, (p) => p.winner?.id ?? null, (p) => `${p.winner?.flagEmoji ?? ""} ${p.winner?.name ?? ""}`)
  const scorerEntries = tally(predictions, (p) => p.topScorerFreeText ?? null, (p) => p.topScorerFreeText ?? "")
  const attackEntries = tally(predictions, (p) => p.bestAttack?.id ?? null, (p) => `${p.bestAttack?.flagEmoji ?? ""} ${p.bestAttack?.name ?? ""}`)
  const defenseEntries = tally(predictions, (p) => p.bestDefense?.id ?? null, (p) => `${p.bestDefense?.flagEmoji ?? ""} ${p.bestDefense?.name ?? ""}`)

  // Stats matchs : taux de réussite global
  const finishedMatches = lockedMatches.filter((m) => m.status === "FINISHED" && m.homeScore !== null)
  const totalPreds = finishedMatches.reduce((sum, m) => sum + (communityByMatch[m.id]?.length ?? 0), 0)
  const getRef = (m: MatchWithPrediction) => {
    const isKo = m.phase !== "GROUP"
    const rH = isKo && knockoutScoringRule === "REGULAR_TIME" && m.regularTimeHome !== null ? m.regularTimeHome : m.homeScore!
    const rA = isKo && knockoutScoringRule === "REGULAR_TIME" && m.regularTimeAway !== null ? m.regularTimeAway : m.awayScore!
    return { rH, rA }
  }
  const exactPreds = finishedMatches.reduce((sum, m) => {
    const { rH, rA } = getRef(m)
    return sum + (communityByMatch[m.id] ?? []).filter((p) => p.homeScore === rH && p.awayScore === rA).length
  }, 0)
  const correctPreds = finishedMatches.reduce((sum, m) => {
    const { rH, rA } = getRef(m)
    const realRes = rH > rA ? "home" : rH === rA ? "draw" : "away"
    return sum + (communityByMatch[m.id] ?? []).filter((p) => {
      const pr = p.homeScore > p.awayScore ? "home" : p.homeScore === p.awayScore ? "draw" : "away"
      return pr === realRes && !(p.homeScore === rH && p.awayScore === rA)
    }).length
  }, 0)
  const exactPct = totalPreds > 0 ? Math.round((exactPreds / totalPreds) * 100) : 0
  const correctPct = totalPreds > 0 ? Math.round((correctPreds / totalPreds) * 100) : 0

  const statBlocks: { icon: string; label: string; entries: { key: string; label: string; count: number }[]; myKey: string | null }[] = [
    { icon: "🏆", label: "Vainqueur favori",   entries: winnerEntries.slice(0, 5),  myKey: myPred?.winner?.id ?? null },
    { icon: "⚽", label: "Buteur favori",       entries: scorerEntries.slice(0, 5), myKey: myPred?.topScorerFreeText ?? null },
    { icon: "⚔️", label: "Meilleure attaque",   entries: attackEntries.slice(0, 5), myKey: myPred?.bestAttack?.id ?? null },
    { icon: "🛡️", label: "Meilleure défense",   entries: defenseEntries.slice(0, 5), myKey: myPred?.bestDefense?.id ?? null },
  ]

  // Stats par groupe
  const groupBlocks = groups.map((group) => {
    const entries = tally(
      predictions,
      (p) => {
        const gp = p.groupPredictions.find((g) => g.groupLetter === group.letter)
        return gp ? `${gp.firstTeamCode}|${gp.secondTeamCode}` : null
      },
      (p) => {
        const gp = p.groupPredictions.find((g) => g.groupLetter === group.letter)
        if (!gp) return ""
        const first = teamsByCode[gp.firstTeamCode]
        const second = teamsByCode[gp.secondTeamCode]
        return `${first?.flagEmoji ?? ""} ${first?.name ?? gp.firstTeamCode}  ·  ${second?.flagEmoji ?? ""} ${second?.name ?? gp.secondTeamCode}`
      }
    )
    const myGP = myPred?.groupPredictions.find((g) => g.groupLetter === group.letter)
    const myKey = myGP ? `${myGP.firstTeamCode}|${myGP.secondTeamCode}` : null
    return { icon: "📋", label: `Groupe ${group.letter} — qualifiés`, entries: entries.slice(0, 5), myKey }
  })

  return (
    <div className="flex flex-col gap-3">
      {/* Taux de réussite communauté */}
      {finishedMatches.length > 0 && (
        <div className="surface-card p-3">
          <div className="text-[11px] font-bold text-[var(--foreground-subtle)] uppercase tracking-wide mb-3">
            Performances de la communauté
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center gap-0.5 bg-[var(--surface-elevated)] rounded-xl py-2.5">
              <span className="text-lg font-black text-[var(--success)]">{exactPct}%</span>
              <span className="text-[9px] text-[var(--foreground-subtle)] text-center">Score exact</span>
            </div>
            <div className="flex flex-col items-center gap-0.5 bg-[var(--surface-elevated)] rounded-xl py-2.5">
              <span className="text-lg font-black text-[var(--warning)]">{correctPct}%</span>
              <span className="text-[9px] text-[var(--foreground-subtle)] text-center">Bonne issue</span>
            </div>
            <div className="flex flex-col items-center gap-0.5 bg-[var(--surface-elevated)] rounded-xl py-2.5">
              <span className="text-lg font-black text-[var(--foreground-muted)]">{finishedMatches.length}</span>
              <span className="text-[9px] text-[var(--foreground-subtle)] text-center">Matchs joués</span>
            </div>
          </div>
        </div>
      )}

      {/* Blocs bonus + groupes */}
      {[...statBlocks, ...groupBlocks].map(({ icon, label, entries, myKey }) => {
        if (entries.length === 0) return null
        return (
          <div key={label} className="surface-card overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[var(--border)]">
              <span className="text-sm">{icon}</span>
              <span className="text-xs font-bold text-[var(--foreground)]">{label}</span>
              <span className="ml-auto text-[10px] text-[var(--foreground-subtle)]">{total} votes</span>
            </div>
            <StatBars entries={entries} myKey={myKey} total={total} />
          </div>
        )
      })}
    </div>
  )
}

