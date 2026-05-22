import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import type { Role } from "@prisma/client"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      name: "Identifiants",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user || !user.password) return null

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        if (!passwordMatch) return null

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          avatarSeed: user.avatarSeed,
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        const nameParts = (user.name ?? "").trim().split(/\s+/)
        const firstName = nameParts[0] ?? ""
        const lastName = nameParts.slice(1).join(" ")

        const data: Record<string, string> = {}
        if (firstName) data.firstName = firstName
        if (lastName) data.lastName = lastName
        if (user.email === process.env.ADMIN_EMAIL) data.role = "ADMIN"

        if (Object.keys(data).length > 0) {
          await db.user.update({ where: { email: user.email }, data }).catch(() => {})
        }
      }
      return true
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role?: Role }).role ?? "USER"
        token.firstName = (user as { firstName?: string }).firstName ?? ""
        token.lastName = (user as { lastName?: string }).lastName ?? ""
        token.avatarSeed = (user as { avatarSeed?: string }).avatarSeed ?? ""
        token.activeSubProfileId = null
      }

      // Refresh from DB on each new session (keep role up to date)
      if (token.id && !user) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: {
            role: true,
            firstName: true,
            lastName: true,
            avatarSeed: true,
          },
        })
        if (dbUser) {
          token.role = dbUser.role
          token.firstName = dbUser.firstName
          token.lastName = dbUser.lastName
          token.avatarSeed = dbUser.avatarSeed
        }
      }

      // When a sub-profile is active, override display fields with ghost user data
      if (token.activeSubProfileId) {
        const sub = await db.subProfile.findUnique({
          where: { id: token.activeSubProfileId as string },
          select: { firstName: true, lastName: true, avatarSeed: true, ghostUserId: true, ownerId: true },
        })
        if (sub && sub.ownerId === token.id) {
          token.firstName = sub.firstName
          token.lastName = sub.lastName
          token.avatarSeed = sub.avatarSeed
          token.activeGhostUserId = sub.ghostUserId
        } else {
          token.activeSubProfileId = null
          token.activeGhostUserId = null
        }
      } else {
        token.activeGhostUserId = null
      }

      return token
    },

    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = (token.activeGhostUserId as string | null) ?? (token.id as string)
        session.user.ownerId = token.id as string
        session.user.role = token.role as Role
        session.user.firstName = token.firstName as string
        session.user.lastName = token.lastName as string
        session.user.avatarSeed = token.avatarSeed as string
        session.user.activeSubProfileId = (token.activeSubProfileId as string | null) ?? null
      }
      return session
    },
  },
})
