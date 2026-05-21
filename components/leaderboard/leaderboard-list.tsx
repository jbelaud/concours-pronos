"use client"

import { useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { TrendingUp, TrendingDown, Minus, Trophy, Star, LocateFixed } from "lucide-react"
import { FootballAvatar } from "@/components/shared/football-avatar"
import { cn } from "@/lib/utils"
import type { LeaderboardRow } from "@/types"

interface LeaderboardListProps {
  entries: LeaderboardRow[]
  currentUserId?: string
  itmCount?: number
}

export function LeaderboardList({ entries, currentUserId, itmCount = 4 }: LeaderboardListProps) {
  const myRowRef = useRef<HTMLDivElement>(null)

  const scrollToMe = useCallback(() => {
    myRowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [])

  const myEntry = entries.find((e) => e.userId === currentUserId)

  return (
    <div className="flex flex-col gap-2">
      {/* Bouton Me retrouver */}
      {currentUserId && myEntry && (
        <button
          onClick={scrollToMe}
          className="flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl text-xs font-semibold bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--accent)]/30 hover:bg-[var(--accent)]/20 transition-all active:scale-95 self-end"
        >
          <LocateFixed size={13} />
          Me retrouver ({myEntry.rank}e · {myEntry.totalPoints} pts)
        </button>
      )}

      <AnimatePresence initial={false}>
        {entries.map((entry, idx) => (
          <LeaderboardRowItem
            key={entry.userId}
            entry={entry}
            index={idx}
            isCurrentUser={entry.userId === currentUserId}
            itmCount={itmCount}
            ref={entry.userId === currentUserId ? myRowRef : undefined}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

import { forwardRef } from "react"

const LeaderboardRowItem = forwardRef<
  HTMLDivElement,
  {
    entry: LeaderboardRow
    index: number
    isCurrentUser: boolean
    itmCount: number
  }
>(function LeaderboardRowItem({ entry, index, isCurrentUser, itmCount }, ref) {
  const isFirst = entry.rank === 1
  const isSecond = entry.rank === 2
  const isThird = entry.rank === 3
  const isITM = entry.rank <= itmCount

  const rankColor = isFirst
    ? "text-[var(--gold)]"
    : isSecond
      ? "text-[var(--silver)]"
      : isThird
        ? "text-[var(--bronze)]"
        : "text-[var(--foreground-muted)]"

  const glowClass = isFirst ? "itm-gold" : isSecond ? "itm-silver" : isThird ? "itm-bronze" : ""

  const borderClass = isCurrentUser
    ? "border-[var(--accent)]/50"
    : isFirst
      ? "border-[var(--gold)]/20"
      : "border-[var(--border)]"

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl border transition-all",
        isCurrentUser ? "bg-[var(--accent-dim)]" : "bg-[var(--surface-card)]",
        borderClass,
        glowClass
      )}
    >
      {/* Rank */}
      <div className={cn("w-8 text-center font-black text-lg shrink-0", rankColor)}>
        {isFirst ? "🥇" : isSecond ? "🥈" : isThird ? "🥉" : entry.rank}
      </div>

      {/* Avatar */}
      <FootballAvatar
        seed={entry.user.avatarSeed}
        size={40}
        className={cn("ring-2", isCurrentUser ? "ring-[var(--accent)]" : "ring-[var(--border)]")}
      />

      {/* Name & stats */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={cn("font-semibold text-sm truncate", isCurrentUser ? "text-[var(--accent)]" : "text-[var(--foreground)]")}>
            {entry.user.firstName} {entry.user.lastName}
          </span>
          {isCurrentUser && (
            <span className="text-[10px] bg-[var(--accent-dim)] text-[var(--accent)] rounded-full px-1.5 py-0.5 font-medium shrink-0">
              Toi
            </span>
          )}
          {isITM && entry.payoutAmount !== undefined && (
            <span className="text-[10px] bg-[var(--success-dim)] text-[var(--success)] rounded-full px-1.5 py-0.5 font-medium shrink-0">
              {entry.payoutAmount}€
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-[var(--foreground-muted)] mt-0.5">
          <span>{entry.exactScores} exacts</span>
          <span>·</span>
          <span>{entry.correctResults} corrects</span>
        </div>
      </div>

      {/* Points & movement */}
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        <span className="font-black text-lg text-[var(--foreground)]">
          {entry.totalPoints}
          <span className="text-xs font-normal text-[var(--foreground-muted)] ml-0.5">pts</span>
        </span>
        <MovementIndicator movement={entry.movement} amount={entry.movementAmount} />
      </div>
    </motion.div>
  )
})

function MovementIndicator({ movement, amount }: { movement: "up" | "down" | "same" | "new"; amount: number }) {
  if (movement === "new") {
    return (
      <span className="text-[10px] text-[var(--purple)] font-medium flex items-center gap-0.5">
        <Star size={9} />
        Nouveau
      </span>
    )
  }
  if (movement === "up" && amount > 0) {
    return (
      <span className="text-[10px] text-[var(--success)] font-medium flex items-center gap-0.5">
        <TrendingUp size={10} />
        +{amount}
      </span>
    )
  }
  if (movement === "down" && amount > 0) {
    return (
      <span className="text-[10px] text-[var(--error)] font-medium flex items-center gap-0.5">
        <TrendingDown size={10} />
        -{amount}
      </span>
    )
  }
  return (
    <span className="text-[10px] text-[var(--foreground-subtle)] flex items-center gap-0.5">
      <Minus size={9} />
    </span>
  )
}
