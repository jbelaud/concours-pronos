import Link from "next/link"
import { auth } from "@/lib/auth"
import { FootballAvatar } from "@/components/shared/football-avatar"
import { LayoutGrid } from "lucide-react"

interface TopBarProps {
  title?: string
  showBack?: boolean
}

export async function TopBar({ title = "ConcoursPronos" }: TopBarProps) {
  const session = await auth()

  return (
    <header
      className="sticky top-0 z-40 glass-strong border-b border-[var(--border)]"
      style={{ paddingTop: "var(--safe-area-top)" }}
    >
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        <Link href="/accueil" className="flex items-center gap-2">
          <span className="text-xl">⚽</span>
          <span className="font-bold text-[var(--foreground)] tracking-tight">
            {title}
          </span>
        </Link>

        {session?.user && (
          <div className="flex items-center gap-3">
            <Link
              href="/concours"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-xs font-semibold text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:border-[var(--accent)]/40 transition-all"
            >
              <LayoutGrid size={13} />
              Mes concours
            </Link>
            <Link href="/compte">
              <FootballAvatar
                seed={session.user.avatarSeed}
                size={34}
                className="ring-2 ring-[var(--border-strong)] hover:ring-[var(--accent)] transition-all"
              />
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
