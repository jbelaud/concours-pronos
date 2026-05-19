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
      // Pour Google OAuth : l'admin est automatiquement promu
      if (account?.provider === "google" && user.email) {
        if (user.email === process.env.ADMIN_EMAIL) {
          await db.user.update({
            where: { email: user.email },
            data: { role: "ADMIN" },
          }).catch(() => {})
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

      return token
    },

    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string
        session.user.role = token.role as Role
        session.user.firstName = token.firstName as string
        session.user.lastName = token.lastName as string
        session.user.avatarSeed = token.avatarSeed as string
      }
      return session
    },
  },
})
