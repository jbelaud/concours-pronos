"use client"

import {
  CheckCircle2,
  Target,
  Trophy,
  Users,
  Star,
  Swords,
  Shield,
  Medal,
  ArrowUpDown,
  Clock,
} from "lucide-react"
import type { TieBreakerKey } from "@/lib/ranking"

interface ScoringSettings {
  pointsCorrectResult: number
  pointsExactScore: number
  pointsWinner: number
  pointsTopScorer: number
  pointsBestAttack: number
  pointsBestDefense: number
  pointsGroupFirst: number
  pointsGroupSecond: number
  knockoutScoringRule: "REGULAR_TIME" | "FULL_TIME"
  tieBreakerOrder: TieBreakerKey[]
}

interface Props {
  settings: ScoringSettings
}

const TIE_BREAKER_META: Record<
  TieBreakerKey,
  { label: string; description: string; icon: React.ReactNode; color: string; bg: string; border: string }
> = {
  exactScores: {
    label: "Scores exacts",
    description: "Nombre de scores parfaits trouvés",
    icon: <Target size={18} />,
    color: "text-[var(--accent)]",
    bg: "bg-[var(--accent-dim)]",
    border: "border-[var(--accent)]/30",
  },
  correctResults: {
    label: "Résultats 1N2",
    description: "Nombre de bons résultats (V/N/D)",
    icon: <CheckCircle2 size={18} />,
    color: "text-[var(--success)]",
    bg: "bg-[var(--success-dim)]",
    border: "border-[var(--success)]/30",
  },
  finalWinner: {
    label: "Vainqueur final",
    description: "A prédit le bon vainqueur de la compétition",
    icon: <Trophy size={18} />,
    color: "text-[var(--gold)]",
    bg: "bg-[var(--gold)]/10",
    border: "border-[var(--gold)]/30",
  },
}

interface ScoreRow {
  icon: React.ReactNode
  label: string
  points: number
  color: string
  bg: string
  border: string
}

export function ContestRulesTab({ settings }: Props) {
  const scoreRows: ScoreRow[] = [
    {
      icon: <CheckCircle2 size={16} />,
      label: "Résultat correct (1N2)",
      points: settings.pointsCorrectResult,
      color: "text-[var(--success)]",
      bg: "bg-[var(--success-dim)]",
      border: "border-[var(--success)]/20",
    },
    {
      icon: <Target size={16} />,
      label: "Score exact (bonus additionnel)",
      points: settings.pointsExactScore,
      color: "text-[var(--accent)]",
      bg: "bg-[var(--accent-dim)]",
      border: "border-[var(--accent)]/20",
    },
    {
      icon: <Trophy size={16} />,
      label: "Vainqueur de la compétition",
      points: settings.pointsWinner,
      color: "text-[var(--gold)]",
      bg: "bg-[var(--gold)]/10",
      border: "border-[var(--gold)]/20",
    },
    {
      icon: <Star size={16} />,
      label: "Meilleur buteur",
      points: settings.pointsTopScorer,
      color: "text-[var(--purple)]",
      bg: "bg-[var(--purple-dim)]",
      border: "border-[var(--purple)]/20",
    },
    {
      icon: <Swords size={16} />,
      label: "Meilleure attaque",
      points: settings.pointsBestAttack,
      color: "text-[var(--warning)]",
      bg: "bg-[var(--warning-dim)]",
      border: "border-[var(--warning)]/20",
    },
    {
      icon: <Shield size={16} />,
      label: "Meilleure défense",
      points: settings.pointsBestDefense,
      color: "text-[var(--foreground-muted)]",
      bg: "bg-[var(--surface-elevated)]",
      border: "border-[var(--border)]",
    },
    {
      icon: <Medal size={16} />,
      label: "1er de groupe",
      points: settings.pointsGroupFirst,
      color: "text-[var(--gold)]",
      bg: "bg-[var(--gold)]/10",
      border: "border-[var(--gold)]/20",
    },
    {
      icon: <Users size={16} />,
      label: "2e de groupe",
      points: settings.pointsGroupSecond,
      color: "text-[var(--silver)]",
      bg: "bg-[var(--silver)]/10",
      border: "border-[var(--silver)]/20",
    },
  ]

  return (
    <div className="flex flex-col gap-5">

      {/* Avertissement saisie manuelle */}
      <div className="flex items-start gap-3 p-3.5 rounded-xl border border-[var(--warning)]/30 bg-[var(--warning-dim)]">
        <Clock size={15} className="text-[var(--warning)] mt-0.5 shrink-0" />
        <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">
          <span className="font-semibold text-[var(--foreground)]">Mise à jour manuelle — </span>
          Les résultats des matchs, le vainqueur de la compétition, le meilleur buteur ainsi que les bonus sont saisis manuellement. Un léger décalage dans le classement est possible entre la fin d&apos;un match et sa prise en compte.
        </p>
      </div>

      {/* Barème des points */}
      <section className="surface-card p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2 mb-1">
          <Star size={14} className="text-[var(--accent)]" />
          <h3 className="text-sm font-bold text-[var(--foreground)]">Barème des points</h3>
        </div>
        <div className="flex flex-col gap-2">
          {scoreRows.map((row) => (
            <div
              key={row.label}
              className={`flex items-center gap-3 p-3 rounded-xl border ${row.bg} ${row.border}`}
            >
              <span className={`shrink-0 ${row.color}`}>{row.icon}</span>
              <span className="flex-1 text-sm text-[var(--foreground)]">{row.label}</span>
              <span className={`font-black text-base tabular-nums ${row.color}`}>
                +{row.points}
              </span>
            </div>
          ))}
        </div>

        {/* Note règle knockout */}
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border)] mt-1">
          <Swords size={11} className="text-[var(--foreground-subtle)] mt-0.5 shrink-0" />
          <p className="text-[11px] text-[var(--foreground-muted)]">
            <span className="font-semibold text-[var(--foreground)]">Phases éliminatoires — </span>
            {settings.knockoutScoringRule === "REGULAR_TIME"
              ? "Les pronostics sont évalués sur le score à 90'. Les prolongations et tirs au but ne comptent pas."
              : "Les pronostics sont évalués sur le score final (prolongations incluses). Les tirs au but ne comptent pas."}
          </p>
        </div>
      </section>

      {/* Règles de départage */}
      <section className="surface-card p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2 mb-1">
          <ArrowUpDown size={14} className="text-[var(--foreground-muted)]" />
          <h3 className="text-sm font-bold text-[var(--foreground)]">Départage en cas d&apos;égalité</h3>
        </div>
        <p className="text-xs text-[var(--foreground-muted)]">
          Si deux joueurs ont le même score total, ils sont départagés dans cet ordre&nbsp;:
        </p>

        <div className="flex flex-col gap-2">
          {settings.tieBreakerOrder.map((key, idx) => {
            const meta = TIE_BREAKER_META[key]
            if (!meta) return null
            return (
              <div
                key={key}
                className={`flex items-center gap-3 p-3 rounded-xl border ${meta.bg} ${meta.border}`}
              >
                {/* Numéro de priorité */}
                <div className="shrink-0 w-7 h-7 rounded-full bg-[var(--surface-card)] border border-[var(--border)] flex items-center justify-center">
                  <span className="text-xs font-black text-[var(--foreground)]">{idx + 1}</span>
                </div>

                {/* Icône */}
                <span className={`shrink-0 ${meta.color}`}>{meta.icon}</span>

                {/* Texte */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[var(--foreground)] leading-tight">
                    {meta.label}
                  </p>
                  <p className="text-[11px] text-[var(--foreground-muted)]">
                    {meta.description}
                  </p>
                </div>

                {/* Badge priorité */}
                {idx === 0 && (
                  <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--accent)] text-white">
                    1er critère
                  </span>
                )}
              </div>
            )
          })}
        </div>

        <p className="text-[11px] text-[var(--foreground-subtle)] mt-1">
          Si les joueurs sont toujours à égalité après tous les critères, ils partagent le même rang.
        </p>
      </section>

    </div>
  )
}
