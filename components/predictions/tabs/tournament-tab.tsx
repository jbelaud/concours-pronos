"use client"

import { useState, useTransition } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { upsertBonusPrediction, upsertGroupPrediction } from "@/actions/predictions.actions"
import { toast } from "sonner"
import { Lock, CheckCircle, ChevronDown, ChevronUp, Trophy, Target, Shield, Sword, Users } from "lucide-react"
import { formatKickoff, cn } from "@/lib/utils"
import { FootballAvatar } from "@/components/shared/football-avatar"
import type { Team, ScorerCandidate } from "@/types"

interface GroupWithTeams {
  id: string
  letter: string
  name: string
  teams: Array<{ teamId: string; team: Team }>
}

interface BonusPred {
  id: string
  winnerId: string | null
  topScorerFreeText: string | null
  bestAttackId: string | null
  bestDefenseId: string | null
  winner: Team | null
  bestAttack: Team | null
  bestDefense: Team | null
  groupPredictions: Array<{ groupLetter: string; firstTeamCode: string; secondTeamCode: string }>
}

interface Props {
  contestId: string
  teams: Team[]
  groups: GroupWithTeams[]
  scorerCandidates: ScorerCandidate[]
  myBonusPred: BonusPred | null
  firstMatchKickoff: Date | null
  tournamentLocked: boolean
}

type Section = "winner" | "groups" | "scorer" | "attack" | "defense"

export function TournamentTab({
  contestId,
  teams,
  groups,
  scorerCandidates,
  myBonusPred,
  firstMatchKickoff,
  tournamentLocked,
}: Props) {
  const [openSection, setOpenSection] = useState<Section | null>("winner")

  const toggle = (s: Section) => setOpenSection((prev) => (prev === s ? null : s))

  return (
    <div className="flex flex-col gap-2 pb-6">
      {/* Deadline banner */}
      {!tournamentLocked && firstMatchKickoff && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--warning-dim)] border border-[var(--warning)]/20">
          <Lock size={14} className="text-[var(--warning)] shrink-0" />
          <div>
            <div className="text-xs font-semibold text-[var(--warning)]">Verrouillage au 1er match</div>
            <div className="text-[11px] text-[var(--foreground-muted)]">
              {formatKickoff(firstMatchKickoff, "EEE d MMM · HH:mm")}
            </div>
          </div>
        </div>
      )}
      {tournamentLocked && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)]">
          <Lock size={14} className="text-[var(--foreground-subtle)] shrink-0" />
          <span className="text-xs text-[var(--foreground-muted)]">Pronostics tournoi verrouillés</span>
        </div>
      )}

      {/* Sections accordéon */}
      <TournamentSection
        id="winner"
        label="Vainqueur du tournoi"
        icon={<Trophy size={15} className="text-[var(--gold)]" />}
        isOpen={openSection === "winner"}
        onToggle={() => toggle("winner")}
        isDone={!!myBonusPred?.winnerId}
        locked={tournamentLocked}
      >
        <TeamSelector
          teams={teams}
          selectedId={myBonusPred?.winnerId ?? null}
          onSelect={(id) => saveBonus(contestId, { winnerId: id })}
          locked={tournamentLocked}
        />
      </TournamentSection>

      <TournamentSection
        id="groups"
        label="Classement des groupes"
        icon={<Users size={15} className="text-[var(--accent)]" />}
        isOpen={openSection === "groups"}
        onToggle={() => toggle("groups")}
        isDone={(myBonusPred?.groupPredictions.length ?? 0) > 0}
        locked={tournamentLocked}
      >
        <GroupsSelector
          contestId={contestId}
          groups={groups}
          myPredictions={myBonusPred?.groupPredictions ?? []}
          locked={tournamentLocked}
        />
      </TournamentSection>

      <TournamentSection
        id="scorer"
        label="Meilleur buteur"
        icon={<Target size={15} className="text-[var(--success)]" />}
        isOpen={openSection === "scorer"}
        onToggle={() => toggle("scorer")}
        isDone={!!myBonusPred?.topScorerFreeText}
        locked={tournamentLocked}
      >
        <ScorerInput
          value={myBonusPred?.topScorerFreeText ?? ""}
          candidates={scorerCandidates}
          onSave={(text) => saveBonus(contestId, { topScorerFreeText: text })}
          locked={tournamentLocked}
        />
      </TournamentSection>

      <TournamentSection
        id="attack"
        label="Meilleure attaque"
        icon={<Sword size={15} className="text-[var(--error)]" />}
        isOpen={openSection === "attack"}
        onToggle={() => toggle("attack")}
        isDone={!!myBonusPred?.bestAttackId}
        locked={tournamentLocked}
      >
        <TeamSelector
          teams={teams}
          selectedId={myBonusPred?.bestAttackId ?? null}
          onSelect={(id) => saveBonus(contestId, { bestAttackId: id })}
          locked={tournamentLocked}
        />
      </TournamentSection>

      <TournamentSection
        id="defense"
        label="Meilleure défense"
        icon={<Shield size={15} className="text-[var(--purple)]" />}
        isOpen={openSection === "defense"}
        onToggle={() => toggle("defense")}
        isDone={!!myBonusPred?.bestDefenseId}
        locked={tournamentLocked}
      >
        <TeamSelector
          teams={teams}
          selectedId={myBonusPred?.bestDefenseId ?? null}
          onSelect={(id) => saveBonus(contestId, { bestDefenseId: id })}
          locked={tournamentLocked}
        />
      </TournamentSection>
    </div>
  )
}

async function saveBonus(contestId: string, data: {
  winnerId?: string
  topScorerFreeText?: string
  bestAttackId?: string
  bestDefenseId?: string
}) {
  const result = await upsertBonusPrediction({ contestId, ...data })
  if (result?.error) toast.error(result.error)
  else toast.success("Pronostic enregistré !")
}

// ── Accordion section ────────────────────────────────────────────────────────

function TournamentSection({
  id, label, icon, isOpen, onToggle, isDone, locked, children,
}: {
  id: Section
  label: string
  icon: React.ReactNode
  isOpen: boolean
  onToggle: () => void
  isDone: boolean
  locked: boolean
  children: React.ReactNode
}) {
  return (
    <div className="surface-card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3.5 text-left"
      >
        <div className="w-8 h-8 rounded-lg bg-[var(--surface-elevated)] flex items-center justify-center shrink-0">
          {icon}
        </div>
        <span className="flex-1 text-sm font-semibold text-[var(--foreground)]">{label}</span>
        <div className="flex items-center gap-2">
          {isDone && <CheckCircle size={14} className="text-[var(--success)]" />}
          {locked && <Lock size={13} className="text-[var(--foreground-subtle)]" />}
          {isOpen ? <ChevronUp size={14} className="text-[var(--foreground-muted)]" /> : <ChevronDown size={14} className="text-[var(--foreground-muted)]" />}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-[var(--border)]"
          >
            <div className="p-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Team selector ─────────────────────────────────────────────────────────────

function TeamSelector({
  teams, selectedId, onSelect, locked,
}: {
  teams: Team[]
  selectedId: string | null
  onSelect: (id: string) => void
  locked: boolean
}) {
  const [isPending, startTransition] = useTransition()

  const handleSelect = (id: string) => {
    if (locked) return
    startTransition(async () => {
      await onSelect(id)
    })
  }

  return (
    <div className="grid grid-cols-3 gap-1.5 max-h-72 overflow-y-auto">
      {teams.map((team) => {
        const isSelected = team.id === selectedId
        return (
          <button
            key={team.id}
            onClick={() => handleSelect(team.id)}
            disabled={locked || isPending}
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-xl border transition-all text-center",
              isSelected
                ? "border-[var(--accent)] bg-[var(--accent-dim)] shadow-sm"
                : "border-[var(--border)] bg-[var(--surface-elevated)] hover:border-[var(--border-strong)]",
              locked && "opacity-60 cursor-not-allowed"
            )}
          >
            <span className="text-2xl leading-none">{team.flagEmoji ?? "🏳️"}</span>
            <span className={cn(
              "text-[10px] font-semibold leading-tight",
              isSelected ? "text-[var(--accent)]" : "text-[var(--foreground-muted)]"
            )}>
              {team.name}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ── Scorer input ──────────────────────────────────────────────────────────────

function ScorerInput({
  value: initialValue, candidates, onSave, locked,
}: {
  value: string
  candidates: ScorerCandidate[]
  onSave: (text: string) => void
  locked: boolean
}) {
  const [value, setValue] = useState(initialValue)
  const [isPending, startTransition] = useTransition()

  const filtered = candidates.filter(
    (c) => c.name.toLowerCase().includes(value.toLowerCase()) && value.length > 0
  ).slice(0, 5)

  const handleSave = (name: string) => {
    setValue(name)
    startTransition(async () => {
      await onSave(name)
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => value && handleSave(value)}
          placeholder="Ex : Kylian Mbappé"
          disabled={locked}
          className="flex-1 py-2.5 px-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] text-sm placeholder:text-[var(--foreground-subtle)] focus:outline-none focus:border-[var(--accent)] transition-colors disabled:opacity-60"
        />
        {!locked && value && (
          <button
            onClick={() => handleSave(value)}
            disabled={isPending}
            className="px-3 py-2 rounded-xl gradient-accent text-white text-xs font-semibold"
          >
            {isPending ? "..." : "OK"}
          </button>
        )}
      </div>
      {filtered.length > 0 && !locked && (
        <div className="flex flex-col gap-1">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => handleSave(c.name)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] hover:border-[var(--accent)]/40 text-sm text-[var(--foreground)] text-left transition-colors"
            >
              <span className="text-[var(--foreground-muted)] text-xs">{c.teamCode}</span>
              {c.name}
            </button>
          ))}
        </div>
      )}
      <p className="text-[10px] text-[var(--foreground-subtle)]">
        Un seul choix possible · Validé manuellement par l&apos;admin en fin de tournoi
      </p>
    </div>
  )
}

// ── Groups selector ───────────────────────────────────────────────────────────

function GroupsSelector({
  contestId, groups, myPredictions, locked,
}: {
  contestId: string
  groups: GroupWithTeams[]
  myPredictions: Array<{ groupLetter: string; firstTeamCode: string; secondTeamCode: string }>
  locked: boolean
}) {
  const predMap = Object.fromEntries(myPredictions.map((p) => [p.groupLetter, p]))

  return (
    <div className="flex flex-col gap-3">
      {groups.map((group) => (
        <GroupCard
          key={group.id}
          contestId={contestId}
          group={group}
          prediction={predMap[group.letter] ?? null}
          locked={locked}
        />
      ))}
    </div>
  )
}

function GroupCard({
  contestId, group, prediction, locked,
}: {
  contestId: string
  group: GroupWithTeams
  prediction: { firstTeamCode: string; secondTeamCode: string } | null
  locked: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [first, setFirst] = useState(prediction?.firstTeamCode ?? "")
  const [second, setSecond] = useState(prediction?.secondTeamCode ?? "")

  const save = (f: string, s: string) => {
    if (!f || !s || f === s) return
    startTransition(async () => {
      const result = await upsertGroupPrediction({
        contestId,
        groupLetter: group.letter,
        firstTeamCode: f,
        secondTeamCode: s,
      })
      if (result?.error) toast.error(result.error)
    })
  }

  const teams = group.teams.map((gt) => gt.team)
  const isDone = !!first && !!second && first !== second

  return (
    <div className={cn(
      "p-3 rounded-xl border",
      isDone ? "border-[var(--success)]/30 bg-[var(--success-dim)]" : "border-[var(--border)] bg-[var(--surface-elevated)]"
    )}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-[var(--foreground)]">Groupe {group.letter}</span>
        {isDone && <CheckCircle size={13} className="text-[var(--success)]" />}
      </div>

      <div className="flex flex-col gap-1.5">
        {[
          { label: "🥇 1er", value: first, setter: setFirst, otherValue: second },
          { label: "🥈 2e", value: second, setter: setSecond, otherValue: first },
        ].map(({ label, value, setter, otherValue }) => (
          <div key={label} className="flex items-center gap-2">
            <span className="text-[11px] w-10 shrink-0 text-[var(--foreground-muted)]">{label}</span>
            <select
              value={value}
              disabled={locked || isPending}
              onChange={(e) => {
                const v = e.target.value
                setter(v)
                const newFirst = label.includes("1er") ? v : first
                const newSecond = label.includes("2e") ? v : second
                save(newFirst, newSecond)
              }}
              className="flex-1 py-1.5 px-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] text-xs focus:outline-none focus:border-[var(--accent)] disabled:opacity-60"
            >
              <option value="">— Choisir —</option>
              {teams
                .filter((t) => t.code !== otherValue)
                .map((team) => (
                  <option key={team.id} value={team.code}>
                    {team.flagEmoji} {team.name}
                  </option>
                ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  )
}
