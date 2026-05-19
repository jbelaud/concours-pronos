"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { joinContestViaLink } from "@/actions/contest.actions"
import { toast } from "sonner"
import { UserPlus, LogIn, CheckCircle } from "lucide-react"
import Link from "next/link"

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

  const handleJoin = () => {
    startTransition(async () => {
      const result = await joinContestViaLink(inviteToken)
      if ("error" in result && result.error) {
        toast.error(result.error)
      } else if ("alreadyJoined" in result && result.alreadyJoined) {
        toast.info("Tu es déjà inscrit à ce concours !")
        setJoined(true)
        router.push("/accueil")
      } else if ("success" in result && result.success) {
        toast.success(`Bienvenue dans ${contestName} ! 🎉`)
        setJoined(true)
        router.push("/accueil")
      }
    })
  }

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

  if (!isLoggedIn) {
    const returnUrl = `/rejoindre/${inviteToken}`
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-center text-[var(--foreground-muted)]">
          Connecte-toi ou crée un compte pour rejoindre ce concours.
        </p>
        <Link
          href={`/login?callbackUrl=${encodeURIComponent(returnUrl)}`}
          className="flex items-center justify-center gap-2 py-3 rounded-xl gradient-accent text-white text-sm font-semibold hover:opacity-90 transition-all"
        >
          <LogIn size={16} />
          Se connecter
        </Link>
        <p className="text-xs text-center text-[var(--foreground-subtle)]">
          Pas encore de compte ? Demande à l&apos;admin de t&apos;en créer un.
        </p>
      </div>
    )
  }

  if (contestStatus === "DRAFT") {
    return (
      <div className="surface-card p-4 text-center text-sm text-[var(--foreground-muted)]">
        Les inscriptions ne sont pas encore ouvertes. Reviens bientôt !
      </div>
    )
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
