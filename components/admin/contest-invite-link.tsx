"use client"

import { useState, useTransition } from "react"
import { QRCodeSVG } from "qrcode.react"
import { Copy, RefreshCw, QrCode, ExternalLink, Check } from "lucide-react"
import { regenerateContestInviteToken } from "@/actions/admin.actions"
import { toast } from "sonner"

interface ContestInviteLinkProps {
  contestId: string
  contestName: string
  inviteToken: string | null
}

export function ContestInviteLink({ contestId, contestName, inviteToken: initialToken }: ContestInviteLinkProps) {
  const [token, setToken] = useState(initialToken)
  const [showQr, setShowQr] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isPending, startTransition] = useTransition()

  const appUrl = typeof window !== "undefined" ? window.location.origin : ""
  const inviteUrl = token ? `${appUrl}/rejoindre/${token}` : null

  const handleCopy = async () => {
    if (!inviteUrl) return
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    toast.success("Lien copié !")
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRegenerate = () => {
    startTransition(async () => {
      const result = await regenerateContestInviteToken(contestId)
      if (result.success) {
        setToken(result.token)
        toast.success("Nouveau lien généré")
      }
    })
  }

  if (!inviteUrl) {
    return (
      <button
        onClick={handleRegenerate}
        disabled={isPending}
        className="text-xs text-[var(--accent)] underline"
      >
        Générer un lien d&apos;invitation
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0 py-2 px-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-xs text-[var(--foreground-muted)] truncate font-mono">
          {inviteUrl}
        </div>
        <button
          onClick={handleCopy}
          className="shrink-0 p-2 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--accent)] transition-colors"
          title="Copier le lien"
        >
          {copied ? <Check size={16} className="text-[var(--success)]" /> : <Copy size={16} />}
        </button>
        <button
          onClick={() => setShowQr(!showQr)}
          className="shrink-0 p-2 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--accent)] transition-colors"
          title="Afficher le QR code"
        >
          <QrCode size={16} />
        </button>
        <a
          href={inviteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 p-2 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--accent)] transition-colors"
          title="Ouvrir le lien"
        >
          <ExternalLink size={16} />
        </a>
      </div>

      {showQr && (
        <div className="flex flex-col items-center gap-3 p-4 surface-card">
          <p className="text-xs text-[var(--foreground-muted)] text-center">
            Scanner pour rejoindre <strong className="text-[var(--foreground)]">{contestName}</strong>
          </p>
          <div className="p-3 bg-white rounded-xl">
            <QRCodeSVG
              value={inviteUrl}
              size={200}
              level="M"
              includeMargin={false}
            />
          </div>
          <p className="text-[10px] text-[var(--foreground-subtle)] text-center">
            Partage ce QR code pour inviter des joueurs
          </p>
        </div>
      )}

      <button
        onClick={handleRegenerate}
        disabled={isPending}
        className="flex items-center gap-1.5 text-xs text-[var(--foreground-muted)] hover:text-[var(--warning)] transition-colors"
        title="Révoquer l'ancien lien et en générer un nouveau"
      >
        <RefreshCw size={12} className={isPending ? "animate-spin" : ""} />
        {isPending ? "Génération..." : "Révoquer et recréer le lien"}
      </button>
    </div>
  )
}
