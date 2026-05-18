"use client"

import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface ScoreStepperProps {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
  className?: string
}

export function ScoreStepper({
  value,
  onChange,
  disabled = false,
  className,
}: ScoreStepperProps) {
  const decrement = () => {
    if (disabled || value <= 0) return
    onChange(value - 1)
  }

  const increment = () => {
    if (disabled || value >= 20) return
    onChange(value + 1)
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <button
        type="button"
        onPointerDown={decrement}
        disabled={disabled || value <= 0}
        className={cn(
          "stepper-btn",
          (disabled || value <= 0) && "opacity-30 cursor-not-allowed"
        )}
        aria-label="Diminuer"
      >
        −
      </button>

      <div className="score-display relative w-10">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={value}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.12 }}
            className="absolute inset-0 flex items-center justify-center text-2xl font-bold"
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </div>

      <button
        type="button"
        onPointerDown={increment}
        disabled={disabled || value >= 20}
        className={cn(
          "stepper-btn",
          (disabled || value >= 20) && "opacity-30 cursor-not-allowed"
        )}
        aria-label="Augmenter"
      >
        +
      </button>
    </div>
  )
}
