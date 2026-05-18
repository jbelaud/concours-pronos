"use client"

import { useTransition } from "react"
import { fixContestFlags } from "@/actions/admin.actions"
import { Flag } from "lucide-react"
import { toast } from "sonner"

export function FixFlagsButton({ contestId }: { contestId: string }) {
  const [isPending, startTransition] = useTransition()

  const handle = () => {
    startTransition(async () => {
      const result = await fixContestFlags(contestId)
      if (result.success) {
        toast.success(`${result.fixed} drapeau(x) mis à jour`)
      }
    })
  }

  return (
    <button
      onClick={handle}
      disabled={isPending}
      className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs text-[var(--accent)] hover:bg-[var(--accent-dim)] transition-all border border-[var(--accent)]/20 disabled:opacity-50"
    >
      <Flag size={12} />
      {isPending ? "Correction..." : "Réparer les drapeaux"}
    </button>
  )
}
