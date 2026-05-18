import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { InvitationForm } from "@/components/auth/invitation-form"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Créer mon compte" }

interface Props {
  params: Promise<{ token: string }>
}

export default async function InvitationPage({ params }: Props) {
  const { token } = await params

  const invite = await db.invite.findUnique({ where: { token } })

  if (!invite || invite.status !== "PENDING" || new Date() > invite.expiresAt) {
    notFound()
  }

  return (
    <InvitationForm
      token={token}
      email={invite.email}
      firstName={invite.firstName}
      lastName={invite.lastName}
    />
  )
}
