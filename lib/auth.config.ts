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
        token.role = (user as { role?: string }).role ?? "USER"
        token.firstName = (user as { firstName?: string }).firstName ?? ""
        token.lastName = (user as { lastName?: string }).lastName ?? ""
        token.avatarSeed = (user as { avatarSeed?: string }).avatarSeed ?? ""
      }
      return token
    },
    session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string
        session.user.role = (token.role as string) as "USER" | "ADMIN" ?? "USER"
        session.user.firstName = (token.firstName as string) ?? ""
        session.user.lastName = (token.lastName as string) ?? ""
        session.user.avatarSeed = (token.avatarSeed as string) ?? ""
      }
      return session
    },
  },
}
