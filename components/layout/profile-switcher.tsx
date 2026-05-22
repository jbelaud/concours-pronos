"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { FootballAvatar } from "@/components/shared/football-avatar"
import { ChevronDown, CheckCircle2, Loader2, Users } from "lucide-react"

interface SubProfile {
  id: string
  firstName: string
  lastName: string
  avatarSeed: string
}

interface Props {
  ownerFirstName: string
  ownerLastName: string
  ownerAvatarSeed: string
  subProfiles: SubProfile[]
  activeSubProfileId: string | null
  activeFirstName: string
  activeAvatarSeed: string
}

export function ProfileSwitcher({
  ownerFirstName,
  ownerLastName,
  ownerAvatarSeed,
  subProfiles,
  activeSubProfileId,
  activeFirstName,
  activeAvatarSeed,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [switching, setSwitching] = useState<string | null>(null)

  const hasSubProfiles = subProfiles.length > 0

  async function handleSwitch(subProfileId: string | null) {
    setSwitching(subProfileId ?? "__main__")
    try {
      const res = await fetch("/api/sub-profiles/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subProfileId }),
      })
      if (res.ok) { setOpen(false); router.refresh() }
    } finally {
      setSwitching(null)
    }
  }

  if (!hasSubProfiles) {
    return (
      <a href="/compte">
        <FootballAvatar
          seed={activeAvatarSeed}
          size={34}
          className="ring-2 ring-[var(--border-strong)] hover:ring-[var(--accent)] transition-all"
        />
      </a>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-xl hover:bg-[var(--surface-elevated)] px-2 py-1 transition-all"
      >
        <FootballAvatar
          seed={activeAvatarSeed}
          size={30}
          className="ring-2 ring-[var(--border-strong)]"
        />
        <span className="text-xs font-semibold text-[var(--foreground)] max-w-[60px] truncate hidden sm:block">
          {activeFirstName}
        </span>
        <ChevronDown size={12} className={`text-[var(--foreground-muted)] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 z-50 w-56 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xl overflow-hidden">
            <div className="px-3 pt-3 pb-1.5 flex items-center gap-1.5 text-[var(--foreground-muted)]">
              <Users size={11} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Changer de profil</span>
            </div>

            {/* Main profile */}
            <SwitcherRow
              firstName={ownerFirstName}
              lastName={ownerLastName}
              avatarSeed={ownerAvatarSeed}
              isActive={!activeSubProfileId}
              isSwitching={switching === "__main__"}
              onSwitch={() => handleSwitch(null)}
              label="Profil principal"
            />

            {/* Sub-profiles */}
            {subProfiles.map((sub) => (
              <SwitcherRow
                key={sub.id}
                firstName={sub.firstName}
                lastName={sub.lastName}
                avatarSeed={sub.avatarSeed}
                isActive={activeSubProfileId === sub.id}
                isSwitching={switching === sub.id}
                onSwitch={() => handleSwitch(sub.id)}
              />
            ))}

            <div className="border-t border-[var(--border)] mt-1">
              <a
                href="/compte"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-elevated)] transition-all"
              >
                Gérer les profils
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function SwitcherRow({
  firstName,
  lastName,
  avatarSeed,
  isActive,
  isSwitching,
  onSwitch,
  label,
}: {
  firstName: string
  lastName: string
  avatarSeed: string
  isActive: boolean
  isSwitching: boolean
  onSwitch: () => void
  label?: string
}) {
  return (
    <button
      onClick={onSwitch}
      disabled={isActive || isSwitching}
      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-all hover:bg-[var(--surface-elevated)] disabled:cursor-default ${isActive ? "bg-[var(--accent-dim)]" : ""}`}
    >
      <FootballAvatar seed={avatarSeed} size={28} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--foreground)] truncate">
          {firstName} {lastName}
        </p>
        {label && <p className="text-[10px] text-[var(--foreground-muted)]">{label}</p>}
      </div>
      {isSwitching ? (
        <Loader2 size={14} className="text-[var(--accent)] animate-spin shrink-0" />
      ) : isActive ? (
        <CheckCircle2 size={14} className="text-[var(--accent)] shrink-0" />
      ) : null}
    </button>
  )
}
