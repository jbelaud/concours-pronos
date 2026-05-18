import { auth, signOut } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { FootballAvatar } from "@/components/shared/football-avatar"
import { LogOut, Shield } from "lucide-react"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Mon compte" }

export default async function ComptePage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      firstName: true,
      lastName: true,
      email: true,
      avatarSeed: true,
      role: true,
      createdAt: true,
    },
  })

  if (!user) redirect("/login")

  const contest = await db.contest.findFirst({
    where: { status: { in: ["ONGOING", "REGISTRATION", "DRAFT"] } },
    orderBy: { createdAt: "desc" },
  })

  const myEntry = contest
    ? await db.leaderboardEntry.findUnique({
        where: {
          contestId_userId: {
            contestId: contest.id,
            userId: session.user.id,
          },
        },
      })
    : null

  const predictionsCount = contest
    ? await db.prediction.count({
        where: { contestId: contest.id, userId: session.user.id },
      })
    : 0

  const exactScoresTotal = contest
    ? await db.prediction.count({
        where: {
          contestId: contest.id,
          userId: session.user.id,
          status: "EXACT_SCORE",
        },
      })
    : 0

  return (
    <div className="flex flex-col gap-4">
      {/* Profile card */}
      <div className="surface-card p-5 flex flex-col items-center gap-3">
        <FootballAvatar
          seed={session.user.avatarSeed}
          size={80}
          className="ring-4 ring-[var(--accent)]/30"
        />
        <div className="text-center">
          <h1 className="text-xl font-black text-[var(--foreground)]">
            {user.firstName} {user.lastName}
          </h1>
          <p className="text-sm text-[var(--foreground-muted)]">{user.email}</p>
          {user.role === "ADMIN" && (
            <span className="inline-flex items-center gap-1 text-xs bg-[var(--purple-dim)] text-[var(--purple)] rounded-full px-2 py-0.5 mt-1 font-medium">
              <Shield size={10} />
              Administrateur
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      {contest && (
        <div className="grid grid-cols-3 gap-2">
          <div className="surface-card p-3 text-center">
            <div className="text-2xl font-black text-[var(--foreground)]">
              {myEntry?.rank ?? "–"}
              {myEntry?.rank && <span className="text-sm font-normal">e</span>}
            </div>
            <div className="text-xs text-[var(--foreground-muted)] mt-0.5">Classement</div>
          </div>
          <div className="surface-card p-3 text-center">
            <div className="text-2xl font-black text-[var(--foreground)]">
              {myEntry?.totalPoints ?? 0}
            </div>
            <div className="text-xs text-[var(--foreground-muted)] mt-0.5">Points</div>
          </div>
          <div className="surface-card p-3 text-center">
            <div className="text-2xl font-black text-[var(--accent)]">
              {exactScoresTotal}
            </div>
            <div className="text-xs text-[var(--foreground-muted)] mt-0.5">Scores exacts</div>
          </div>
        </div>
      )}

      {/* Admin link */}
      {user.role === "ADMIN" && (
        <Link
          href="/admin"
          className="flex items-center justify-between p-4 rounded-xl bg-[var(--purple-dim)] border border-[var(--purple)]/30"
        >
          <div className="flex items-center gap-3">
            <Shield size={20} className="text-[var(--purple)]" />
            <div>
              <div className="font-semibold text-sm text-[var(--foreground)]">
                Administration
              </div>
              <div className="text-xs text-[var(--foreground-muted)]">
                Gérer le concours, résultats, invitations
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* Sign out */}
      <form
        action={async () => {
          "use server"
          await signOut({ redirectTo: "/login" })
        }}
      >
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
