"use server"

import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { signIn } from "@/lib/auth"
import { AuthError } from "next-auth"
import { redirect } from "next/navigation"

export async function loginWithCredentials(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!email || !password) {
    return { error: "Email et mot de passe requis." }
  }

  try {
    await signIn("credentials", { email, password, redirect: false })
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") {
        return { error: "Email ou mot de passe incorrect." }
      }
      return { error: "Erreur d'authentification." }
    }
    throw error
  }

  redirect("/accueil")
}

export async function loginWithGoogle() {
  await signIn("google", { redirectTo: "/accueil" })
}

export async function registerFromInvitation(formData: {
  token: string
  password: string
}) {
  const invite = await db.invite.findUnique({
    where: { token: formData.token },
  })

  if (!invite || invite.status !== "PENDING") {
    return { error: "Invitation invalide ou déjà utilisée." }
  }

  if (new Date() > invite.expiresAt) {
    await db.invite.update({
      where: { id: invite.id },
      data: { status: "EXPIRED" },
    })
    return { error: "Ce lien d'invitation a expiré." }
  }

  const existing = await db.user.findUnique({ where: { email: invite.email } })
  if (existing) {
    await db.invite.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    })
    return { error: "Un compte avec cet email existe déjà. Connecte-toi." }
  }

  const hashedPassword = await bcrypt.hash(formData.password, 12)

  const user = await db.user.create({
    data: {
      email: invite.email,
      firstName: invite.firstName,
      lastName: invite.lastName,
      name: `${invite.firstName} ${invite.lastName}`,
      password: hashedPassword,
      role: "USER",
    },
  })

  // Mark invite as accepted
  await db.invite.update({
    where: { id: invite.id },
    data: { status: "ACCEPTED", acceptedAt: new Date() },
  })

  // Auto-join contest if linked
  if (invite.contestId) {
    await db.contestParticipant.upsert({
      where: {
        contestId_userId: {
          contestId: invite.contestId,
          userId: user.id,
        },
      },
      create: { contestId: invite.contestId, userId: user.id },
      update: {},
    })

    // Create leaderboard entry
    await db.leaderboardEntry.upsert({
      where: {
        contestId_userId: {
          contestId: invite.contestId,
          userId: user.id,
        },
      },
      create: {
        contestId: invite.contestId,
        userId: user.id,
        rank: 0,
        totalPoints: 0,
      },
      update: {},
    })
  }

  return { success: true, email: user.email }
}
