import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"

export const authConfig: NextAuthConfig = {
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/login", error: "/login" },
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = ((user as { role?: string }).role ?? "USER") as import("@prisma/client").Role
        token.firstName = (user as { firstName?: string }).firstName ?? ""
        token.lastName = (user as { lastName?: string }).lastName ?? ""
        token.avatarSeed = (user as { avatarSeed?: string }).avatarSeed ?? ""
      }
      return token
    },
    session({ session, token }) {
      if (session.user && token) {
        session.user.id = (token.activeGhostUserId as string | null) ?? (token.id as string)
        session.user.ownerId = token.id as string
        session.user.role = ((token.role as string) ?? "USER") as import("@prisma/client").Role
        session.user.firstName = (token.firstName as string) ?? ""
        session.user.lastName = (token.lastName as string) ?? ""
        session.user.avatarSeed = (token.avatarSeed as string) ?? ""
        session.user.activeSubProfileId = (token.activeSubProfileId as string | null) ?? null
      }
      return session
    },
  },
}
