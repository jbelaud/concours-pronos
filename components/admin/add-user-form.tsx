"use client"

import { useState, useTransition } from "react"
import { createManualUser } from "@/actions/admin.actions"
import { UserPlus } from "lucide-react"
import { toast } from "sonner"

interface AddUserFormProps {
  contests: Array<{ id: string; name: string }>
}

export function AddUserForm({ contests }: AddUserFormProps) {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [contestId, setContestId] = useState(contests[0]?.id ?? "")
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await createManualUser({
        firstName,
        lastName,
        email,
        contestId: contestId || undefined,
      })
      if ("error" in result) {
        toast.error(result.error)
      } else {
        toast.success(`${firstName} ${lastName} ajouté !`)
        setFirstName("")
        setLastName("")
        setEmail("")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="surface-card p-4 flex flex-col gap-3">
      <h2 className="font-bold text-[var(--foreground)] text-sm flex items-center gap-2">
        <UserPlus size={16} className="text-[var(--accent)]" />
        Ajouter un joueur manuellement
      </h2>

      <div className="grid grid-cols-2 gap-2">
        <input
          placeholder="Prénom"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
          className="py-2.5 px-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] text-sm placeholder:text-[var(--foreground-subtle)] focus:outline-none focus:border-[var(--accent)] transition-colors"
        />
        <input
          placeholder="Nom"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          required
          className="py-2.5 px-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] text-sm placeholder:text-[var(--foreground-subtle)] focus:outline-none focus:border-[var(--accent)] transition-colors"
        />
      </div>

      <input
        type="email"
        placeholder="Email (pour connexion future)"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="py-2.5 px-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] text-sm placeholder:text-[var(--foreground-subtle)] focus:outline-none focus:border-[var(--accent)] transition-colors"
      />

      {contests.length > 0 && (
        <select
          value={contestId}
          onChange={(e) => setContestId(e.target.value)}
          className="py-2.5 px-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
        >
          <option value="">— Concours (optionnel) —</option>
          {contests.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="flex items-center justify-center gap-2 py-2.5 rounded-xl gradient-accent text-white text-sm font-semibold hover:opacity-90 transition-all active:scale-95"
      >
        <UserPlus size={14} />
        {isPending ? "Ajout..." : "Ajouter le joueur"}
      </button>
    </form>
  )
}
