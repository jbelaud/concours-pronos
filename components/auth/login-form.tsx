"use client"

import { useState, useTransition } from "react"
import { motion } from "framer-motion"
import { Eye, EyeOff, LogIn, Mail } from "lucide-react"
import { loginWithCredentials, loginWithGoogle } from "@/actions/auth.actions"
import { cn } from "@/lib/utils"

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleCredentials = (formData: FormData) => {
    setError(null)
    startTransition(async () => {
      const result = await loginWithCredentials(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-sm mx-auto"
    >
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">⚽</div>
        <h1 className="text-2xl font-black text-gradient mb-1">ConcoursPronos</h1>
        <p className="text-sm text-[var(--foreground-muted)]">
          Plateforme privée de pronostics
        </p>
      </div>

      {/* Google */}
      <form action={loginWithGoogle} className="mb-4">
        <button
          type="submit"
          disabled={isPending}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-elevated)] text-[var(--foreground)] font-semibold text-sm hover:border-[var(--accent)]/50 hover:bg-[var(--accent-dim)] transition-all active:scale-95"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.616z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continuer avec Google
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-[var(--border)]" />
        <span className="text-xs text-[var(--foreground-subtle)]">ou</span>
        <div className="flex-1 h-px bg-[var(--border)]" />
      </div>

      {/* Credentials form */}
      <form action={handleCredentials} className="flex flex-col gap-3">
        <div className="relative">
          <Mail
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]"
          />
          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            autoComplete="email"
            className="w-full pl-9 pr-4 py-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
        </div>

        <div className="relative">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Mot de passe"
            required
            autoComplete="current-password"
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
          <LogIn size={16} />
          {isPending ? "Connexion..." : "Se connecter"}
        </button>
      </form>

      <p className="text-center text-xs text-[var(--foreground-subtle)] mt-6">
        Accès uniquement sur invitation. Tu n&apos;as pas de compte ?{" "}
        <br />Demande à l&apos;administrateur.
      </p>
    </motion.div>
  )
}
