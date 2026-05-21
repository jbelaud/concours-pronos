"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function getTimeLeft(targetDate: Date): TimeLeft {
  const diff = Math.max(0, targetDate.getTime() - Date.now())
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  }
}

function pad(n: number) {
  return String(n).padStart(2, "0")
}

function FlipDigit({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-16 h-16 flex items-center justify-center">
        {/* Card background */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-[var(--surface-elevated)] to-[var(--surface)] border border-[var(--border)] shadow-lg" />
        {/* Separator line */}
        <div className="absolute left-0 right-0 top-1/2 h-px bg-[var(--border)] z-10" />
        <AnimatePresence mode="popLayout">
          <motion.span
            key={value}
            initial={{ y: -8, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 8, opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative z-20 text-2xl font-black tabular-nums text-[var(--foreground)] tracking-tight"
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--foreground-subtle)]">{label}</span>
    </div>
  )
}

export function CountdownTimer({ targetDate, label }: { targetDate: string; label?: string }) {
  const target = new Date(targetDate)
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => getTimeLeft(target))
  const [started, setStarted] = useState(target <= new Date())

  useEffect(() => {
    if (started) return
    const id = setInterval(() => {
      const tl = getTimeLeft(target)
      setTimeLeft(tl)
      if (tl.days === 0 && tl.hours === 0 && tl.minutes === 0 && tl.seconds === 0) {
        setStarted(true)
        clearInterval(id)
      }
    }, 1000)
    return () => clearInterval(id)
  }, [target, started])

  if (started) {
    return (
      <div className="surface-card p-4 flex flex-col items-center gap-2 border border-[var(--success)]/30">
        <div className="text-2xl">🚀</div>
        <p className="text-sm font-bold text-[var(--success)]">Le tournoi a commencé !</p>
      </div>
    )
  }

  return (
    <div className="surface-card p-5 flex flex-col items-center gap-4">
      {/* Label */}
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--accent)]">
            {label ?? "Coup d'envoi dans"}
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
        </div>
      </div>

      {/* Digits */}
      <div className="flex items-end gap-2">
        <FlipDigit value={String(timeLeft.days)} label="jours" />
        <span className="text-2xl font-black text-[var(--foreground-muted)] mb-5 leading-none">:</span>
        <FlipDigit value={pad(timeLeft.hours)} label="heures" />
        <span className="text-2xl font-black text-[var(--foreground-muted)] mb-5 leading-none">:</span>
        <FlipDigit value={pad(timeLeft.minutes)} label="min" />
        <span className="text-2xl font-black text-[var(--foreground-muted)] mb-5 leading-none">:</span>
        <FlipDigit value={pad(timeLeft.seconds)} label="sec" />
      </div>

      {/* Barre de progression */}
      <CountdownProgressBar target={target} />
    </div>
  )
}

function CountdownProgressBar({ target }: { target: Date }) {
  // On considère 90 jours max comme fenêtre de référence
  const WINDOW_MS = 90 * 24 * 60 * 60 * 1000
  const now = Date.now()
  const remaining = Math.max(0, target.getTime() - now)
  const progress = Math.max(0, Math.min(100, ((WINDOW_MS - remaining) / WINDOW_MS) * 100))

  return (
    <div className="w-full flex flex-col gap-1.5">
      <div className="w-full h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
        <motion.div
          className="h-full rounded-full gradient-accent"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <p className="text-[10px] text-center text-[var(--foreground-subtle)]">
        {new Date(target).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
      </p>
    </div>
  )
}
