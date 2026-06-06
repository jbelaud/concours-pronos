"use client"

import { useState, useTransition } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Wand2, X } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { generateGroupPredictions } from "@/actions/quick-pick.actions"

interface Props {
  contestId: string
  pendingGroupCount: number
}

export function QuickPickButton({ contestId, pendingGroupCount }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [isPending, startTransition] = useTransition()

  if (pendingGroupCount === 0) return null

  function handleConfirm() {
    startTransition(async () => {
      const result = await generateGroupPredictions(contestId)
      setShowModal(false)
      if (result.error) {
        toast.error(result.error)
      } else if (result.generated === 0) {
        toast.info("Tous tes pronostics de poules sont déjà remplis.")
      } else {
        toast.success("Vos pronostics de poules ont été générés automatiquement.")
      }
    })
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={cn(
          "flex items-center gap-2 w-full justify-center px-4 py-3 rounded-xl",
          "bg-gradient-to-r from-[var(--purple)] to-[var(--accent)]",
          "text-white text-sm font-semibold shadow-md active:scale-[0.98] transition-transform"
        )}
      >
        <Wand2 size={16} />
        Générer mes pronostics
        <span className="ml-1 bg-white/20 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
          {pendingGroupCount}
        </span>
      </button>

      <AnimatePresence>
        {showModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/60 z-40"
              onClick={() => !isPending && setShowModal(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, type: "spring", damping: 20, stiffness: 300 }}
              className="fixed inset-x-4 bottom-6 z-50 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-sm"
            >
              <div className="bg-[var(--surface-elevated)] border border-[var(--border)] rounded-2xl p-5 shadow-2xl">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--purple)] to-[var(--accent)] flex items-center justify-center shrink-0">
                      <Wand2 size={18} className="text-white" />
                    </div>
                    <h2 className="text-base font-bold text-[var(--foreground)]">Pronostics automatiques</h2>
                  </div>
                  {!isPending && (
                    <button
                      onClick={() => setShowModal(false)}
                      className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors mt-0.5"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>

                {/* Body */}
                <p className="text-sm text-[var(--foreground-muted)] mb-5 leading-relaxed">
                  Cette action va générer automatiquement tous les pronostics manquants des matchs de poules.
                  Tes pronostics déjà remplis ne seront pas modifiés.
                </p>

                <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--accent-dim)] border border-[var(--accent)]/20 mb-5">
                  <span className="text-lg">⚽</span>
                  <p className="text-xs text-[var(--accent)] font-semibold">
                    {pendingGroupCount} match{pendingGroupCount > 1 ? "s" : ""} à compléter
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowModal(false)}
                    disabled={isPending}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-[var(--border)] text-sm font-semibold text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors disabled:opacity-40"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={isPending}
                    className={cn(
                      "flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold text-white transition-all",
                      "bg-gradient-to-r from-[var(--purple)] to-[var(--accent)]",
                      "disabled:opacity-60 active:scale-[0.98]"
                    )}
                  >
                    {isPending ? "Génération…" : "Continuer"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
