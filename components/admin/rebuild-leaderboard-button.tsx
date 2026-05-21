"use client"

import { useTransition } from "react"
import { RefreshCw } from "lucide-react"
import { forceRebuildLeaderboard } from "@/actions/admin.actions"
import { toast } from "sonner"

export function RebuildLeaderboardButton({ contestId }: { contestId: string }) {
  const [isPending, startTransition] = useTransition()

  const handleClick = () => {
    startTransition(async () => {
      const result = await forceRebuildLeaderboard(contestId)
      if ("error" in result) {
        toast.error(String(result.error))
      } else {
        toast.success("Classement recalculé avec succès !")
      }
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="flex items-center gap-1.5 py-2 px-3 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border)] text-xs font-semibold text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:border-[var(--accent)]/40 disabled:opacity-50 transition-all"
    >
      <RefreshCw size={13} className={isPending ? "animate-spin" : ""} />
      {isPending ? "Recalcul..." : "Recalculer classement"}
    </button>
  )
}
