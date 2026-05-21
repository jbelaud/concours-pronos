import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Home, ClipboardCheck, Users, UserPlus, Settings, Star } from "lucide-react"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/accueil")
  }

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Admin top bar */}
      <header className="sticky top-0 z-40 glass-strong border-b border-[var(--purple)]/30">
        <div className="flex items-center gap-3 h-14 px-4 max-w-2xl mx-auto">
          <Link
            href="/accueil"
            className="p-1.5 rounded-lg text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
          >
            <ChevronLeft size={20} />
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-lg">⚙️</span>
            <span className="font-bold text-[var(--foreground)]">Administration</span>
          </div>
        </div>

        {/* Admin nav tabs */}
        <div className="flex overflow-x-auto border-t border-[var(--border)] px-4 max-w-2xl mx-auto gap-1">
          {[
            { href: "/admin", label: "Accueil", icon: Home },
            { href: "/admin/resultats", label: "Résultats", icon: ClipboardCheck },
            { href: "/admin/bonus", label: "Bonus", icon: Star },
            { href: "/admin/participants", label: "Joueurs", icon: Users },
            { href: "/admin/invitations", label: "Invitations", icon: UserPlus },
            { href: "/admin/concours", label: "Concours", icon: Settings },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-1.5 py-2.5 px-3 text-xs font-semibold text-[var(--foreground-muted)] hover:text-[var(--foreground)] whitespace-nowrap border-b-2 border-transparent hover:border-[var(--purple)]/50 transition-all"
            >
              <item.icon size={13} />
              {item.label}
            </Link>
          ))}
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-4 pb-8">
        {children}
      </main>
    </div>
  )
}
