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

  const hasNativeShare = typeof navigator !== "undefined" && !!navigator.share

  if (!hasNativeShare) return null

  return (
    <button
      onClick={handleNativeShare}
      className={cn(
        "w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all active:scale-95",
        shared
          ? "bg-[var(--success-dim)] text-[var(--success)] border border-[var(--success)]/30"
          : "gradient-accent text-white hover:opacity-90"
      )}
    >
      <Share2 size={16} />
      {shared ? "Partagé !" : "Partager mon résultat"}
    </button>
  )
}
