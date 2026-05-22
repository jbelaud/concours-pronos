import Link from "next/link"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { ProfileSwitcher } from "@/components/layout/profile-switcher"
import { LayoutGrid } from "lucide-react"

interface TopBarProps {
  title?: string
  showBack?: boolean
}

export async function TopBar({ title = "ConcoursPronos" }: TopBarProps) {
  const session = await auth()

  let subProfiles: { id: string; firstName: string; lastName: string; avatarSeed: string }[] = []
  if (session?.user?.ownerId) {
    subProfiles = await db.subProfile.findMany({
      where: { ownerId: session.user.ownerId },
      select: { id: true, firstName: true, lastName: true, avatarSeed: true },
      orderBy: { createdAt: "asc" },
    })
  }

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
            <ProfileSwitcher
              ownerFirstName={session.user.firstName}
              ownerLastName={session.user.lastName}
              ownerAvatarSeed={
                session.user.activeSubProfileId
                  ? (subProfiles.find((s) => s.id === session.user.activeSubProfileId)?.avatarSeed ?? session.user.avatarSeed)
                  : session.user.avatarSeed
              }
              subProfiles={subProfiles}
              activeSubProfileId={session.user.activeSubProfileId}
              activeFirstName={session.user.firstName}
              activeAvatarSeed={session.user.avatarSeed}
            />
          </div>
        )}
      </div>
    </header>
  )
}
