"use client"

import { useState, useTransition } from "react"
import { deleteContest } from "@/actions/admin.actions"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export function DeleteContestButton({ contestId, contestName }: { contestId: string; contestName: string }) {
  const [confirm, setConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteContest(contestId)
      if (result.success) {
        toast.success(`"${contestName}" supprimé.`)
        router.refresh()
      }
    })
  }

  if (confirm) {
    return (
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="flex-1 py-2 rounded-xl bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/30 hover:bg-red-500/30 transition-all disabled:opacity-50"
        >
          {isPending ? "Suppression..." : "Confirmer la suppression"}
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="py-2 px-3 rounded-xl bg-[var(--surface-elevated)] text-[var(--foreground-muted)] text-xs font-semibold"
        >
          Annuler
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="mt-3 flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-all border border-red-500/20"
    >
      <Trash2 size={12} />
      Supprimer ce concours
    </button>
  )
}
