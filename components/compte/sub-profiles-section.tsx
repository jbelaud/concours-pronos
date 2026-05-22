"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { FootballAvatar } from "@/components/shared/football-avatar"
import { Plus, Trash2, Users, CheckCircle2, Loader2 } from "lucide-react"

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
}

export function SubProfilesSection({
  ownerFirstName,
  ownerLastName,
  ownerAvatarSeed,
  subProfiles: initialSubProfiles,
  activeSubProfileId,
}: Props) {
  const router = useRouter()
  const [subProfiles, setSubProfiles] = useState(initialSubProfiles)
  const [showForm, setShowForm] = useState(false)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [loading, setLoading] = useState(false)
  const [switching, setSwitching] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState("")

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/sub-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Erreur"); return }
      setSubProfiles((prev) => [...prev, data])
      setFirstName("")
      setLastName("")
      setShowForm(false)
    } finally {
      setLoading(false)
    }
  }

  async function handleSwitch(subProfileId: string | null) {
    setSwitching(subProfileId ?? "__main__")
    try {
      await fetch("/api/sub-profiles/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subProfileId }),
      })
      router.refresh()
    } finally {
      setSwitching(null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce sous-profil ? Toutes ses données de jeu seront également supprimées.")) return
    setDeleting(id)
    try {
      await fetch(`/api/sub-profiles/${id}`, { method: "DELETE" })
      setSubProfiles((prev) => prev.filter((s) => s.id !== id))
      if (activeSubProfileId === id) {
        await handleSwitch(null)
      }
    } finally {
      setDeleting(null)
    }
  }

  const isMainActive = !activeSubProfileId

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[var(--foreground-muted)]">
          <Users size={14} />
          <span className="text-sm font-semibold text-[var(--foreground)]">Mes profils</span>
        </div>
        {subProfiles.length < 5 && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1 text-xs font-semibold text-[var(--accent)] hover:opacity-80 transition-opacity"
          >
            <Plus size={13} />
            Ajouter
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="surface-card p-4 flex flex-col gap-3">
          <p className="text-xs font-semibold text-[var(--foreground-muted)]">Nouveau sous-profil</p>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] focus:outline-none focus:border-[var(--accent)]"
              placeholder="Prénom"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              maxLength={40}
            />
            <input
              className="flex-1 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] focus:outline-none focus:border-[var(--accent)]"
              placeholder="Nom"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              maxLength={40}
            />
          </div>
          {error && <p className="text-xs text-[var(--error)]">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setShowForm(false); setError("") }}
              className="flex-1 py-2 rounded-lg border border-[var(--border)] text-xs font-semibold text-[var(--foreground-muted)] hover:border-[var(--foreground-muted)] transition-all"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 rounded-lg bg-[var(--accent)] text-xs font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {loading && <Loader2 size={12} className="animate-spin" />}
              Créer
            </button>
          </div>
        </form>
      )}

      {/* Profile list */}
      <div className="flex flex-col gap-2">
        {/* Main profile */}
        <ProfileRow
          firstName={ownerFirstName}
          lastName={ownerLastName}
          avatarSeed={ownerAvatarSeed}
          isActive={isMainActive}
          isSwitching={switching === "__main__"}
          onSwitch={() => handleSwitch(null)}
          label="Profil principal"
        />

        {/* Sub-profiles */}
        {subProfiles.map((sub) => (
          <ProfileRow
            key={sub.id}
            firstName={sub.firstName}
            lastName={sub.lastName}
            avatarSeed={sub.avatarSeed}
            isActive={activeSubProfileId === sub.id}
            isSwitching={switching === sub.id}
            onSwitch={() => handleSwitch(sub.id)}
            onDelete={() => handleDelete(sub.id)}
            isDeleting={deleting === sub.id}
          />
        ))}
      </div>
    </section>
  )
}

function ProfileRow({
  firstName,
  lastName,
  avatarSeed,
  isActive,
  isSwitching,
  onSwitch,
  onDelete,
  isDeleting,
  label,
}: {
  firstName: string
  lastName: string
  avatarSeed: string
  isActive: boolean
  isSwitching: boolean
  onSwitch: () => void
  onDelete?: () => void
  isDeleting?: boolean
  label?: string
}) {
  return (
    <div
      className={`surface-card p-3 flex items-center gap-3 ${isActive ? "border border-[var(--accent)]/40 bg-[var(--accent-dim)]" : ""}`}
    >
      <FootballAvatar seed={avatarSeed} size={36} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--foreground)] truncate">
          {firstName} {lastName}
        </p>
        {label && <p className="text-[10px] text-[var(--foreground-muted)]">{label}</p>}
      </div>

      {isActive ? (
        <CheckCircle2 size={16} className="text-[var(--accent)] shrink-0" />
      ) : (
        <button
          onClick={onSwitch}
          disabled={isSwitching}
          className="text-xs font-semibold text-[var(--accent)] hover:opacity-80 transition-opacity disabled:opacity-50 shrink-0 flex items-center gap-1"
        >
          {isSwitching && <Loader2 size={11} className="animate-spin" />}
          Jouer
        </button>
      )}

      {onDelete && (
        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="ml-1 text-[var(--foreground-subtle)] hover:text-[var(--error)] transition-colors disabled:opacity-50 shrink-0"
          aria-label="Supprimer"
        >
          {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
        </button>
      )}
    </div>
  )
}
