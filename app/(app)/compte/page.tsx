import { auth, signOut } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { FootballAvatar } from "@/components/shared/football-avatar"
import { LogOut, Shield, Trophy, History } from "lucide-react"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Mon compte" }

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  REGISTRATION: "Inscriptions",
  ONGOING: "En cours",
  FINISHED: "Terminé",
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-[var(--surface-elevated)] text-[var(--foreground-muted)]",
  REGISTRATION: "bg-[var(--accent-dim)] text-[var(--accent)]",
  ONGOING: "bg-[var(--success-dim)] text-[var(--success)]",
  FINISHED: "bg-[var(--surface-elevated)] text-[var(--foreground-subtle)]",
}

export default async function ComptePage({
  searchParams,
}: {
  searchParams: Promise<{ contestId?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const userId = session.user.id

  const { contestId: requestedId } = await searchParams

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { firstName: true, lastName: true, email: true, avatarSeed: true, role: true, createdAt: true },
  })

  if (!user) redirect("/login")

  // Concours actif affiché (pour les stats en haut)
  const myParticipation = await db.contestParticipant.findFirst({
    where: {
      userId,
      contest: { status: { in: ["ONGOING", "REGISTRATION", "DRAFT"] } },
      ...(requestedId ? { contestId: requestedId } : {}),
    },
    include: { contest: true },
    orderBy: { joinedAt: "desc" },
  })
  const activeContest = myParticipation?.contest ?? null

  // Tous les concours rejoints (actifs + terminés) pour l'historique
  const allParticipations = await db.contestParticipant.findMany({
    where: { userId },
    include: {
      contest: {
        select: { id: true, name: true, status: true, isFree: true, buyIn: true },
      },
    },
    orderBy: { joinedAt: "desc" },
  })

  // Stats du concours actif
  const [myEntry, exactScoresTotal] = await Promise.all([
    activeContest
      ? db.leaderboardEntry.findUnique({
          where: { contestId_userId: { contestId: activeContest.id, userId } },
        })
      : Promise.resolve(null),
    activeContest
      ? db.prediction.count({ where: { contestId: activeContest.id, userId, status: "EXACT_SCORE" } })
      : Promise.resolve(0),
  ])

  // Stats par concours pour l'historique
  const contestIds = allParticipations.map((p) => p.contestId)
  const [allEntries, allPredCounts] = await Promise.all([
    db.leaderboardEntry.findMany({
      where: { contestId: { in: contestIds }, userId },
      select: { contestId: true, rank: true, totalPoints: true, exactScores: true },
    }),
    db.prediction.groupBy({
      by: ["contestId"],
      where: { contestId: { in: contestIds }, userId },
      _count: { id: true },
    }),
  ])

  const entryByContest = Object.fromEntries(allEntries.map((e) => [e.contestId, e]))
  const predCountByContest = Object.fromEntries(allPredCounts.map((p) => [p.contestId, p._count.id]))

  const historyContests = allParticipations.map((p) => ({
    ...p.contest,
    entry: entryByContest[p.contestId] ?? null,
    predCount: predCountByContest[p.contestId] ?? 0,
    joinedAt: p.joinedAt,
    hasPaid: p.hasPaid,
  }))

  const finishedContests = historyContests.filter((c) => c.status === "FINISHED")
  const otherActiveContests = historyContests.filter((c) => c.status !== "FINISHED" && c.id !== activeContest?.id)

  return (
    <div className="flex flex-col gap-4">
      {/* Profile card */}
      <div className="surface-card p-5 flex flex-col items-center gap-3">
        <FootballAvatar seed={session.user.avatarSeed} size={80} className="ring-4 ring-[var(--accent)]/30" />
        <div className="text-center">
          <h1 className="text-xl font-black text-[var(--foreground)]">{user.firstName} {user.lastName}</h1>
          <p className="text-sm text-[var(--foreground-muted)]">{user.email}</p>
          {user.role === "ADMIN" && (
            <span className="inline-flex items-center gap-1 text-xs bg-[var(--purple-dim)] text-[var(--purple)] rounded-full px-2 py-0.5 mt-1 font-medium">
              <Shield size={10} />
              Administrateur
            </span>
          )}
          <p className="text-[11px] text-[var(--foreground-subtle)] mt-1.5">
            Membre depuis {new Date(user.createdAt).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* Stats concours actif */}
      {activeContest && (
        <section>
          <div className="flex items-center gap-1.5 mb-2">
            <Trophy size={14} className="text-[var(--foreground-muted)]" />
            <span className="text-sm font-semibold text-[var(--foreground)]">{activeContest.name}</span>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_COLORS[activeContest.status]}`}>
              {STATUS_LABELS[activeContest.status]}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="surface-card p-3 text-center">
              <div className="text-2xl font-black text-[var(--foreground)]">
                {myEntry?.rank ?? "–"}{myEntry?.rank && <span className="text-sm font-normal">e</span>}
              </div>
              <div className="text-xs text-[var(--foreground-muted)] mt-0.5">Classement</div>
            </div>
            <div className="surface-card p-3 text-center">
              <div className="text-2xl font-black text-[var(--foreground)]">{myEntry?.totalPoints ?? 0}</div>
              <div className="text-xs text-[var(--foreground-muted)] mt-0.5">Points</div>
            </div>
            <div className="surface-card p-3 text-center">
              <div className="text-2xl font-black text-[var(--accent)]">{exactScoresTotal}</div>
              <div className="text-xs text-[var(--foreground-muted)] mt-0.5">Scores exacts</div>
            </div>
          </div>
        </section>
      )}

      {/* Autres concours actifs */}
      {otherActiveContests.length > 0 && (
        <section>
          <SectionTitle icon={<Trophy size={14} />} title="Autres concours actifs" />
          <div className="flex flex-col gap-2">
            {otherActiveContests.map((c) => (
              <ContestHistoryCard key={c.id} contest={c} isActive />
            ))}
          </div>
        </section>
      )}

      {/* Historique concours terminés */}
      {finishedContests.length > 0 && (
        <section>
          <SectionTitle icon={<History size={14} />} title="Historique" />
          <div className="flex flex-col gap-2">
            {finishedContests.map((c) => (
              <ContestHistoryCard key={c.id} contest={c} />
            ))}
          </div>
        </section>
      )}

      {/* Admin link */}
      {user.role === "ADMIN" && (
        <Link href="/admin" className="flex items-center justify-between p-4 rounded-xl bg-[var(--purple-dim)] border border-[var(--purple)]/30">
          <div className="flex items-center gap-3">
            <Shield size={20} className="text-[var(--purple)]" />
            <div>
              <div className="font-semibold text-sm text-[var(--foreground)]">Administration</div>
              <div className="text-xs text-[var(--foreground-muted)]">Gérer les concours, résultats, invitations</div>
            </div>
          </div>
        </Link>
      )}

      {/* Sign out */}
      <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }) }}>
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-[var(--border)] text-[var(--foreground-muted)] text-sm font-semibold hover:border-[var(--error)]/50 hover:text-[var(--error)] transition-all"
        >
          <LogOut size={16} />
          Se déconnecter
        </button>
      </form>
    </div>
  )
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-2 text-[var(--foreground-muted)]">
      {icon}
      <span className="text-sm font-semibold text-[var(--foreground)]">{title}</span>
    </div>
  )
}

function ContestHistoryCard({
  contest,
  isActive = false,
}: {
  contest: {
    id: string
    name: string
    status: string
    isFree: boolean
    buyIn: number
    entry: { rank: number; totalPoints: number; exactScores: number } | null
    predCount: number
    joinedAt: Date
    hasPaid: boolean
  }
  isActive?: boolean
}) {
  const entry = contest.entry

  return (
    <div className={`surface-card p-4 flex flex-col gap-3 ${contest.status === "FINISHED" ? "opacity-80" : ""}`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-[var(--foreground)] truncate">{contest.name}</span>
            {!contest.isFree && contest.buyIn > 0 && (
              <span className="text-[10px] font-bold text-[var(--warning)] bg-[var(--warning-dim)] px-1.5 py-0.5 rounded-full shrink-0">
                {contest.buyIn}€
              </span>
            )}
            {contest.isFree && (
              <span className="text-[10px] font-bold text-[var(--success)] bg-[var(--success-dim)] px-1.5 py-0.5 rounded-full shrink-0">
                Gratuit
              </span>
            )}
          </div>
          <p className="text-[11px] text-[var(--foreground-subtle)] mt-0.5">
            Rejoint le {new Date(contest.joinedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ml-2 ${STATUS_COLORS[contest.status]}`}>
          {STATUS_LABELS[contest.status]}
        </span>
      </div>

      {/* Stats */}
      {entry ? (
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center py-2 rounded-lg bg-[var(--surface-elevated)]">
            <span className="text-lg font-black text-[var(--foreground)]">
              {entry.rank}<span className="text-xs font-normal">e</span>
            </span>
            <span className="text-[10px] text-[var(--foreground-muted)]">Position</span>
          </div>
          <div className="flex flex-col items-center py-2 rounded-lg bg-[var(--surface-elevated)]">
            <span className="text-lg font-black text-[var(--foreground)]">{entry.totalPoints}</span>
            <span className="text-[10px] text-[var(--foreground-muted)]">Points</span>
          </div>
          <div className="flex flex-col items-center py-2 rounded-lg bg-[var(--surface-elevated)]">
            <span className="text-lg font-black text-[var(--accent)]">{entry.exactScores}</span>
            <span className="text-[10px] text-[var(--foreground-muted)]">Exacts</span>
          </div>
        </div>
      ) : (
        <p className="text-xs text-[var(--foreground-subtle)] text-center py-1">
          {contest.predCount > 0 ? `${contest.predCount} pronostic${contest.predCount > 1 ? "s" : ""} · Classement pas encore calculé` : "Aucun pronostic posé"}
        </p>
      )}

      {/* Lien vers classement si terminé */}
      {contest.status === "FINISHED" && entry && (
        <Link
          href={`/classement?contestId=${contest.id}`}
          className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border)] text-xs font-semibold text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:border-[var(--accent)]/30 transition-all"
        >
          <Trophy size={12} />
          Voir le classement final
        </Link>
      )}
    </div>
  )
}
