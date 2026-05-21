import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { Crosshair, Swords, Shield, ArrowRight, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"
import { FootballAvatar } from "@/components/shared/football-avatar"
import { ShareResultButton } from "@/components/shared/share-result-button"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Clôture du concours" }

export default async function ContestClosurePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) redirect("/login")

  // Check participant
  const participation = await db.contestParticipant.findUnique({
    where: { contestId_userId: { contestId: id, userId: session.user.id } },
  })
  if (!participation) notFound()

  const contest = await db.contest.findUnique({
    where: { id },
    include: {
      settings: true,
      template: { select: { name: true } },
      prizepool: { include: { payouts: { orderBy: { position: "asc" } } } },
    },
  })
  if (!contest) notFound()

  // Leaderboard top 10
  const entries = await db.leaderboardEntry.findMany({
    where: { contestId: id },
    orderBy: [{ rank: "asc" }, { exactScores: "desc" }],
    take: 10,
    include: {
      user: { select: { id: true, firstName: true, lastName: true, avatarSeed: true } },
    },
  })

  const myEntry = entries.find((e) => e.userId === session.user.id)
    ?? await db.leaderboardEntry.findUnique({
      where: { contestId_userId: { contestId: id, userId: session.user.id } },
      include: { user: { select: { id: true, firstName: true, lastName: true, avatarSeed: true } } },
    })

  const totalParticipants = await db.leaderboardEntry.count({ where: { contestId: id } })

  // Stats globales
  const allPredictions = await db.prediction.findMany({
    where: { contestId: id },
    select: { status: true, points: true },
  })
  const totalExact = allPredictions.filter((p) => p.status === "EXACT_SCORE").length
  const totalCorrect = allPredictions.filter((p) => p.status === "CORRECT_RESULT").length
  const totalWrong = allPredictions.filter((p) => p.status === "WRONG").length
  const totalPred = allPredictions.length

  // Bonus winner
  const finalMatch = await db.match.findFirst({
    where: { contestId: id, phase: "FINAL", status: "FINISHED" },
    include: { homeTeam: true, awayTeam: true },
  })
  let winnerTeam: { name: string; flagEmoji: string | null } | null = null
  if (finalMatch?.homeScore !== null && finalMatch?.awayScore !== null) {
    if ((finalMatch?.homeScore ?? 0) > (finalMatch?.awayScore ?? 0)) winnerTeam = finalMatch?.homeTeam ?? null
    else winnerTeam = finalMatch?.awayTeam ?? null
  }

  // Top scorers
  const topScorers = await db.scorerCandidate.findMany({
    where: { contestId: id, isWinner: true },
  })

  // Best attack / defense (from bonus predictions that got points)
  const bonusPredWithPoints = await db.tournamentPrediction.findMany({
    where: { contestId: id, points: { gt: 0 } },
    include: {
      bestAttack: { select: { name: true, flagEmoji: true } },
      bestDefense: { select: { name: true, flagEmoji: true } },
    },
    take: 1,
  })

  const itmCount = contest.prizepool?.itmCount ?? 3
  const payouts = contest.prizepool?.payouts ?? []

  const podium = entries.filter((e) => e.rank <= 3)
  const rest = entries.filter((e) => e.rank > 3)

  return (
    <div className="flex flex-col gap-5 pb-6">

      {/* Header clôture */}
      <div className="flex flex-col items-center text-center gap-2 pt-2">
        <div className="text-5xl mb-1">🏁</div>
        <h1 className="text-2xl font-black text-[var(--foreground)]">Concours terminé !</h1>
        <p className="text-sm text-[var(--foreground-muted)]">{contest.name}</p>
        {contest.template && (
          <p className="text-xs text-[var(--foreground-subtle)]">{contest.template.name}</p>
        )}
      </div>

      {/* Mon résultat */}
      {myEntry && (
        <div className={cn(
          "surface-card p-4 flex flex-col items-center gap-2 border-2",
          myEntry.rank === 1 ? "border-[var(--gold)]/50 bg-[var(--gold)]/5"
            : myEntry.rank === 2 ? "border-[var(--silver)]/40 bg-[var(--silver)]/5"
            : myEntry.rank === 3 ? "border-[var(--bronze)]/40 bg-[var(--bronze)]/5"
            : myEntry.rank <= itmCount ? "border-[var(--accent)]/30 bg-[var(--accent-dim)]"
            : "border-[var(--border)]"
        )}>
          <p className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wide">Mon résultat</p>
          <div className="flex items-center gap-3">
            <span className="text-4xl font-black text-[var(--foreground)]">
              {myEntry.rank === 1 ? "🥇" : myEntry.rank === 2 ? "🥈" : myEntry.rank === 3 ? "🥉" : `${myEntry.rank}e`}
            </span>
            <div className="flex flex-col">
              <span className="text-2xl font-black text-[var(--accent)]">{myEntry.totalPoints} pts</span>
              <span className="text-xs text-[var(--foreground-muted)]">sur {totalParticipants} participants</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-[var(--foreground-subtle)] mt-1">
            <span className="text-[var(--success)] font-semibold">{myEntry.exactScores} exacts</span>
            <span>·</span>
            <span className="text-[var(--warning)] font-semibold">{myEntry.correctResults - myEntry.exactScores} bons résultats</span>
            <span>·</span>
            <span className="text-[var(--foreground-subtle)] font-semibold">{myEntry.bonusPoints} pts bonus</span>
          </div>
          {payouts.find((p) => p.position === myEntry.rank) && (
            <div className="mt-1 px-3 py-1.5 rounded-xl bg-[var(--gold)]/20 border border-[var(--gold)]/30">
              <span className="text-sm font-black text-[var(--gold)]">
                🎉 {payouts.find((p) => p.position === myEntry.rank)?.amount}€ gagnés !
              </span>
            </div>
          )}
        </div>
      )}

      {/* Podium */}
      {podium.length > 0 && (
        <section className="flex flex-col gap-2">
          <p className="text-[11px] font-bold text-[var(--foreground-subtle)] uppercase tracking-wide px-1">
            Podium
          </p>
          <div className="flex flex-col gap-2">
            {podium.map((entry) => {
              const payout = payouts.find((p) => p.position === entry.rank)
              return (
                <div
                  key={entry.userId}
                  className={cn(
                    "surface-card p-3 flex items-center gap-3",
                    entry.rank === 1 && "border-[var(--gold)]/40 bg-[var(--gold)]/5",
                    entry.rank === 2 && "border-[var(--silver)]/30",
                    entry.rank === 3 && "border-[var(--bronze)]/30",
                  )}
                >
                  <span className="text-2xl w-8 text-center shrink-0">
                    {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : "🥉"}
                  </span>
                  <FootballAvatar seed={entry.user.avatarSeed} size={36} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[var(--foreground)] truncate">
                      {entry.user.firstName} {entry.user.lastName}
                      {entry.userId === session.user.id && (
                        <span className="ml-1.5 text-[10px] text-[var(--accent)] font-semibold">Moi</span>
                      )}
                    </p>
                    <p className="text-xs text-[var(--foreground-muted)]">
                      {entry.exactScores} exacts · {entry.correctResults - entry.exactScores} bons résultats
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-base font-black text-[var(--foreground)]">{entry.totalPoints} pts</span>
                    {payout && (
                      <span className="text-xs font-bold text-[var(--gold)]">{payout.amount}€</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Suite du classement (4e → 10e) */}
      {rest.length > 0 && (
        <section className="flex flex-col gap-1.5">
          <p className="text-[11px] font-bold text-[var(--foreground-subtle)] uppercase tracking-wide px-1">
            Classement complet
          </p>
          <div className="surface-card divide-y divide-[var(--border)]">
            {rest.map((entry) => {
              const payout = payouts.find((p) => p.position === entry.rank)
              const isMe = entry.userId === session.user.id
              return (
                <div key={entry.userId} className={cn("flex items-center gap-3 px-3 py-2.5", isMe && "bg-[var(--accent-dim)]")}>
                  <span className="text-xs font-bold text-[var(--foreground-muted)] w-6 text-center shrink-0">
                    {entry.rank}
                  </span>
                  <FootballAvatar seed={entry.user.avatarSeed} size={28} />
                  <span className="flex-1 text-sm font-semibold text-[var(--foreground)] truncate">
                    {entry.user.firstName} {entry.user.lastName}
                    {isMe && <span className="ml-1.5 text-[10px] text-[var(--accent)]">Moi</span>}
                  </span>
                  <div className="flex items-center gap-2">
                    {payout && <span className="text-xs font-bold text-[var(--gold)]">{payout.amount}€</span>}
                    <span className="text-sm font-black text-[var(--foreground)]">{entry.totalPoints} pts</span>
                  </div>
                </div>
              )
            })}
            {totalParticipants > 10 && (
              <div className="px-3 py-2 text-center text-xs text-[var(--foreground-subtle)]">
                + {totalParticipants - 10} autres participants
              </div>
            )}
          </div>
        </section>
      )}

      {/* Palmarès de la compétition */}
      <section className="flex flex-col gap-2">
        <p className="text-[11px] font-bold text-[var(--foreground-subtle)] uppercase tracking-wide px-1">
          Palmarès de la compétition
        </p>
        <div className="flex flex-col gap-2">
          {winnerTeam && (
            <PalmaresRow icon={<Trophy size={15} className="text-[var(--gold)]" />} label="Vainqueur" value={`${winnerTeam.flagEmoji ?? ""} ${winnerTeam.name}`} />
          )}
          {topScorers.length > 0 && (
            <PalmaresRow
              icon={<Crosshair size={15} className="text-[var(--warning)]" />}
              label="Meilleur buteur"
              value={topScorers.map((s) => s.name).join(", ")}
            />
          )}
          {bonusPredWithPoints[0]?.bestAttack && (
            <PalmaresRow
              icon={<Swords size={15} className="text-[var(--error)]" />}
              label="Meilleure attaque"
              value={`${bonusPredWithPoints[0].bestAttack.flagEmoji ?? ""} ${bonusPredWithPoints[0].bestAttack.name}`}
            />
          )}
          {bonusPredWithPoints[0]?.bestDefense && (
            <PalmaresRow
              icon={<Shield size={15} className="text-[var(--success)]" />}
              label="Meilleure défense"
              value={`${bonusPredWithPoints[0].bestDefense.flagEmoji ?? ""} ${bonusPredWithPoints[0].bestDefense.name}`}
            />
          )}
        </div>
      </section>

      {/* Stats globales */}
      <section className="flex flex-col gap-2">
        <p className="text-[11px] font-bold text-[var(--foreground-subtle)] uppercase tracking-wide px-1">
          Stats de la communauté
        </p>
        <div className="surface-card p-4 flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-2">
            <StatChip label="Scores exacts" value={String(totalExact)} color="success" />
            <StatChip label="Bons résultats" value={String(totalCorrect)} color="warning" />
            <StatChip label="Ratés" value={String(totalWrong)} color="muted" />
          </div>
          {totalPred > 0 && (
            <p className="text-[10px] text-[var(--foreground-subtle)] text-center">
              Sur {totalPred} pronostics au total · {Math.round((totalExact / totalPred) * 100)}% de scores exacts
            </p>
          )}
        </div>
      </section>

      {/* Partage */}
      {myEntry && (() => {
        const rankLabel = myEntry.rank === 1 ? "1er 🥇" : myEntry.rank === 2 ? "2e 🥈" : myEntry.rank === 3 ? "3e 🥉" : `${myEntry.rank}e`
        const shareText = [
          `🏆 ${contest.name}`,
          `Je termine ${rankLabel} avec ${myEntry.totalPoints} pts sur ${totalParticipants} participants !`,
          `✅ ${myEntry.exactScores} scores exacts · 🎯 ${myEntry.correctResults - myEntry.exactScores} bons résultats`,
          winnerTeam ? `🏅 Vainqueur : ${winnerTeam.flagEmoji ?? ""} ${winnerTeam.name}` : "",
          `\nQui fait mieux ? 😏`,
        ].filter(Boolean).join("\n")

        return <ShareResultButton text={shareText} />
      })()}

      {/* Bouton retour au concours */}
      <Link
        href={`/accueil?contestId=${id}`}
        className="flex items-center justify-center gap-2 py-3.5 rounded-xl border border-[var(--border)] text-[var(--foreground)] font-bold text-sm hover:border-[var(--accent)]/40 transition-colors"
      >
        Voir le concours
        <ArrowRight size={16} />
      </Link>

    </div>
  )
}

function PalmaresRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="surface-card p-3 flex items-center gap-3">
      <div className="shrink-0">{icon}</div>
      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-[10px] text-[var(--foreground-subtle)] uppercase tracking-wide">{label}</span>
        <span className="text-sm font-bold text-[var(--foreground)] truncate">{value}</span>
      </div>
    </div>
  )
}

function StatChip({ label, value, color }: { label: string; value: string; color: "success" | "warning" | "muted" }) {
  const colorClass = {
    success: "text-[var(--success)]",
    warning: "text-[var(--warning)]",
    muted: "text-[var(--foreground-muted)]",
  }[color]
  return (
    <div className="flex flex-col items-center gap-0.5 bg-[var(--surface-elevated)] rounded-xl py-2.5">
      <span className={cn("text-xl font-black tabular-nums", colorClass)}>{value}</span>
      <span className="text-[9px] text-[var(--foreground-subtle)] text-center leading-tight px-1">{label}</span>
    </div>
  )
}
