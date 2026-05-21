"use client"

import { useState } from "react"
import { Share2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface ShareResultButtonProps {
  text: string
}

export function ShareResultButton({ text }: ShareResultButtonProps) {
  const [shared, setShared] = useState(false)

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ text })
        setShared(true)
        setTimeout(() => setShared(false), 2000)
      } catch {
        // user cancelled — do nothing
      }
    }
  }

  const handleFacebook = () => {
    const encoded = encodeURIComponent(text)
    window.open(`https://www.facebook.com/sharer/sharer.php?quote=${encoded}&u=https://facebook.com`, "_blank", "noopener,noreferrer,width=600,height=500")
  }

  const hasNativeShare = typeof navigator !== "undefined" && !!navigator.share

  return (
    <div className="flex flex-col gap-2">
      {/* Bouton natif (mobile) */}
      {hasNativeShare && (
        <button
          onClick={handleNativeShare}
          className={cn(
            "flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all active:scale-95",
            shared
              ? "bg-[var(--success-dim)] text-[var(--success)] border border-[var(--success)]/30"
              : "gradient-accent text-white hover:opacity-90"
          )}
        >
          <Share2 size={16} />
          {shared ? "Partagé !" : "Partager mon résultat"}
        </button>
      )}

      {/* Bouton Facebook (toujours visible) */}
      <button
        onClick={handleFacebook}
        className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-[#1877F2] text-white hover:bg-[#1664d8] transition-colors active:scale-95"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
        Partager sur Facebook
      </button>
    </div>
  )
}
