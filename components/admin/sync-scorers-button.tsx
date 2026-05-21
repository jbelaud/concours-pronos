"use client"

import { useTransition } from "react"
import { RefreshCw } from "lucide-react"
import { syncScorerCandidatesFromTemplate } from "@/actions/admin.actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export function SyncScorersButton({ contestId, scorerCount }: { contestId: string; scorerCount: number }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleSync = () => {
    startTransition(async () => {
      const result = await syncScorerCandidatesFromTemplate(contestId)
      if ("error" in result) {
        toast.error(String(result.error))
      } else {
        toast.success(`${result.added} buteur${result.added > 1 ? "s" : ""} ajouté${result.added > 1 ? "s" : ""} (${result.total} au total)`)
        router.refresh()
      }
    })
  }

  return (
    <button
      onClick={handleSync}
      disabled={isPending}
      className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border)] text-xs font-semibold text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:border-[var(--accent)]/40 disabled:opacity-50 transition-all"
    >
      <RefreshCw size={12} className={isPending ? "animate-spin" : ""} />
      {scorerCount === 0 ? "Importer les buteurs" : `Sync (${scorerCount})`}
    </button>
  )
}
