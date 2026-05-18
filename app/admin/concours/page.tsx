import Link from "next/link"
import { db } from "@/lib/db"
import { Plus } from "lucide-react"
import { DeleteContestButton } from "@/components/admin/delete-contest-button"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Concours" }

export default async function ConcoursPage() {
  const contests = await db.contest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      settings: true,
      prizepool: true,
      _count: { select: { participants: true } },
    },
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-[var(--foreground)]">Concours</h1>
        <Link
          href="/admin/concours/nouveau"
          className="flex items-center gap-1.5 gradient-accent text-white text-sm font-semibold py-2 px-4 rounded-xl"
        >
          <Plus size={15} />
          Nouveau
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {contests.map((contest) => (
          <div key={contest.id} className="surface-card p-4">
            <div className="font-bold text-[var(--foreground)]">{contest.name}</div>
            <div className="text-xs text-[var(--foreground-muted)] mt-1">
              {contest._count.participants} participants · Buy-in : {contest.buyIn}€
            </div>
            <div className="text-xs text-[var(--foreground-muted)]">
              Points correct : {contest.settings?.pointsCorrectResult ?? 3} ·
              Exact : +{contest.settings?.pointsExactScore ?? 1}
            </div>
            <DeleteContestButton contestId={contest.id} contestName={contest.name} />
          </div>
        ))}
        {contests.length === 0 && (
          <div className="text-center py-12 text-[var(--foreground-muted)] text-sm">
            Aucun concours. Crée-en un !
          </div>
        )}
      </div>
    </div>
  )
}
