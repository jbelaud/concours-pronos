import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { formatKickoff, isMatchLocked, PHASE_LABELS } from "@/lib/utils"
import { ChevronRight, Trophy, Target, Clock } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Accueil" }

export default async function AccueilPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  // Get active contest
  const contest = await db.contest.findFirst({
    where: { status: { in: ["ONGOING", "REGISTRATION"] } },
    include: {
      settings: true,
      prizepool: { include: { payouts: true } },
      _count: { select: { participants: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  if (!contest) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <div className="text-5xl">⏳</div>
        <h2 className="text-xl font-bold text-[var(--foreground)]">
          Aucun concours actif
        </h2>
        <p className="text-[var(--foreground-muted)] text-sm max-w-xs">
          L&apos;administrateur n&apos;a pas encore créé de concours. Reviens bientôt !
        </p>
      </div>
    )
  }

  // Upcoming matches (next 3)
  const upcomingMatches = await db.match.findMany({
    where: {
      contestId: contest.id,
      status: "SCHEDULED",
      kickoff: { gte: new Date() },
      homeTeamId: { not: null },
    },
    orderBy: { kickoff: "asc" },
    take: 3,
    include: { homeTeam: true, awayTeam: true },
  })

  // Recent results (last 3)
  const recentResults = await db.match.findMany({
    where: { contestId: contest.id, status: "FINISHED" },
    orderBy: { kickoff: "desc" },
    take: 3,
    include: { homeTeam: true, awayTeam: true },
  })

  // User's leaderboard position
  const myEntry = await db.leaderboardEntry.findUnique({
    where: {
      contestId_userId: {
        contestId: contest.id,
        userId: session.user.id,
      },
    },
  })

  // Pending predictions count
  const pendingPredictions = await db.match.count({
    where: {
      contestId: contest.id,
      homeTeamId: { not: null },
      kickoff: { gte: new Date() },
      predictions: {
        none: { userId: session.user.id },
      },
    },
  })

  return (
    <div className="flex flex-col gap-4">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-black text-[var(--foreground)]">
          Bonjour, {session.user.firstName} 👋
        </h1>
        <p className="text-sm text-[var(--foreground-muted)]">{contest.name}</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard
          icon="🏆"
          label="Classement"
          value={myEntry ? `${myEntry.rank}e` : "–"}
          sub={`${myEntry?.totalPoints ?? 0} pts`}
          href="/classement"
        />
        <StatCard
          icon="⚽"
          label="À pronostiquer"
          value={pendingPredictions.toString()}
          sub="matchs"
          href="/pronostics"
          highlight={pendingPredictions > 0}
        />
        <StatCard
          icon="👥"
          label="Participants"
          value={contest._count.participants.toString()}
          sub="joueurs"
        />
      </div>

      {/* Pending predictions alert */}
      {pendingPredictions > 0 && (
        <Link
          href="/pronostics"
          className="flex items-center justify-between p-4 rounded-xl bg-[var(--accent-dim)] border border-[var(--accent)]/30"
        >
          <div className="flex items-center gap-3">
            <Target size={20} className="text-[var(--accent)]" />
            <div>
              <div className="font-semibold text-sm text-[var(--foreground)]">
                {pendingPredictions} pronostic{pendingPredictions > 1 ? "s" : ""} à remplir
              </div>
              <div className="text-xs text-[var(--foreground-muted)]">
                Ne rate pas les prochains matchs
              </div>
            </div>
          </div>
          <ChevronRight size={18} className="text-[var(--accent)]" />
        </Link>
      )}

      {/* Upcoming matches */}
      {upcomingMatches.length > 0 && (
        <section>
          <SectionHeader
            title="Prochains matchs"
            icon={<Clock size={16} />}
            href="/pronostics"
          />
          <div className="flex flex-col gap-2">
            {upcomingMatches.map((match) => (
              <div
                key={match.id}
                className="surface-card p-3 flex items-center gap-3"
              >
                <div className="flex-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{match.homeTeam?.flagEmoji}</span>
                    <span className="text-xs font-semibold text-[var(--foreground)] max-w-[60px] truncate">
                      {match.homeTeam?.name}
                    </span>
                  </div>
                  <div className="text-center px-2">
                    <div className="text-xs text-[var(--foreground-muted)]">
                      {formatKickoff(match.kickoff, "HH:mm")}
                    </div>
                    <div className="text-[10px] text-[var(--foreground-subtle)]">
                      {formatKickoff(match.kickoff, "d MMM")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[var(--foreground)] max-w-[60px] truncate text-right">
                      {match.awayTeam?.name}
                    </span>
                    <span className="text-lg">{match.awayTeam?.flagEmoji}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent results */}
      {recentResults.length > 0 && (
        <section>
          <SectionHeader title="Derniers résultats" icon={<Trophy size={16} />} />
          <div className="flex flex-col gap-2">
            {recentResults.map((match) => (
              <div key={match.id} className="surface-card p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-lg">{match.homeTeam?.flagEmoji}</span>
                    <span className="text-xs font-semibold text-[var(--foreground)] max-w-[60px] truncate">
                      {match.homeTeam?.name}
                    </span>
                  </div>
                  <div className="px-3 text-center">
                    <span className="text-lg font-black text-[var(--foreground)]">
                      {match.homeScore} – {match.awayScore}
                    </span>
                    <div className="text-[10px] text-[var(--foreground-muted)]">
                      {PHASE_LABELS[match.phase]}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-1 justify-end">
                    <span className="text-xs font-semibold text-[var(--foreground)] max-w-[60px] truncate text-right">
                      {match.awayTeam?.name}
                    </span>
                    <span className="text-lg">{match.awayTeam?.flagEmoji}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  sub,
  href,
  highlight,
}: {
  icon: string
  label: string
  value: string
  sub: string
  href?: string
  highlight?: boolean
}) {
  const inner = (
    <div
      className={`surface-card p-3 flex flex-col items-center gap-1 text-center ${
        highlight ? "border-[var(--accent)]/40 bg-[var(--accent-dim)]" : ""
      }`}
    >
      <span className="text-xl">{icon}</span>
      <span className={`text-xl font-black ${highlight ? "text-[var(--accent)]" : "text-[var(--foreground)]"}`}>
        {value}
      </span>
      <span className="text-[10px] text-[var(--foreground-muted)] leading-tight">
        {sub}
      </span>
      <span className="text-[9px] text-[var(--foreground-subtle)] uppercase tracking-wide">
        {label}
      </span>
    </div>
  )

  if (href) return <Link href={href}>{inner}</Link>
  return inner
}

function SectionHeader({
  title,
  icon,
  href,
}: {
  title: string
  icon: React.ReactNode
  href?: string
}) {
  const content = (
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-1.5 text-[var(--foreground-muted)]">
        {icon}
        <span className="text-sm font-semibold text-[var(--foreground)]">{title}</span>
      </div>
      {href && (
        <span className="text-xs text-[var(--accent)] flex items-center gap-0.5">
          Voir tout <ChevronRight size={13} />
        </span>
      )}
    </div>
  )
  if (href) return <Link href={href}>{content}</Link>
  return content
}
