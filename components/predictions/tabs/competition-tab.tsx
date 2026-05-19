"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import type { GroupStandings, TeamStanding, ResolvedMatchup } from "@/lib/wc2026-standings"

interface Props {
  allGroupStandings: GroupStandings[]
  bestThirds: TeamStanding[]
  roundOf32Matchups: ResolvedMatchup[]
}

export function CompetitionTab({ allGroupStandings, bestThirds, roundOf32Matchups }: Props) {
  const [activeSection, setActiveSection] = useState<"groups" | "thirds" | "bracket">("groups")

  const resolvedCount = roundOf32Matchups.filter((m) => m.homeTeamCode && m.awayTeamCode).length

  return (
    <div className="flex flex-col gap-3 pb-6">
      {/* Section pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <SectionPill active={activeSection === "groups"} onClick={() => setActiveSection("groups")}>
          Groupes
        </SectionPill>
        <SectionPill active={activeSection === "thirds"} onClick={() => setActiveSection("thirds")}>
          Meilleurs 3es
        </SectionPill>
        <SectionPill active={activeSection === "bracket"} onClick={() => setActiveSection("bracket")}>
          1/16 de finale {resolvedCount > 0 && <span className="ml-1 opacity-70">({resolvedCount}/16)</span>}
        </SectionPill>
      </div>

      {activeSection === "groups" && <GroupsSection standings={allGroupStandings} />}
      {activeSection === "thirds" && <ThirdsSection allGroupStandings={allGroupStandings} bestThirds={bestThirds} />}
      {activeSection === "bracket" && <BracketSection matchups={roundOf32Matchups} />}
    </div>
  )
}

function SectionPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
        active
          ? "gradient-accent text-white"
          : "bg-[var(--surface-elevated)] text-[var(--foreground-muted)] border border-[var(--border)]"
      )}
    >
      {children}
    </button>
  )
}

// ── Groups section ────────────────────────────────────────────────────────────

function GroupsSection({ standings }: { standings: GroupStandings[] }) {
  return (
    <div className="flex flex-col gap-3">
      {standings.map((g) => (
        <GroupCard key={g.letter} standings={g} />
      ))}
    </div>
  )
}

function GroupCard({ standings }: { standings: GroupStandings }) {
  const played = standings.teams.reduce((s, t) => s + t.played, 0) / 2

  return (
    <div className="surface-card overflow-hidden">
      <div className="px-3 py-2 border-b border-[var(--border)] flex items-center justify-between">
        <span className="text-xs font-bold text-[var(--foreground)]">Groupe {standings.letter}</span>
        <span className="text-[10px] text-[var(--foreground-subtle)]">{played} / 6 matchs</span>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-[9px] text-[var(--foreground-subtle)] border-b border-[var(--border)]">
            <th className="text-left px-3 py-1 font-medium w-5" />
            <th className="text-left px-2 py-1 font-medium">Équipe</th>
            <th className="text-center px-1 py-1 font-medium w-5">J</th>
            <th className="text-center px-1 py-1 font-medium w-5">G</th>
            <th className="text-center px-1 py-1 font-medium w-5">N</th>
            <th className="text-center px-1 py-1 font-medium w-5">P</th>
            <th className="text-center px-1 py-1 font-medium w-7">BP</th>
            <th className="text-center px-1 py-1 font-medium w-7">BC</th>
            <th className="text-center px-1 py-1 font-medium w-7">DB</th>
            <th className="text-center px-2 py-1 font-bold w-7">Pts</th>
          </tr>
        </thead>
        <tbody>
          {standings.teams.map((team) => {
            const qualifies = team.position <= 2
            const isThird = team.position === 3
            return (
              <tr
                key={team.code}
                className={cn(
                  "border-b border-[var(--border)] last:border-0",
                  qualifies && "bg-[var(--success-dim)]",
                  isThird && "bg-[var(--warning-dim)]"
                )}
              >
                <td className="px-3 py-1.5 text-[10px] leading-none">
                  {team.position === 1 ? "🥇" : team.position === 2 ? "🥈" : team.position === 3 ? "🥉" : "4"}
                </td>
                <td className="px-2 py-1.5">
                  <div className="flex items-center gap-1">
                    <span className="text-sm leading-none">{team.flagEmoji ?? "🏳️"}</span>
                    <span className={cn("truncate max-w-[90px] text-[11px]", qualifies ? "font-semibold text-[var(--foreground)]" : "text-[var(--foreground-muted)]")}>
                      {team.name}
                    </span>
                  </div>
                </td>
                <td className="text-center px-1 py-1.5 text-[var(--foreground-muted)]">{team.played}</td>
                <td className="text-center px-1 py-1.5 text-[var(--foreground-muted)]">{team.won}</td>
                <td className="text-center px-1 py-1.5 text-[var(--foreground-muted)]">{team.drawn}</td>
                <td className="text-center px-1 py-1.5 text-[var(--foreground-muted)]">{team.lost}</td>
                <td className="text-center px-1 py-1.5 text-[var(--foreground-muted)]">{team.goalsFor}</td>
                <td className="text-center px-1 py-1.5 text-[var(--foreground-muted)]">{team.goalsAgainst}</td>
                <td className={cn("text-center px-1 py-1.5 font-medium text-[11px]",
                  team.goalDiff > 0 ? "text-[var(--success)]" : team.goalDiff < 0 ? "text-[var(--error)]" : "text-[var(--foreground-muted)]"
                )}>
                  {team.goalDiff > 0 ? `+${team.goalDiff}` : team.goalDiff}
                </td>
                <td className="text-center px-2 py-1.5 font-black text-[var(--foreground)]">{team.points}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="px-3 py-1 flex items-center gap-3 text-[9px] text-[var(--foreground-subtle)]">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[var(--success)]/30 inline-block" />Qualifié</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[var(--warning)]/30 inline-block" />Pot 3es</span>
      </div>
    </div>
  )
}

// ── Best thirds section ───────────────────────────────────────────────────────

function ThirdsSection({ allGroupStandings, bestThirds }: { allGroupStandings: GroupStandings[]; bestThirds: TeamStanding[] }) {
  const thirds = allGroupStandings
    .map((g) => g.teams.find((t) => t.position === 3))
    .filter(Boolean) as TeamStanding[]

  const sorted = [...thirds].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff
    return b.goalsFor - a.goalsFor
  })

  const bestCodes = new Set(bestThirds.map((t) => t.code))

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <span className="text-3xl">⏳</span>
        <p className="text-sm text-[var(--foreground-muted)] text-center">
          Les meilleurs 3es s'afficheront au fil des matchs.
        </p>
      </div>
    )
  }

  return (
    <div className="surface-card overflow-hidden">
      <div className="px-3 py-2 border-b border-[var(--border)] flex items-center justify-between">
        <span className="text-xs font-bold text-[var(--foreground)]">Classement des 3es</span>
        <span className="text-[10px] text-[var(--foreground-subtle)]">{Math.min(bestThirds.length, 8)} / 8 qualifiés</span>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-[9px] text-[var(--foreground-subtle)] border-b border-[var(--border)]">
            <th className="text-left px-3 py-1 font-medium w-6">#</th>
            <th className="text-left px-2 py-1 font-medium">Équipe</th>
            <th className="text-center px-1 py-1 font-medium w-8">Pts</th>
            <th className="text-center px-1 py-1 font-medium w-8">DB</th>
            <th className="text-center px-1 py-1 font-medium w-8">BP</th>
            <th className="text-right px-3 py-1 font-medium">Statut</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((t, i) => {
            const qualifies = bestCodes.has(t.code)
            return (
              <tr key={t.code} className={cn("border-b border-[var(--border)] last:border-0", qualifies && "bg-[var(--success-dim)]")}>
                <td className="px-3 py-2 text-[var(--foreground-subtle)] font-medium">{i + 1}</td>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm leading-none">{t.flagEmoji ?? "🏳️"}</span>
                    <span className="font-medium text-[var(--foreground)] truncate max-w-[90px] text-[11px]">{t.name}</span>
                    <span className="text-[9px] text-[var(--foreground-subtle)]">Gr.{t.groupLetter}</span>
                  </div>
                </td>
                <td className="text-center px-1 py-2 font-black text-[var(--foreground)]">{t.points}</td>
                <td className={cn("text-center px-1 py-2 font-medium", t.goalDiff > 0 ? "text-[var(--success)]" : t.goalDiff < 0 ? "text-[var(--error)]" : "text-[var(--foreground-muted)]")}>
                  {t.goalDiff > 0 ? `+${t.goalDiff}` : t.goalDiff}
                </td>
                <td className="text-center px-1 py-2 text-[var(--foreground-muted)]">{t.goalsFor}</td>
                <td className="text-right px-3 py-2">
                  {qualifies
                    ? <span className="text-[10px] font-semibold text-[var(--success)]">✓ Qualifié</span>
                    : i < 8
                      ? <span className="text-[10px] text-[var(--warning)]">En attente</span>
                      : <span className="text-[10px] text-[var(--foreground-subtle)]">Éliminé</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Bracket section ───────────────────────────────────────────────────────────

function BracketSection({ matchups }: { matchups: ResolvedMatchup[] }) {
  return (
    <div className="surface-card overflow-hidden">
      <div className="px-3 py-2 border-b border-[var(--border)] flex items-center justify-between">
        <span className="text-xs font-bold text-[var(--foreground)]">1/16 de finale</span>
        <span className="text-[10px] text-[var(--foreground-subtle)]">Mis à jour en temps réel</span>
      </div>
      <div className="flex flex-col">
        {matchups.map(({ matchNumber, homeTeamCode, awayTeamCode, homeLabel, awayLabel }) => {
          const isResolved = !!homeTeamCode && !!awayTeamCode
          return (
            <div
              key={matchNumber}
              className={cn(
                "flex items-center gap-2 px-3 py-2.5 border-b border-[var(--border)] last:border-0",
                isResolved ? "bg-[var(--accent-dim)]" : ""
              )}
            >
              <span className="text-[9px] text-[var(--foreground-subtle)] w-7 shrink-0 font-mono">M{matchNumber}</span>
              <span className={cn(
                "flex-1 text-xs truncate",
                isResolved ? "text-[var(--foreground)] font-semibold" : "text-[var(--foreground-muted)] italic"
              )}>
                {homeLabel}
              </span>
              <span className="text-[10px] text-[var(--foreground-subtle)] shrink-0">vs</span>
              <span className={cn(
                "flex-1 text-xs truncate text-right",
                isResolved ? "text-[var(--foreground)] font-semibold" : "text-[var(--foreground-muted)] italic"
              )}>
                {awayLabel}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
