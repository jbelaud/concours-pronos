"use client"

import { useState } from "react"
import { Copy, Check } from "lucide-react"
import { cn } from "@/lib/utils"

export function CopyIbanButton({ iban }: { iban: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(iban)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback silencieux
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0",
        copied
          ? "bg-[var(--success-dim)] text-[var(--success)] border border-[var(--success)]/30"
          : "bg-[var(--surface-elevated)] text-[var(--foreground-muted)] border border-[var(--border)] hover:border-[var(--accent)]/40 hover:text-[var(--foreground)]"
      )}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copié !" : "Copier"}
    </button>
  )
}
