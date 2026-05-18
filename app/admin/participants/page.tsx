import { db } from "@/lib/db"
import { ParticipantsList } from "@/components/admin/participants-list"
import { AddUserForm } from "@/components/admin/add-user-form"
import { Users } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Participants" }

export default async function ParticipantsPage() {
  const contests = await db.contest.findMany({
    where: { status: { in: ["DRAFT", "REGISTRATION", "ONGOING"] } },
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" },
  })

  const activeContestId = contests[0]?.id

  const participants = activeContestId
    ? await db.contestParticipant.findMany({
        where: { contestId: activeContestId },
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        orderBy: { joinedAt: "asc" },
      })
    : []

  const paidCount = participants.filter((p) => p.hasPaid).length

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-black text-[var(--foreground)]">Participants</h1>
        <p className="text-sm text-[var(--foreground-muted)]">
          {participants.length} inscrits · {paidCount} ont payé
        </p>
      </div>

      <AddUserForm contests={contests} />

      <section>
        <div className="flex items-center gap-2 mb-2">
          <Users size={14} className="text-[var(--foreground-muted)]" />
          <h2 className="text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-wider">
            Liste des participants
          </h2>
        </div>
        <ParticipantsList participants={participants} />
      </section>
    </div>
  )
}
