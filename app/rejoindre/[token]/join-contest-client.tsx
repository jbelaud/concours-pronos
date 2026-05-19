"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { joinContestViaLink } from "@/actions/contest.actions"
import { registerAndJoinContest, loginWithCredentialsNoRedirect } from "@/actions/auth.actions"
import { signIn } from "next-auth/react"
import { toast } from "sonner"
import { UserPlus, LogIn, CheckCircle, Eye, EyeOff, Mail } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface Props {
  inviteToken: string
  contestName: string
  isLoggedIn: boolean
  alreadyJoined: boolean
  contestStatus: string
}

export function JoinContestClient({ inviteToken, contestName, isLoggedIn, alreadyJoined, contestStatus }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [joined, setJoined] = useState(alreadyJoined)
  const [mode, setMode] = useState<"register" | "login">("register")

  // Champs inscription
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Déjà inscrit au concours — afficher bouton accueil
  if (joined) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <CheckCircle size={48} className="text-[var(--success)]" />
        <p className="font-bold text-[var(--foreground)]">Tu es inscrit(e) !</p>
        <Link
          href="/accueil"
          className="py-3 px-6 rounded-xl gradient-accent text-white text-sm font-semibold hover:opacity-90 transition-all"
        >
          Accéder au concours →
        </Link>
      </div>
    )
  }

  // Concours en brouillon
  if (contestStatus === "DRAFT") {
    return (
      <div className="surface-card p-4 text-center text-sm text-[var(--foreground-muted)]">
        Les inscriptions ne sont pas encore ouvertes. Reviens bientôt !
      </div>
    )
  }

  // Déjà connecté → simple bouton rejoindre
  if (isLoggedIn) {
    const handleJoin = () => {
      startTransition(async () => {
        const result = await joinContestViaLink(inviteToken)
        if ("error" in result && result.error) {
          toast.error(result.error)
        } else {
          toast.success(`Bienvenue dans ${contestName} ! 🎉`)
          setJoined(true)
          router.push("/accueil")
        }
      })
    }
    return (
      <button
        onClick={handleJoin}
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl gradient-accent text-white font-bold text-sm hover:opacity-90 transition-all active:scale-95 disabled:opacity-70"
      >
        <UserPlus size={18} />
        {isPending ? "Inscription en cours..." : "Rejoindre le concours"}
      </button>
    )
  }

  // Non connecté — formulaire inline
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await registerAndJoinContest({ inviteToken, firstName, lastName, email, password })
      if ("error" in result) {
        setError(result.error)
      } else {
        // Connexion automatique après inscription
        const signInResult = await signIn("credentials", { email, password, redirect: false })
        if (signInResult?.error) {
          toast.success("Compte créé ! Connecte-toi pour accéder au concours.")
          router.push(`/login`)
        } else {
          toast.success(`Bienvenue dans ${contestName} ! 🎉`)
          setJoined(true)
          router.push("/accueil")
        }
      }
    })
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await loginWithCredentialsNoRedirect({ email, password })
      if ("error" in result && result.error) {
        setError(result.error)
      } else {
        // Après connexion, rejoindre le concours
        const joinResult = await joinContestViaLink(inviteToken)
        if ("error" in joinResult && joinResult.error) {
          toast.error(joinResult.error)
          router.push("/accueil")
        } else {
          toast.success(`Bienvenue dans ${contestName} ! 🎉`)
          setJoined(true)
          router.push("/accueil")
        }
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toggle register / login */}
      <div className="flex rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] p-1">
        <button
          type="button"
          onClick={() => { setMode("register"); setError(null) }}
          className={cn(
            "flex-1 py-2 rounded-lg text-sm font-semibold transition-all",
            mode === "register"
              ? "gradient-accent text-white shadow"
              : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
          )}
        >
          Créer un compte
        </button>
        <button
          type="button"
          onClick={() => { setMode("login"); setError(null) }}
          className={cn(
            "flex-1 py-2 rounded-lg text-sm font-semibold transition-all",
            mode === "login"
              ? "gradient-accent text-white shadow"
              : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
          )}
        >
          Se connecter
        </button>
      </div>

      <AnimatePresence mode="wait">
        {mode === "register" ? (
          <motion.form
            key="register"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.15 }}
            onSubmit={handleRegister}
            className="flex flex-col gap-3"
          >
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

            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]" />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] text-sm placeholder:text-[var(--foreground-subtle)] focus:outline-none focus:border-[var(--accent)] transition-colors"
              />
            </div>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Mot de passe (min. 8 caractères)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] text-sm placeholder:text-[var(--foreground-subtle)] focus:outline-none focus:border-[var(--accent)] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-[var(--error)] text-center">
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="flex items-center justify-center gap-2 py-3 rounded-xl gradient-accent text-white font-bold text-sm hover:opacity-90 transition-all active:scale-95 disabled:opacity-70"
            >
              <UserPlus size={16} />
              {isPending ? "Création du compte..." : "Créer mon compte et rejoindre"}
            </button>
          </motion.form>
        ) : (
          <motion.form
            key="login"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15 }}
            onSubmit={handleLogin}
            className="flex flex-col gap-3"
          >
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]" />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] text-sm placeholder:text-[var(--foreground-subtle)] focus:outline-none focus:border-[var(--accent)] transition-colors"
              />
            </div>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] text-sm placeholder:text-[var(--foreground-subtle)] focus:outline-none focus:border-[var(--accent)] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-[var(--error)] text-center">
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="flex items-center justify-center gap-2 py-3 rounded-xl gradient-accent text-white font-bold text-sm hover:opacity-90 transition-all active:scale-95 disabled:opacity-70"
            >
              <LogIn size={16} />
              {isPending ? "Connexion..." : "Se connecter et rejoindre"}
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Google */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-[var(--border)]" />
        <span className="text-xs text-[var(--foreground-subtle)]">ou</span>
        <div className="flex-1 h-px bg-[var(--border)]" />
      </div>
      <Link
        href={`/login?callbackUrl=${encodeURIComponent(`/rejoindre/${inviteToken}`)}`}
        className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-elevated)] text-[var(--foreground)] font-semibold text-sm hover:border-[var(--accent)]/50 transition-all"
      >
        <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.616z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
          <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
        Continuer avec Google
      </Link>
    </div>
  )
}
