"use client"

import { useState, useTransition } from "react"
import { motion } from "framer-motion"
import { Eye, EyeOff, UserPlus } from "lucide-react"
import { registerFromInvitation } from "@/actions/auth.actions"
import { signIn } from "next-auth/react"
import { cn } from "@/lib/utils"

interface InvitationFormProps {
  token: string
  email: string
  firstName: string
  lastName: string
}

export function InvitationForm({
  token,
  email,
  firstName,
  lastName,
}: InvitationFormProps) {
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.")
      return
    }
    setError(null)

    startTransition(async () => {
      const result = await registerFromInvitation({ token, password })
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        await signIn("credentials", { email, password, callbackUrl: "/accueil" })
      }
    })
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8"
      >
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-xl font-bold text-[var(--foreground)] mb-2">
          Bienvenue {firstName} !
        </h2>
        <p className="text-[var(--foreground-muted)] text-sm">
          Ton compte est créé. Connexion en cours...
        </p>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-sm mx-auto"
    >
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">⚽</div>
        <h1 className="text-2xl font-black text-gradient mb-1">Tu es invité(e) !</h1>
        <p className="text-sm text-[var(--foreground-muted)]">
          Crée ton compte pour rejoindre la compétition
        </p>
      </div>

      {/* User info preview */}
      <div className="surface-card p-4 mb-6 text-center">
        <div className="text-lg font-bold text-[var(--foreground)]">
          {firstName} {lastName}
        </div>
        <div className="text-sm text-[var(--foreground-muted)]">{email}</div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Choisir un mot de passe (min. 8 caractères)"
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full pl-4 pr-10 py-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-[var(--error)] text-center"
          >
            {error}
          </motion.p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className={cn(
            "flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95",
            "gradient-accent text-white hover:opacity-90",
            isPending && "opacity-70 cursor-wait"
          )}
        >
          <UserPlus size={16} />
          {isPending ? "Création..." : "Créer mon compte"}
        </button>
      </form>

      <p className="text-center text-xs text-[var(--foreground-subtle)] mt-6">
        Tu pourras aussi te connecter avec Google si tu utilises la même adresse email.
      </p>
    </motion.div>
  )
}
