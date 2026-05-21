"use client"

import { useState, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Share2, Copy, Check, QrCode, MessageCircle, X } from "lucide-react"
import { toast } from "sonner"
import { QRCodeSVG } from "qrcode.react"

interface ShareContestCardProps {
  contestName: string
  inviteToken: string
  participantCount: number
}

export function ShareContestCard({ contestName, inviteToken, participantCount }: ShareContestCardProps) {
  const [copied, setCopied] = useState(false)
  const [showQR, setShowQR] = useState(false)
  // Détecté côté client uniquement pour éviter le mismatch d'hydratation
  const [hasNativeShare, setHasNativeShare] = useState(false)
  const [origin, setOrigin] = useState("")

  useEffect(() => {
    setHasNativeShare(!!navigator.share)
    setOrigin(window.location.origin)
  }, [])

  const inviteUrl = `${origin}/rejoindre/${inviteToken}`

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      toast.success("Lien copié !")
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.error("Impossible de copier le lien")
    }
  }, [inviteUrl])

  const handleNativeShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Rejoins ${contestName} sur ConcoursPronos !`,
          text: `⚽ Je participe au concours de pronostics "${contestName}". Rejoins-moi !`,
          url: inviteUrl,
        })
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          toast.error("Impossible de partager")
        }
      }
    } else {
      handleCopy()
    }
  }, [contestName, inviteUrl, handleCopy])



  return (
    <>
      <section>
        <div className="flex items-center gap-1.5 mb-2 text-[var(--foreground-muted)]">
          <Share2 size={16} />
          <span className="text-sm font-semibold text-[var(--foreground)]">Partager le concours</span>
        </div>

        <div className="surface-card p-4 flex flex-col gap-3">
          {/* Texte incitatif */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center shrink-0 text-xl">
              ⚽
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">
                Invite tes amis à rejoindre !
              </p>
              <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
                {participantCount} participant{participantCount > 1 ? "s" : ""} — partage le lien pour agrandir le groupe
              </p>
            </div>
          </div>

          {/* Lien miniaturisé */}
          <div className="flex items-center gap-2 bg-[var(--surface-elevated)] rounded-xl px-3 py-2 border border-[var(--border)]">
            <span className="text-xs text-[var(--foreground-muted)] truncate flex-1 font-mono">
              /rejoindre/{inviteToken}
            </span>
            <button
              onClick={handleCopy}
              className="shrink-0 text-[var(--accent)] hover:text-[var(--foreground)] transition-colors"
              aria-label="Copier le lien"
            >
              <AnimatePresence mode="wait" initial={false}>
                {copied ? (
                  <motion.span
                    key="check"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Check size={16} className="text-[var(--success)]" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="copy"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Copy size={16} />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>

          {/* Boutons d'action */}
          <div className="grid grid-cols-3 gap-2">
            {hasNativeShare ? (
              <button
                onClick={handleNativeShare}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl gradient-accent text-white hover:opacity-90 transition-all active:scale-95"
              >
                <MessageCircle size={20} />
                <span className="text-[10px] font-semibold">Partager</span>
              </button>
            ) : (
              <button
                onClick={handleCopy}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl gradient-accent text-white hover:opacity-90 transition-all active:scale-95"
              >
                {copied ? <Check size={20} /> : <Copy size={20} />}
                <span className="text-[10px] font-semibold">{copied ? "Copié !" : "Copier"}</span>
              </button>
            )}

            <button
              onClick={handleCopy}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] hover:border-[var(--accent)]/40 transition-all active:scale-95"
            >
              {copied ? <Check size={20} className="text-[var(--success)]" /> : <Copy size={20} />}
              <span className="text-[10px] font-semibold">Copier lien</span>
            </button>

            <button
              onClick={() => setShowQR(true)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] hover:border-[var(--accent)]/40 transition-all active:scale-95"
            >
              <QrCode size={20} />
              <span className="text-[10px] font-semibold">QR Code</span>
            </button>
          </div>
        </div>
      </section>

      {/* QR Code Modal fullscreen */}
      <AnimatePresence>
        {showQR && (
          <QRModal
            url={inviteUrl}
            contestName={contestName}
            onClose={() => setShowQR(false)}
            onShare={handleNativeShare}
            hasNativeShare={hasNativeShare}
          />
        )}
      </AnimatePresence>
    </>
  )
}

function QRModal({
  url,
  contestName,
  onClose,
  onShare,
  hasNativeShare,
}: {
  url: string
  contestName: string
  onClose: () => void
  onShare: () => void
  hasNativeShare: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--background)]/95 backdrop-blur-sm p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ duration: 0.2, type: "spring", stiffness: 300, damping: 25 }}
        className="flex flex-col items-center gap-6 w-full max-w-xs"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between w-full">
          <div>
            <p className="text-xs text-[var(--foreground-muted)] uppercase tracking-wide font-semibold">QR Code invitation</p>
            <p className="text-sm font-bold text-[var(--foreground)] mt-0.5">{contestName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* QR Code */}
        <div className="p-5 bg-white rounded-2xl shadow-2xl">
          <QRCodeSVG
            value={url}
            size={220}
            bgColor="#ffffff"
            fgColor="#0B1020"
            level="M"
            includeMargin={false}
          />
        </div>

        <p className="text-xs text-[var(--foreground-muted)] text-center">
          Fais scanner ce QR code pour rejoindre le concours instantanément
        </p>

        {/* Actions */}
        <div className="flex gap-3 w-full">
          {hasNativeShare && (
            <button
              onClick={onShare}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl gradient-accent text-white font-semibold text-sm hover:opacity-90 transition-all active:scale-95"
            >
              <Share2 size={16} />
              Partager
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] font-semibold text-sm hover:border-[var(--accent)]/40 transition-all active:scale-95"
          >
            Fermer
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
