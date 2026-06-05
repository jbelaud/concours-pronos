"use client"

import { useState, useRef } from "react"
import { GripVertical, Target, CheckCircle2, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TieBreakerKey } from "@/lib/ranking"

export type { TieBreakerKey }

interface TieBreakerItem {
  key: TieBreakerKey
  label: string
  description: string
  icon: React.ReactNode
  color: string
}

const ITEMS: TieBreakerItem[] = [
  {
    key: "exactScores",
    label: "Scores exacts",
    description: "Nombre de scores exacts trouvés",
    icon: <Target size={16} />,
    color: "text-[var(--accent)]",
  },
  {
    key: "correctResults",
    label: "Résultats 1N2",
    description: "Nombre de résultats corrects (victoire/nul/défaite)",
    icon: <CheckCircle2 size={16} />,
    color: "text-[var(--success)]",
  },
  {
    key: "finalWinner",
    label: "Vainqueur final",
    description: "A trouvé le vainqueur de la compétition",
    icon: <Trophy size={16} />,
    color: "text-[var(--gold)]",
  },
]

interface Props {
  value: TieBreakerKey[]
  onChange: (order: TieBreakerKey[]) => void
}

export function TieBreakerEditor({ value, onChange }: Props) {
  const orderedItems = value
    .map((k) => ITEMS.find((i) => i.key === k))
    .filter(Boolean) as TieBreakerItem[]

  const dragIndex = useRef<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)

  const handleDragStart = (idx: number) => {
    dragIndex.current = idx
  }

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    setDragOver(idx)
  }

  const handleDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault()
    const from = dragIndex.current
    if (from === null || from === targetIdx) {
      setDragOver(null)
      return
    }
    const next = [...orderedItems]
    const [moved] = next.splice(from, 1)
    next.splice(targetIdx, 0, moved)
    onChange(next.map((i) => i.key))
    dragIndex.current = null
    setDragOver(null)
  }

  const handleDragEnd = () => {
    dragIndex.current = null
    setDragOver(null)
  }

  const moveUp = (idx: number) => {
    if (idx === 0) return
    const next = [...orderedItems]
    ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
    onChange(next.map((i) => i.key))
  }

  const moveDown = (idx: number) => {
    if (idx === orderedItems.length - 1) return
    const next = [...orderedItems]
    ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
    onChange(next.map((i) => i.key))
  }

  return (
    <div className="flex flex-col gap-2">
      {orderedItems.map((item, idx) => (
        <div
          key={item.key}
          draggable
          onDragStart={() => handleDragStart(idx)}
          onDragOver={(e) => handleDragOver(e, idx)}
          onDrop={(e) => handleDrop(e, idx)}
          onDragEnd={handleDragEnd}
          className={cn(
            "flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-grab active:cursor-grabbing select-none",
            dragOver === idx
              ? "border-[var(--accent)] bg-[var(--accent-dim)] scale-[1.01]"
              : "border-[var(--border)] bg-[var(--surface-elevated)]"
          )}
        >
          {/* Rang */}
          <span className="text-[10px] font-black text-[var(--foreground-subtle)] bg-[var(--surface-card)] rounded-full w-5 h-5 flex items-center justify-center shrink-0">
            {idx + 1}
          </span>

          {/* Icône */}
          <span className={cn("shrink-0", item.color)}>{item.icon}</span>

          {/* Texte */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[var(--foreground)] leading-none mb-0.5">
              {item.label}
            </p>
            <p className="text-[11px] text-[var(--foreground-muted)] truncate">
              {item.description}
            </p>
          </div>

          {/* Flèches (mobile-friendly) */}
          <div className="flex flex-col gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => moveUp(idx)}
              disabled={idx === 0}
              className="w-6 h-5 flex items-center justify-center rounded text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-card)] disabled:opacity-20 disabled:cursor-not-allowed transition-all text-xs"
            >
              ▲
            </button>
            <button
              type="button"
              onClick={() => moveDown(idx)}
              disabled={idx === orderedItems.length - 1}
              className="w-6 h-5 flex items-center justify-center rounded text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-card)] disabled:opacity-20 disabled:cursor-not-allowed transition-all text-xs"
            >
              ▼
            </button>
          </div>

          {/* Poignée drag */}
          <GripVertical size={16} className="text-[var(--foreground-subtle)] shrink-0" />
        </div>
      ))}

      <p className="text-[11px] text-[var(--foreground-subtle)] flex items-center gap-1 mt-1">
        <GripVertical size={11} />
        Glissez-déposez ou utilisez les flèches pour réordonner les critères
      </p>
    </div>
  )
}
