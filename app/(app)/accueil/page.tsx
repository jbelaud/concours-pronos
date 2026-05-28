import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { formatKickoff, PHASE_LABELS } from "@/lib/utils"
import { ChevronRight, Trophy, Target, Clock, Plus } from "lucide-react"
import { ShareContestCard } from "@/components/shared/share-contest-card"
import { CopyIbanButton } from "@/components/shared/copy-iban-button"
import { CountdownTimer } from "@/components/shared/countdown-timer"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Accueil" }

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  REGISTRATION: "Inscriptions",
  ONGOING: "En cours",
  FINISHED: "Terminé",
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "text-[var(--foreground-muted)] bg-[var(--surface-elevated)]",
  REGISTRATION: "text-[var(--accent)] bg-[var(--accent-dim)]",
  ONGOING: "text-[var(--success)] bg-[var(--success-dim)]",
  FINISHED: "text-[var(--foreground-subtle)] bg-[var(--surface-elevated)]",
}

export default async function AccueilPage({ searchParams }: { searchParams: Promise<{ contestId?: string }> }) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const userId = session.user.id

  const { contestId: requestedId } = await searchParams

  // Récupérer TOUS les concours auxquels l'utilisateur participe
  const myParticipations = await db.contestParticipant.findMany({
    where: { userId },
    include: {
      contest: {
        include: {
          _count: { select: { participants: true } },
          participants: { select: { hasPaid: true } },
          prizepool: { include: { payouts: { orderBy: { position: "asc" } } } },
          template: { select: { name: true, startDate: true } },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  })

  const myContestIds = myParticipations.map((p) => p.contestId)

  // Tous les concours actifs de l'utilisateur
  const myActiveContests = myParticipations
    .map((p) => p.contest)
    .filter((c) => c.status === "ONGOING" || c.status === "REGISTRATION" || c.status === "DRAFT")

  // Concours actif sélectionné : celui demandé via ?contestId=, sinon le premier actif
  const activeContest = (
    requestedId
      ? myActiveContests.find((c) => c.id === requestedId)
      : null
  ) ?? myActiveContests[0] ?? null

  // Autres concours accessibles mais non rejoints (publics)
  const otherActiveContests = await db.contest.findMany({
    where: {
      status: { in: ["ONGOING", "REGISTRATION"] },
      id: { notIn: myContestIds },
      allowPublicJoin: true,
    },
    include: {
      _count: { select: { participants: true } },
      template: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 3,
  })

  // Si pas de concours actif rejoint et pas de concours public, afficher message
  if (!activeContest && myParticipations.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--foreground)]">
            Bonjour, {session.user.firstName} 👋
          </h1>
        </div>

        {otherActiveContests.length > 0 ? (
          <section>
            <SectionHeader title="Concours disponibles" icon={<Trophy size={16} />} />
            <div className="flex flex-col gap-2">
              {otherActiveContests.map((c) => (
                <ContestDiscoveryCard key={c.id} contest={c} />
              ))}
            </div>
          </section>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-4">
            <div className="text-5xl">⏳</div>
            <h2 className="text-xl font-bold text-[var(--foreground)]">Aucun concours actif</h2>
            <p className="text-[var(--foreground-muted)] text-sm max-w-xs">
              L&apos;administrateur n&apos;a pas encore créé de concours. Reviens bientôt !
            </p>
          </div>
        )}
      </div>
    )
  }

  // Données du concours actif
  type MatchWithTeams = { id: string; kickoff: Date; phase: string; homeScore: number | null; awayScore: number | null; homeTeam: { name: string; flagEmoji: string | null } | null; awayTeam: { name: string; flagEmoji: string | null } | null }
  let upcomingMatches: MatchWithTeams[] = []
  let recentResults: MatchWithTeams[] = []
  let myEntry: { rank: number; totalPoints: number } | null = null
  let participation: { hasPaid: boolean } | null = null
  let pendingPredictions = 0

  if (activeContest) {
    const [upcoming, recent, entry, part] = await Promise.all([
      db.match.findMany({
        where: { contestId: activeContest.id, status: "SCHEDULED", kickoff: { gte: new Date() }, homeTeamId: { not: null } },
        orderBy: { kickoff: "asc" },
        take: 3,
        include: { homeTeam: true, awayTeam: true },
      }),
      db.match.findMany({
        where: { contestId: activeContest.id, status: "FINISHED" },
        orderBy: { kickoff: "desc" },
        take: 3,
        include: { homeTeam: true, awayTeam: true },
      }),
      db.leaderboardEntry.findUnique({
        where: { contestId_userId: { contestId: activeContest.id, userId } },
        select: { rank: true, totalPoints: true },
      }),
      db.contestParticipant.findUnique({
        where: { contestId_userId: { contestId: activeContest.id, userId } },
        select: { hasPaid: true },
      }),
    ])
    upcomingMatches = upcoming
    recentResults = recent
    myEntry = entry
    participation = part

    pendingPredictions = await db.match.count({
      where: {
        contestId: activeContest.id,
        homeTeamId: { not: null },
        kickoff: { gte: new Date() },
        predictions: { none: { userId } },
      },
    })
  }

  // Prizepool dynamique (seulement si payant)
  const pp = activeContest?.prizepool ?? null
  const paidCount = activeContest?.participants.filter((p) => p.hasPaid).length ?? 0
  const totalCount = activeContest?._count.participants ?? 0
  const collectedAmount = paidCount * (activeContest?.buyIn ?? 0)
  const allPaid = paidCount === totalCount && totalCount > 0
  const showPrizepool = activeContest && !activeContest.isFree && pp && pp.payouts.length > 0
  const dynamicPayouts = showPrizepool && collectedAmount > 0 && pp!.totalAmount > 0
    ? pp!.payouts.map((p) => ({ position: p.position, amount: Math.round((p.amount / pp!.totalAmount) * collectedAmount) }))
    : pp?.payouts ?? []

  // Tous mes concours (triés)
  const allMyContests = myParticipations.map((p) => p.contest)
  const finishedContests = allMyContests.filter((c) => c.status === "FINISHED")
  const otherJoinedActive = allMyContests.filter(
    (c) => c.status !== "FINISHED" && c.id !== activeContest?.id
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-black text-[var(--foreground)]">
          Bonjour, {session.user.firstName} 👋
        </h1>
      </div>

      {/* Sélecteur de concours si plusieurs actifs */}
      {myActiveContests.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {myActiveContests.map((c) => (
            <Link
              key={c.id}
              href={`/accueil?contestId=${c.id}`}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                activeContest?.id === c.id
                  ? "gradient-accent text-white border-transparent"
                  : "bg-[var(--surface-elevated)] text-[var(--foreground-muted)] border-[var(--border)] hover:border-[var(--accent)]/40"
              }`}
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}

      {activeContest && (
        <p className="text-sm text-[var(--foreground-muted)] -mt-2">{activeContest.name}</p>
      )}

      {activeContest ? (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2">
            <StatCard
              icon="🏆"
              label="Classement"
              value={myEntry ? `${myEntry.rank}e` : "–"}
              sub={`${myEntry?.totalPoints ?? 0} pts`}
              href={`/classement?contestId=${activeContest.id}`}
            />
            <StatCard
              icon="⚽"
              label="À pronostiquer"
              value={pendingPredictions.toString()}
              sub="matchs"
              href={`/pronostics?contestId=${activeContest.id}`}
              highlight={pendingPredictions > 0}
            />
            <StatCard
              icon="👥"
              label="Participants"
              value={totalCount.toString()}
              sub="joueurs"
            />
          </div>

          {/* Bloc paiement IBAN — entre KPIs et countdown */}
          {!activeContest.isFree && activeContest.buyIn > 0 && !participation?.hasPaid && activeContest.iban && (
            <IbanCard
              iban={activeContest.iban}
              buyIn={activeContest.buyIn}
              instructions={activeContest.paymentInstructions}
            />
          )}

          {/* Compte à rebours avant le début du tournoi */}
          {activeContest.template?.startDate && new Date(activeContest.template.startDate) > new Date() && (
            <CountdownTimer targetDate={activeContest.template.startDate.toISOString()} />
          )}

          {/* Pending predictions alert */}
          {pendingPredictions > 0 && (
            <Link
              href={`/pronostics?contestId=${activeContest.id}`}
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


          {/* Partage du concours */}
          {activeContest.inviteToken && activeContest.allowPublicJoin && (
            <ShareContestCard
              contestName={activeContest.name}
              inviteToken={activeContest.inviteToken}
              participantCount={totalCount}
            />
          )}

          {/* Prizepool dynamique (payant uniquement) */}
          {showPrizepool && dynamicPayouts.length > 0 && (
            <section>
              <SectionHeader title="Cagnotte" icon={<Trophy size={16} />} />
              <div className="surface-card p-3 flex flex-col gap-1.5">
                <div className="flex items-center justify-between mb-1">
                  {collectedAmount > 0
                    ? <span className="font-black text-[var(--accent)] text-base">{collectedAmount}€ collectés</span>
                    : <span className="text-sm text-[var(--foreground-muted)]">Aucun paiement reçu</span>
                  }
                  <span className="text-[10px] text-[var(--foreground-subtle)] bg-[var(--surface-elevated)] px-1.5 py-0.5 rounded-full">
                    {allPaid ? "✓ Complet" : `${paidCount}/${totalCount} payés`}
                  </span>
                </div>
                {dynamicPayouts.map((p) => (
                  <div key={p.position} className="flex items-center justify-between text-sm">
                    <span className="text-[var(--foreground-muted)]">
                      {p.position === 1 ? "🥇 1er" : p.position === 2 ? "🥈 2e" : p.position === 3 ? "🥉 3e" : `${p.position}e`}
                    </span>
                    <span className="font-semibold text-[var(--foreground)]">{p.amount}€{!allPaid && collectedAmount > 0 ? "*" : ""}</span>
                  </div>
                ))}
                {!allPaid && collectedAmount > 0 && (
                  <p className="text-[10px] text-[var(--foreground-subtle)] mt-1">* Estimé — mis à jour à chaque paiement reçu</p>
                )}
              </div>
            </section>
          )}

          {/* Prochains matchs */}
          {upcomingMatches.length > 0 && (
            <section>
              <SectionHeader title="Prochains matchs" icon={<Clock size={16} />} href="/pronostics" />
              <div className="flex flex-col gap-2">
                {upcomingMatches.map((match) => (
                  <div key={match.id} className="surface-card p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-lg">{match.homeTeam?.flagEmoji}</span>
                        <span className="text-xs font-semibold text-[var(--foreground)] max-w-[60px] truncate">
                          {match.homeTeam?.name}
                        </span>
                      </div>
                      <div className="text-center px-2">
                        <div className="text-xs text-[var(--foreground-muted)]">{formatKickoff(match.kickoff, "HH:mm")}</div>
                        <div className="text-[10px] text-[var(--foreground-subtle)]">{formatKickoff(match.kickoff, "d MMM")}</div>
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

          {/* Derniers résultats */}
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
        </>
      ) : (
        /* Pas de concours actif rejoint mais peut en rejoindre */
        otherActiveContests.length > 0 && (
          <section>
            <SectionHeader title="Concours disponibles" icon={<Trophy size={16} />} />
            <div className="flex flex-col gap-2">
              {otherActiveContests.map((c) => (
                <ContestDiscoveryCard key={c.id} contest={c} />
              ))}
            </div>
          </section>
        )
      )}

      {/* Autres concours actifs rejoints */}
      {otherJoinedActive.length > 0 && (
        <section>
          <SectionHeader title="Autres concours" icon={<Plus size={16} />} />
          <div className="flex flex-col gap-2">
            {otherJoinedActive.map((c) => (
              <OtherContestCard key={c.id} contest={c} />
            ))}
          </div>
        </section>
      )}

      {/* Concours terminés */}
      {finishedContests.length > 0 && (
        <section>
          <SectionHeader title="Concours terminés" icon={<Trophy size={16} />} />
          <div className="flex flex-col gap-2">
            {finishedContests.slice(0, 3).map((c) => (
              <OtherContestCard key={c.id} contest={c} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// Carte pour un concours que l'utilisateur peut rejoindre
function ContestDiscoveryCard({
  contest,
}: {
  contest: {
    id: string
    name: string
    status: string
    buyIn: number
    isFree: boolean
    inviteToken: string | null
    _count: { participants: number }
    template?: { name: string } | null
  }
}) {
  if (!contest.inviteToken) return null
  return (
    <Link
      href={`/rejoindre/${contest.inviteToken}`}
      className="surface-card p-4 flex items-center justify-between hover:border-[var(--accent)]/30 transition-colors"
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-[var(--foreground)]">{contest.name}</span>
          {!contest.isFree && contest.buyIn > 0 && (
            <span className="text-[10px] font-bold text-[var(--warning)] bg-[var(--warning-dim)] px-1.5 py-0.5 rounded-full">
              {contest.buyIn}€
            </span>
          )}
          {contest.isFree && (
            <span className="text-[10px] font-bold text-[var(--success)] bg-[var(--success-dim)] px-1.5 py-0.5 rounded-full">
              Gratuit
            </span>
          )}
        </div>
        {contest.template && (
          <p className="text-xs text-[var(--foreground-muted)]">{contest.template.name}</p>
        )}
        <p className="text-xs text-[var(--foreground-subtle)]">
          👥 {contest._count.participants} participant{contest._count.participants > 1 ? "s" : ""}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[contest.status]}`}>
          {STATUS_LABELS[contest.status]}
        </span>
        <ChevronRight size={16} className="text-[var(--accent)]" />
      </div>
    </Link>
  )
}

// Carte pour un concours déjà rejoint
function OtherContestCard({
  contest,
}: {
  contest: {
    id: string
    name: string
    status: string
    buyIn: number
    isFree: boolean
    _count: { participants: number }
    template?: { name: string } | null
  }
}) {
  return (
    <div className="surface-card p-3 flex items-center justify-between opacity-70">
      <div className="flex flex-col gap-0.5">
        <span className="font-semibold text-sm text-[var(--foreground)]">{contest.name}</span>
        {contest.template && (
          <span className="text-xs text-[var(--foreground-muted)]">{contest.template.name}</span>
        )}
        <span className="text-xs text-[var(--foreground-subtle)]">
          👥 {contest._count.participants} participants
          {!contest.isFree && contest.buyIn > 0 && ` · ${contest.buyIn}€`}
        </span>
      </div>
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[contest.status]}`}>
        {STATUS_LABELS[contest.status]}
      </span>
    </div>
  )
}

function StatCard({
  icon, label, value, sub, href, highlight,
}: {
  icon: string; label: string; value: string; sub: string; href?: string; highlight?: boolean
}) {
  const inner = (
    <div className={`surface-card p-3 flex flex-col items-center gap-1 text-center ${highlight ? "border-[var(--accent)]/40 bg-[var(--accent-dim)]" : ""}`}>
      <span className="text-xl">{icon}</span>
      <span className={`text-xl font-black ${highlight ? "text-[var(--accent)]" : "text-[var(--foreground)]"}`}>{value}</span>
      <span className="text-[10px] text-[var(--foreground-muted)] leading-tight">{sub}</span>
      <span className="text-[9px] text-[var(--foreground-subtle)] uppercase tracking-wide">{label}</span>
    </div>
  )
  if (href) return <Link href={href}>{inner}</Link>
  return inner
}

function IbanCard({ iban, buyIn, instructions }: { iban: string; buyIn: number; instructions?: string | null }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--warning)]/40 bg-gradient-to-br from-[var(--warning)]/15 via-[var(--warning)]/5 to-transparent p-4 flex flex-col gap-3">
      {/* Cercle décoratif */}
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-[var(--warning)]/10 blur-xl pointer-events-none" />
      <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-[var(--warning)]/8 blur-lg pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">💳</span>
          <div>
            <div className="text-sm font-bold text-[var(--foreground)]">Paiement en attente</div>
            <div className="text-[10px] text-[var(--foreground-muted)]">Effectue ton virement pour valider ta participation</div>
          </div>
        </div>
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--warning)] text-white">
          <span className="text-sm font-black">{buyIn}€</span>
        </div>
      </div>

      {/* IBAN */}
      <div className="flex items-center gap-2 bg-[var(--surface)] rounded-xl px-3 py-2.5 border border-[var(--warning)]/20">
        <span className="text-xs font-mono text-[var(--foreground)] break-all leading-snug flex-1 select-all">
          {iban}
        </span>
        <CopyIbanButton iban={iban} />
      </div>

      {/* Instructions */}
      {instructions && (
        <p className="text-[11px] text-[var(--foreground-muted)] whitespace-pre-line leading-relaxed">
          {instructions}
        </p>
      )}
    </div>
  )
}

function SectionHeader({ title, icon, href }: { title: string; icon: React.ReactNode; href?: string }) {
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
