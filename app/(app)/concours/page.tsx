import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ChevronRight, Trophy, Users, Coins } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Mes concours" }

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  REGISTRATION: "Inscriptions",
  ONGOING: "En cours",
  FINISHED: "Terminé",
}

const STATUS_DOT: Record<string, string> = {
  DRAFT: "bg-[var(--foreground-subtle)]",
  REGISTRATION: "bg-[var(--accent)] animate-pulse",
  ONGOING: "bg-[var(--success)] animate-pulse",
  FINISHED: "bg-[var(--foreground-subtle)]",
}

const STATUS_LABEL_COLOR: Record<string, string> = {
  DRAFT: "text-[var(--foreground-muted)]",
  REGISTRATION: "text-[var(--accent)]",
  ONGOING: "text-[var(--success)]",
  FINISHED: "text-[var(--foreground-subtle)]",
}

export default async function ConcoursPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const userId = session.user.id

  const participations = await db.contestParticipant.findMany({
    where: { userId },
    include: {
      contest: {
        include: {
          template: { select: { name: true } },
          _count: { select: { participants: true } },
          prizepool: { select: { totalAmount: true, itmCount: true } },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  })

  // Fetch my leaderboard entries for all contests at once
  const contestIds = participations.map((p) => p.contestId)
  const myEntries = await db.leaderboardEntry.findMany({
    where: { userId, contestId: { in: contestIds } },
    select: { contestId: true, rank: true, totalPoints: true },
  })
  const entryByContest = Object.fromEntries(myEntries.map((e) => [e.contestId, e]))

  const ongoing = participations.filter(
    (p) => p.contest.status === "ONGOING" || p.contest.status === "REGISTRATION" || p.contest.status === "DRAFT"
  )
  const finished = participations.filter((p) => p.contest.status === "FINISHED")

  // Concours publics disponibles non encore rejoints
  const available = await db.contest.findMany({
    where: {
      status: { in: ["ONGOING", "REGISTRATION"] },
      id: { notIn: contestIds },
      allowPublicJoin: true,
    },
    include: {
      template: { select: { name: true } },
      _count: { select: { participants: true } },
    },
    take: 5,
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-black text-[var(--foreground)]">Mes concours</h1>
        <p className="text-sm text-[var(--foreground-muted)] mt-0.5">
          {participations.length} concours rejoint{participations.length > 1 ? "s" : ""}
        </p>
      </div>

      {participations.length === 0 && available.length === 0 && (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-4">
          <div className="text-5xl">🏆</div>
          <h2 className="text-xl font-bold text-[var(--foreground)]">Aucun concours</h2>
          <p className="text-sm text-[var(--foreground-muted)] max-w-xs">
            Tu n&apos;as pas encore rejoint de concours.
          </p>
        </div>
      )}

      {ongoing.length > 0 && (
        <section className="flex flex-col gap-2">
          <p className="text-[11px] font-bold text-[var(--foreground-subtle)] uppercase tracking-wide px-1">
            En cours
          </p>
          {ongoing.map(({ contest }) => (
            <ContestCard key={contest.id} contest={contest} entry={entryByContest[contest.id] ?? null} />
          ))}
        </section>
      )}

      {finished.length > 0 && (
        <section className="flex flex-col gap-2">
          <p className="text-[11px] font-bold text-[var(--foreground-subtle)] uppercase tracking-wide px-1">
            Terminés
          </p>
          {finished.map(({ contest }) => (
            <ContestCard key={contest.id} contest={contest} entry={entryByContest[contest.id] ?? null} />
          ))}
        </section>
      )}

      {available.length > 0 && (
        <section className="flex flex-col gap-2">
          <p className="text-[11px] font-bold text-[var(--foreground-subtle)] uppercase tracking-wide px-1">
            Disponibles
          </p>
          {available.map((contest) => (
            <Link
              key={contest.id}
              href={`/rejoindre/${contest.inviteToken}`}
              className="surface-card p-4 flex items-center justify-between hover:border-[var(--accent)]/30 transition-colors"
            >
              <div className="flex flex-col gap-1">
                <span className="font-bold text-sm text-[var(--foreground)]">{contest.name}</span>
                {contest.template && (
                  <span className="text-xs text-[var(--foreground-muted)]">{contest.template.name}</span>
                )}
                <span className="text-xs text-[var(--foreground-subtle)]">
                  👥 {contest._count.participants} participant{contest._count.participants > 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[var(--accent)]">Rejoindre</span>
                <ChevronRight size={16} className="text-[var(--accent)]" />
              </div>
            </Link>
          ))}
        </section>
      )}
    </div>
  )
}

function ContestCard({
  contest,
  entry,
}: {
  contest: {
    id: string
    name: string
    status: string
    isFree: boolean
    buyIn: number
    template: { name: string } | null
    _count: { participants: number }
    prizepool: { totalAmount: number; itmCount: number } | null
  }
  entry: { rank: number; totalPoints: number } | null
}) {
  const isFinished = contest.status === "FINISHED"

  return (
    <Link
      href={isFinished ? `/concours/${contest.id}` : `/accueil?contestId=${contest.id}`}
      className={cn(
        "surface-card p-4 flex items-center justify-between transition-colors",
        isFinished
          ? "hover:border-[var(--foreground-subtle)]/30 opacity-80"
          : "hover:border-[var(--accent)]/30"
      )}
    >
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn("w-2 h-2 rounded-full shrink-0", STATUS_DOT[contest.status])} />
          <span className="font-bold text-sm text-[var(--foreground)] truncate">{contest.name}</span>
          <span className={cn("text-[10px] font-semibold shrink-0", STATUS_LABEL_COLOR[contest.status])}>
            {STATUS_LABELS[contest.status]}
          </span>
        </div>

        {contest.template && (
          <span className="text-xs text-[var(--foreground-muted)] pl-4">{contest.template.name}</span>
        )}

        <div className="flex items-center gap-3 pl-4">
          <span className="flex items-center gap-1 text-xs text-[var(--foreground-subtle)]">
            <Users size={11} />
            {contest._count.participants} participant{contest._count.participants > 1 ? "s" : ""}
          </span>
          {!contest.isFree && contest.buyIn > 0 && (
            <span className="flex items-center gap-1 text-xs text-[var(--foreground-subtle)]">
              <Coins size={11} />
              {contest.buyIn}€
            </span>
          )}
          {entry && (
            <span className="flex items-center gap-1 text-xs font-semibold text-[var(--accent)]">
              <Trophy size={11} />
              {entry.rank}e · {entry.totalPoints} pts
            </span>
          )}
        </div>
      </div>

      <ChevronRight size={16} className={isFinished ? "text-[var(--foreground-subtle)]" : "text-[var(--accent)]"} />
    </Link>
  )
}
