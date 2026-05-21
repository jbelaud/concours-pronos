import { db } from "@/lib/db"
import { BonusManager } from "@/components/admin/bonus-manager"
import { SyncScorersButton } from "@/components/admin/sync-scorers-button"
import Link from "next/link"
import { cn } from "@/lib/utils"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Bonus & Résultats finaux" }

interface Props {
  searchParams: Promise<{ contestId?: string }>
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  REGISTRATION: "Inscriptions",
  ONGOING: "En cours",
  FINISHED: "Terminé",
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "text-[var(--foreground-muted)]",
  REGISTRATION: "text-[var(--accent)]",
  ONGOING: "text-[var(--success)]",
  FINISHED: "text-[var(--foreground-subtle)]",
}

export default async function BonusPage({ searchParams }: Props) {
  const { contestId } = await searchParams

  const allContests = await db.contest.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, status: true },
  })

  const contest = contestId
    ? await db.contest.findUnique({ where: { id: contestId }, include: { settings: true } })
    : await db.contest.findFirst({
        where: { status: { in: ["ONGOING", "FINISHED"] } },
        orderBy: { createdAt: "desc" },
        include: { settings: true },
      })

  const teams = contest
    ? await db.team.findMany({
        where: { contestId: contest.id },
        orderBy: [{ group: "asc" }, { name: "asc" }],
      })
    : []

  const scorerCandidates = contest
    ? await db.scorerCandidate.findMany({
        where: { contestId: contest.id },
        orderBy: { name: "asc" },
      })
    : []

  // Résultats bonus déjà appliqués : on lit ce qui est défini dans les TournamentPrediction
  // On ne stocke pas de "résultats officiels" séparément — on lit les ScorerCandidate.isWinner
  // et on déduit le vainqueur depuis le match Final (phase FINAL, status FINISHED)
  const finalMatch = contest
    ? await db.match.findFirst({
        where: { contestId: contest.id, phase: "FINAL", status: "FINISHED" },
        include: { homeTeam: true, awayTeam: true },
      })
    : null

  let currentWinnerId: string | null = null
  if (finalMatch) {
    if (finalMatch.homeScore !== null && finalMatch.awayScore !== null) {
      if (finalMatch.homeScore > finalMatch.awayScore) currentWinnerId = finalMatch.homeTeamId ?? null
      else if (finalMatch.awayScore > finalMatch.homeScore) currentWinnerId = finalMatch.awayTeamId ?? null
    }
  }

  const currentTopScorerIds = scorerCandidates.filter((s) => s.isWinner).map((s) => s.id)

  // Meilleure attaque / défense : on cherche dans les TournamentPrediction ayant des points
  // pour retrouver ce qui a été appliqué. On stocke dans un champ dédié sur le contest — mais
  // comme ce n'est pas dans le schéma, on passe null par défaut (l'admin devra re-sélectionner).
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-black text-[var(--foreground)]">Bonus & Résultats finaux</h1>
        <p className="text-xs text-[var(--foreground-muted)] mt-1">
          Désigne les lauréats pour attribuer les points bonus à tous les participants.
        </p>
      </div>

      {/* Sélecteur de concours */}
      {allContests.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {allContests.map((c) => {
            const isActive = contest?.id === c.id
            return (
              <Link
                key={c.id}
                href={`/admin/bonus?contestId=${c.id}`}
                className={cn(
                  "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all",
                  isActive
                    ? "gradient-accent text-white border-transparent"
                    : "bg-[var(--surface-elevated)] text-[var(--foreground-muted)] border-[var(--border)] hover:border-[var(--accent)]/40"
                )}
              >
                {c.name}
                <span className={cn("text-[10px] font-medium", isActive ? "text-white/70" : STATUS_COLORS[c.status])}>
                  · {STATUS_LABELS[c.status]}
                </span>
              </Link>
            )
          })}
        </div>
      )}

      {!contest ? (
        <div className="text-center py-20 text-[var(--foreground-muted)] text-sm">
          Aucun concours sélectionné.
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between -mt-2">
            <p className="text-sm text-[var(--foreground-muted)]">{contest.name}</p>
            <SyncScorersButton contestId={contest.id} scorerCount={scorerCandidates.length} />
          </div>
          <BonusManager
            contestId={contest.id}
            teams={teams}
            scorerCandidates={scorerCandidates}
            settings={{
              pointsWinner: contest.settings?.pointsWinner ?? 10,
              pointsTopScorer: contest.settings?.pointsTopScorer ?? 5,
              pointsBestAttack: contest.settings?.pointsBestAttack ?? 3,
              pointsBestDefense: contest.settings?.pointsBestDefense ?? 3,
            }}
            initialWinnerId={currentWinnerId}
            initialTopScorerIds={currentTopScorerIds}
          />
        </>
      )}
    </div>
  )
}
