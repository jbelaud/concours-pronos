import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { isMatchLocked } from "@/lib/utils"
import { PredictionHub } from "@/components/predictions/prediction-hub"
import type { Metadata } from "next"
import type { MatchWithPrediction } from "@/types"

export const metadata: Metadata = { title: "Pronostics" }

export default async function PronosticsPage({ searchParams }: { searchParams: Promise<{ contestId?: string }> }) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const userId = session.user.id

  const { contestId: requestedId } = await searchParams

  // Concours auxquels l'utilisateur participe, actifs
  const myParticipation = await db.contestParticipant.findFirst({
    where: {
      userId,
      contest: { status: { in: ["ONGOING", "REGISTRATION", "DRAFT"] } },
      ...(requestedId ? { contestId: requestedId } : {}),
    },
    include: { contest: { include: { settings: true } } },
    orderBy: { joinedAt: "desc" },
  })

  const contest = myParticipation?.contest ?? null

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

  // Premier match avec équipes (deadline tournoi) — calcul sans requête DB
  const firstMatchWithTeams = matches.find((m) => m.homeTeamId) ?? null
  const tournamentLocked = firstMatchWithTeams ? isMatchLocked(firstMatchWithTeams.kickoff) : false

  const lockedMatchIds = matchesWithPrediction
    .filter((m) => m.isLocked && m.homeTeamId)
    .map((m) => m.id)

  // Toutes les requêtes indépendantes en parallèle
  const [communityPredictions, myBonusPred, communityBonusPredictions, teams, groups, scorerCandidates] =
    await Promise.all([
      lockedMatchIds.length > 0
        ? db.prediction.findMany({
            where: { matchId: { in: lockedMatchIds } },
            include: {
              user: { select: { id: true, firstName: true, lastName: true, avatarSeed: true } },
            },
          })
        : Promise.resolve([]),
      db.tournamentPrediction.findUnique({
        where: { userId_contestId: { userId, contestId: contest.id } },
        include: {
          groupPredictions: true,
          winner: true,
          bestAttack: true,
          bestDefense: true,
        },
      }),
      tournamentLocked
        ? db.tournamentPrediction.findMany({
            where: { contestId: contest.id },
            include: {
              user: { select: { id: true, firstName: true, lastName: true, avatarSeed: true } },
              winner: true,
              bestAttack: true,
              bestDefense: true,
              groupPredictions: true,
            },
          })
        : Promise.resolve([]),
      db.team.findMany({ where: { contestId: contest.id }, orderBy: { name: "asc" } }),
      db.group.findMany({
        where: { contestId: contest.id },
        orderBy: { letter: "asc" },
        include: { teams: { include: { team: true } } },
      }),
      db.scorerCandidate.findMany({ where: { contestId: contest.id }, orderBy: { name: "asc" } }),
    ])

  // Résoudre le nom du buteur : topScorerFreeText si renseigné, sinon nom du candidat via topScorerId
  const scorerById = Object.fromEntries(scorerCandidates.map((s) => [s.id, s.name]))
  const communityBonusPredictionsResolved = communityBonusPredictions.map((p) => ({
    ...p,
    topScorerFreeText: p.topScorerFreeText ?? (p.topScorerId ? (scorerById[p.topScorerId] ?? null) : null),
  }))

  // Comptage progression (seulement matchs avec équipes)
  const matchesWithTeams = matchesWithPrediction.filter((m) => m.homeTeamId)
  const pendingMatchCount = matchesWithTeams.filter((m) => !m.isLocked && !m.prediction).length

  const completedGroupPreds = myBonusPred?.groupPredictions.length ?? 0
  const bonusCompleted =
    (myBonusPred?.winnerId ? 1 : 0) +
    (myBonusPred?.topScorerId || myBonusPred?.topScorerFreeText ? 1 : 0) +
    (myBonusPred?.bestAttackId ? 1 : 0) +
    (myBonusPred?.bestDefenseId ? 1 : 0) +
    (completedGroupPreds > 0 ? 1 : 0)
  const bonusTotal = 5

  return (
    <PredictionHub
      contest={{ id: contest.id, name: contest.name, status: contest.status }}
      matches={matchesWithPrediction}
      communityPredictions={communityPredictions}
      communityBonusPredictions={communityBonusPredictionsResolved}
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
      validatedGroupBonus={
        (contest.settings?.validatedGroupBonus as Record<string, { firstTeamCode: string; secondTeamCode: string }>) ?? {}
      }
      settings={{
        pointsCorrectResult: contest.settings?.pointsCorrectResult ?? 3,
        pointsExactScore: contest.settings?.pointsExactScore ?? 1,
        pointsWrongResult: contest.settings?.pointsWrongResult ?? 0,
        pointsWinner: contest.settings?.pointsWinner ?? 10,
        pointsTopScorer: contest.settings?.pointsTopScorer ?? 5,
        pointsBestAttack: contest.settings?.pointsBestAttack ?? 3,
        pointsBestDefense: contest.settings?.pointsBestDefense ?? 3,
        pointsGroupFirst: contest.settings?.pointsGroupFirst ?? 2,
        pointsGroupSecond: contest.settings?.pointsGroupSecond ?? 1,
      }}
    />
  )
}
