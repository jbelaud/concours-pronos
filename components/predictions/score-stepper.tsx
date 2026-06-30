"use client"

import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface ScoreStepperProps {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
  className?: string
  min?: number
}

export function ScoreStepper({
  value,
  onChange,
  disabled = false,
  className,
  min = 0,
}: ScoreStepperProps) {
  const decrement = () => {
    if (disabled || value <= min) return
    onChange(value - 1)
  }

  const increment = () => {
    if (disabled || value >= 20) return
    onChange(value + 1)
  }

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <button
        type="button"
        onPointerDown={increment}
        disabled={disabled || value >= 20}
        className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center text-lg font-bold",
          "bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)]",
          "hover:bg-[var(--accent-dim)] hover:border-[var(--accent)]/40 hover:text-[var(--accent)]",
          "active:scale-90 transition-all",
          (disabled || value >= 20) && "opacity-30 cursor-not-allowed hover:bg-[var(--surface-elevated)] hover:border-[var(--border)] hover:text-[var(--foreground)]"
        )}
        aria-label="Augmenter"
      >
        +
      </button>

      <div className="relative w-10 h-10 flex items-center justify-center">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={value}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.1 }}
            className="absolute inset-0 flex items-center justify-center text-2xl font-black text-[var(--foreground)]"
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </div>

      <button
        type="button"
        onPointerDown={decrement}
        disabled={disabled || value <= min}
        className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center text-lg font-bold",
          "bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)]",
          "hover:bg-[var(--accent-dim)] hover:border-[var(--accent)]/40 hover:text-[var(--accent)]",
          "active:scale-90 transition-all",
          (disabled || value <= 0) && "opacity-30 cursor-not-allowed hover:bg-[var(--surface-elevated)] hover:border-[var(--border)] hover:text-[var(--foreground)]"
        )}
        aria-label="Diminuer"
      >
        −
      </button>
    </div>
  )
}
