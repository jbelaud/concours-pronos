"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import type { GroupStandings, TeamStanding, ResolvedMatchup } from "@/lib/wc2026-standings"

interface KnockoutMatch {
  matchNumber: number
  phase: string
  knockoutLabel: string | null
  homeTeam: { name: string; flagEmoji: string | null } | null
  awayTeam: { name: string; flagEmoji: string | null } | null
  homeScore: number | null
  awayScore: number | null
  status: string
}

interface Props {
  allGroupStandings: GroupStandings[]
  bestThirds: TeamStanding[]
  roundOf32Matchups: ResolvedMatchup[]
  knockoutMatches: KnockoutMatch[]
}

type Section = "groups" | "thirds" | "attack" | "defense" | "bracket"

const PHASE_LABEL: Record<string, string> = {
  ROUND_OF_16: "1/8 de finale",
  QUARTER_FINAL: "Quart de finale",
  SEMI_FINAL: "Demi-finale",
  THIRD_PLACE: "Match pour la 3e place",
  FINAL: "Finale",
}

export function CompetitionTab({ allGroupStandings, bestThirds, roundOf32Matchups, knockoutMatches }: Props) {
  const [activeSection, setActiveSection] = useState<Section>("groups")

  const resolvedCount = roundOf32Matchups.filter((m) => m.homeTeamCode && m.awayTeamCode).length
  const allTeams = allGroupStandings.flatMap((g) => g.teams)
  const teamsWithMatches = allTeams.filter((t) => t.played > 0)

  // Group knockout matches by phase
  const knockoutByPhase = knockoutMatches.reduce<Record<string, KnockoutMatch[]>>((acc, m) => {
    if (!acc[m.phase]) acc[m.phase] = []
    acc[m.phase].push(m)
    return acc
  }, {})
  const hasKnockoutData = knockoutMatches.some((m) => m.homeTeam || m.awayTeam)

  return (
    <div className="flex flex-col gap-3 pb-6">
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <SectionPill active={activeSection === "groups"} onClick={() => setActiveSection("groups")}>🏟️ Groupes</SectionPill>
        <SectionPill active={activeSection === "thirds"} onClick={() => setActiveSection("thirds")}>🥉 3es</SectionPill>
        <SectionPill active={activeSection === "bracket"} onClick={() => setActiveSection("bracket")}>
          📊 Tableau final {resolvedCount > 0 && <span className="opacity-70">({resolvedCount}/16)</span>}
        </SectionPill>
        <SectionPill active={activeSection === "attack"} onClick={() => setActiveSection("attack")}>⚔️ Attaque</SectionPill>
        <SectionPill active={activeSection === "defense"} onClick={() => setActiveSection("defense")}>🛡️ Défense</SectionPill>
      </div>

      {activeSection === "groups" && <GroupsSection standings={allGroupStandings} />}
      {activeSection === "thirds" && <ThirdsSection allGroupStandings={allGroupStandings} bestThirds={bestThirds} />}
      {activeSection === "attack" && <AttackRanking teams={teamsWithMatches} />}
      {activeSection === "defense" && <DefenseRanking teams={teamsWithMatches} />}
      {activeSection === "bracket" && (
        <BracketSection
          roundOf32Matchups={roundOf32Matchups}
          knockoutByPhase={knockoutByPhase}
          hasKnockoutData={hasKnockoutData}
          allTeams={allTeams}
        />
      )}
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

// ── Attack ranking ────────────────────────────────────────────────────────────

function AttackRanking({ teams }: { teams: TeamStanding[] }) {
  const sorted = [...teams].sort((a, b) => {
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor
    return b.played !== a.played ? (b.goalsFor / b.played) - (a.goalsFor / a.played) : 0
  })
  const max = sorted[0]?.goalsFor ?? 1

  if (sorted.length === 0) {
    return <EmptyState icon="⚔️" message="Les stats d'attaque s'afficheront après les premiers matchs." />
  }

  return (
    <div className="surface-card overflow-hidden">
      <div className="px-3 py-2 border-b border-[var(--border)]">
        <span className="text-xs font-bold text-[var(--foreground)]">⚔️ Meilleures attaques</span>
        <span className="text-[10px] text-[var(--foreground-subtle)] ml-2">Buts marqués</span>
      </div>
      <div className="flex flex-col px-3 py-2 gap-2">
        {sorted.map((t, i) => {
          const avg = t.played > 0 ? (t.goalsFor / t.played).toFixed(1) : "0.0"
          return (
            <div key={t.code} className="flex items-center gap-2">
              <span className="text-[10px] text-[var(--foreground-subtle)] w-4 shrink-0 text-right">
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
              </span>
              <span className="text-base leading-none shrink-0">{t.flagEmoji ?? "🏳️"}</span>
              <span className="flex-1 text-xs text-[var(--foreground)] truncate">{t.name}</span>
              <div className="w-20 h-1.5 rounded-full bg-[var(--surface-elevated)] overflow-hidden">
                <div
                  className={cn("h-full rounded-full", i === 0 ? "bg-[var(--gold)]" : "bg-[var(--accent)]/60")}
                  style={{ width: `${Math.round((t.goalsFor / max) * 100)}%` }}
                />
              </div>
              <span className="text-xs font-black text-[var(--foreground)] w-6 text-right shrink-0">{t.goalsFor}</span>
              <span className="text-[9px] text-[var(--foreground-subtle)] w-10 text-right shrink-0">{avg}/m</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Defense ranking ───────────────────────────────────────────────────────────

function DefenseRanking({ teams }: { teams: TeamStanding[] }) {
  const sorted = [...teams].sort((a, b) => {
    if (a.goalsAgainst !== b.goalsAgainst) return a.goalsAgainst - b.goalsAgainst
    return a.played !== b.played ? (a.goalsAgainst / a.played) - (b.goalsAgainst / b.played) : 0
  })
  const max = Math.max(...sorted.map((t) => t.goalsAgainst), 1)

  if (sorted.length === 0) {
    return <EmptyState icon="🛡️" message="Les stats de défense s'afficheront après les premiers matchs." />
  }

  return (
    <div className="surface-card overflow-hidden">
      <div className="px-3 py-2 border-b border-[var(--border)]">
        <span className="text-xs font-bold text-[var(--foreground)]">🛡️ Meilleures défenses</span>
        <span className="text-[10px] text-[var(--foreground-subtle)] ml-2">Buts encaissés (moins = mieux)</span>
      </div>
      <div className="flex flex-col px-3 py-2 gap-2">
        {sorted.map((t, i) => {
          const avg = t.played > 0 ? (t.goalsAgainst / t.played).toFixed(1) : "0.0"
          // Bar inversée : moins de buts encaissés = barre plus longue
          const barPct = max > 0 ? Math.round((1 - t.goalsAgainst / max) * 100) : 100
          return (
            <div key={t.code} className="flex items-center gap-2">
              <span className="text-[10px] text-[var(--foreground-subtle)] w-4 shrink-0 text-right">
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
              </span>
              <span className="text-base leading-none shrink-0">{t.flagEmoji ?? "🏳️"}</span>
              <span className="flex-1 text-xs text-[var(--foreground)] truncate">{t.name}</span>
              <div className="w-20 h-1.5 rounded-full bg-[var(--surface-elevated)] overflow-hidden">
                <div
                  className={cn("h-full rounded-full", i === 0 ? "bg-[var(--success)]" : "bg-[var(--success)]/40")}
                  style={{ width: `${Math.max(barPct, 4)}%` }}
                />
              </div>
              <span className="text-xs font-black text-[var(--foreground)] w-6 text-right shrink-0">{t.goalsAgainst}</span>
              <span className="text-[9px] text-[var(--foreground-subtle)] w-10 text-right shrink-0">{avg}/m</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <span className="text-3xl">{icon}</span>
      <p className="text-sm text-[var(--foreground-muted)] text-center">{message}</p>
    </div>
  )
}

// ── Bracket section ───────────────────────────────────────────────────────────

function BracketSection({
  roundOf32Matchups,
  knockoutByPhase,
  hasKnockoutData,
  allTeams,
}: {
  roundOf32Matchups: ResolvedMatchup[]
  knockoutByPhase: Record<string, KnockoutMatch[]>
  hasKnockoutData: boolean
  allTeams: TeamStanding[]
}) {
  const teamByCode = Object.fromEntries(allTeams.map((t) => [t.code, t]))

  return (
    <div className="flex flex-col gap-3">
      {/* 1/16 */}
      <PhaseCard title="1/16 de finale" subtitle="Mis à jour en temps réel" defaultOpen={false}>
        {roundOf32Matchups.map(({ matchNumber, homeTeamCode, awayTeamCode, homeLabel, awayLabel }) => {
          const isResolved = !!homeTeamCode && !!awayTeamCode
          const homeTeam = homeTeamCode ? teamByCode[homeTeamCode] : null
          const awayTeam = awayTeamCode ? teamByCode[awayTeamCode] : null
          return (
            <BracketRow
              key={matchNumber}
              matchNumber={matchNumber}
              homeDisplay={homeTeam ? `${homeTeam.flagEmoji ?? ""} ${homeTeam.name}` : homeLabel}
              awayDisplay={awayTeam ? `${awayTeam.flagEmoji ?? ""} ${awayTeam.name}` : awayLabel}
              isResolved={isResolved}
            />
          )
        })}
      </PhaseCard>

      {/* 1/8 and beyond — only shown when teams are being resolved */}
      {["ROUND_OF_16", "QUARTER_FINAL", "SEMI_FINAL", "THIRD_PLACE", "FINAL"].map((phase) => {
        const phaseMatches = knockoutByPhase[phase]
        if (!phaseMatches?.length) return null
        const anyResolved = phaseMatches.some((m) => m.homeTeam || m.awayTeam)

        return (
          <PhaseCard key={phase} title={PHASE_LABEL[phase] ?? phase}>
            {phaseMatches.map((m) => {
              const isResolved = !!m.homeTeam && !!m.awayTeam
              const isFinished = m.status === "FINISHED"
              const homeDisplay = m.homeTeam
                ? `${m.homeTeam.flagEmoji ?? ""} ${m.homeTeam.name}`
                : m.knockoutLabel?.split(" vs ")[0]?.replace(/^.*?-\s*/, "") ?? "?"
              const awayDisplay = m.awayTeam
                ? `${m.awayTeam.flagEmoji ?? ""} ${m.awayTeam.name}`
                : m.knockoutLabel?.split(" vs ")[1] ?? "?"

              return (
                <BracketRow
                  key={m.matchNumber}
                  matchNumber={m.matchNumber}
                  homeDisplay={homeDisplay}
                  awayDisplay={awayDisplay}
                  isResolved={isResolved}
                  score={isFinished && m.homeScore !== null && m.awayScore !== null
                    ? `${m.homeScore} – ${m.awayScore}`
                    : undefined}
                />
              )
            })}
          </PhaseCard>
        )
      })}
    </div>
  )
}

function PhaseCard({ title, subtitle, children, defaultOpen = true }: { title: string; subtitle?: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const count = Array.isArray(children) ? children.filter(Boolean).length : (children ? 1 : 0)

  return (
    <div className="surface-card overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-[var(--surface-elevated)] transition-colors"
      >
        <span className="text-xs font-bold text-[var(--foreground)]">{title}</span>
        <div className="flex items-center gap-2">
          {subtitle && <span className="text-[10px] text-[var(--foreground-subtle)]">{subtitle}</span>}
          {!open && <span className="text-[10px] text-[var(--foreground-subtle)]">{count} match{count > 1 ? "s" : ""}</span>}
          <span className={cn("text-[var(--foreground-subtle)] transition-transform duration-200", open ? "rotate-0" : "-rotate-90")}>
            ▾
          </span>
        </div>
      </button>
      {open && <div className="flex flex-col border-t border-[var(--border)]">{children}</div>}
    </div>
  )
}

function BracketRow({
  matchNumber,
  homeDisplay,
  awayDisplay,
  isResolved,
  score,
}: {
  matchNumber: number
  homeDisplay: string
  awayDisplay: string
  isResolved: boolean
  score?: string
}) {
  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2.5 border-b border-[var(--border)] last:border-0",
      isResolved ? "bg-[var(--accent-dim)]" : ""
    )}>
      <span className="text-[9px] text-[var(--foreground-subtle)] w-7 shrink-0 font-mono">M{matchNumber}</span>
      <span className={cn("flex-1 text-xs truncate", isResolved ? "text-[var(--foreground)] font-semibold" : "text-[var(--foreground-muted)] italic")}>
        {homeDisplay}
      </span>
      {score
        ? <span className="text-xs font-black text-[var(--foreground)] shrink-0 tabular-nums">{score}</span>
        : <span className="text-[10px] text-[var(--foreground-subtle)] shrink-0">vs</span>
      }
      <span className={cn("flex-1 text-xs truncate text-right", isResolved ? "text-[var(--foreground)] font-semibold" : "text-[var(--foreground-muted)] italic")}>
        {awayDisplay}
      </span>
    </div>
  )
}
