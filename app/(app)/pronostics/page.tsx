import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { isMatchLocked } from "@/lib/utils"
import { PredictionHub } from "@/components/predictions/prediction-hub"
import type { Metadata } from "next"
import type { MatchWithPrediction } from "@/types"

export const metadata: Metadata = { title: "Pronostics" }

export default async function PronosticsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const userId = session.user.id

  const contest = await db.contest.findFirst({
    where: { status: { in: ["ONGOING", "REGISTRATION", "DRAFT"] } },
    orderBy: { createdAt: "desc" },
    include: { settings: true },
  })

  if (!contest) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <div className="text-5xl">⚽</div>
        <p className="text-[var(--foreground-muted)]">Aucun concours actif pour le moment.</p>
      </div>
    )
  }

  // TOUS les matchs — y compris knockout sans équipes (pour permettre les pronostics anticipés)
  const matches = await db.match.findMany({
    where: { contestId: contest.id },
    orderBy: [{ phase: "asc" }, { kickoff: "asc" }, { matchNumber: "asc" }],
    include: {
      homeTeam: true,
      awayTeam: true,
      predictions: { where: { userId }, take: 1 },
    },
  })

  const matchesWithPrediction: MatchWithPrediction[] = matches.map((m) => ({
    ...m,
    prediction: m.predictions[0] ?? null,
    isLocked: isMatchLocked(m.kickoff),
  }))

  // Pronostics communautaires (uniquement pour les matchs verrouillés avec équipes connues)
  const lockedMatchIds = matchesWithPrediction
    .filter((m) => m.isLocked && m.homeTeamId)
    .map((m) => m.id)

  const communityPredictions = lockedMatchIds.length > 0
    ? await db.prediction.findMany({
        where: { matchId: { in: lockedMatchIds } },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, avatarSeed: true } },
        },
      })
    : []

  // Premier match avec équipes (deadline tournoi)
  const firstMatchWithTeams = matches.find((m) => m.homeTeamId) ?? null
  const tournamentLocked = firstMatchWithTeams ? isMatchLocked(firstMatchWithTeams.kickoff) : false

  // Pronostic tournoi (bonus)
  const myBonusPred = await db.tournamentPrediction.findUnique({
    where: { userId_contestId: { userId, contestId: contest.id } },
    include: {
      groupPredictions: true,
      winner: true,
      bestAttack: true,
      bestDefense: true,
    },
  })

  // Pronostics bonus communautaires
  const communityBonusPredictions = tournamentLocked
    ? await db.tournamentPrediction.findMany({
        where: { contestId: contest.id },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, avatarSeed: true } },
          winner: true,
          bestAttack: true,
          bestDefense: true,
          groupPredictions: true,
        },
      })
    : []

  // Équipes + groupes + buteurs
  const [teams, groups, scorerCandidates] = await Promise.all([
    db.team.findMany({ where: { contestId: contest.id }, orderBy: { name: "asc" } }),
    db.group.findMany({
      where: { contestId: contest.id },
      orderBy: { letter: "asc" },
      include: { teams: { include: { team: true } } },
    }),
    db.scorerCandidate.findMany({ where: { contestId: contest.id }, orderBy: { name: "asc" } }),
  ])

  // Comptage progression (seulement matchs avec équipes)
  const matchesWithTeams = matchesWithPrediction.filter((m) => m.homeTeamId)
  const pendingMatchCount = matchesWithTeams.filter((m) => !m.isLocked && !m.prediction).length

  const completedGroupPreds = myBonusPred?.groupPredictions.length ?? 0
  const bonusCompleted =
    (myBonusPred?.winnerId ? 1 : 0) +
    (myBonusPred?.topScorerFreeText ? 1 : 0) +
    (myBonusPred?.bestAttackId ? 1 : 0) +
    (myBonusPred?.bestDefenseId ? 1 : 0) +
    (completedGroupPreds > 0 ? 1 : 0)
  const bonusTotal = 5

  return (
    <PredictionHub
      contest={{ id: contest.id, name: contest.name, status: contest.status }}
      matches={matchesWithPrediction}
      communityPredictions={communityPredictions}
      communityBonusPredictions={communityBonusPredictions}
      teams={teams}
      groups={groups}
      scorerCandidates={scorerCandidates}
      myBonusPred={myBonusPred}
      firstMatchKickoff={firstMatchWithTeams?.kickoff ?? null}
      tournamentLocked={tournamentLocked}
      pendingMatchCount={pendingMatchCount}
      bonusCompleted={bonusCompleted}
      bonusTotal={bonusTotal}
      userId={userId}
      knockoutScoringRule={contest.settings?.knockoutScoringRule ?? "REGULAR_TIME"}
    />
  )
}
