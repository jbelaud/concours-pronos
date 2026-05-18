import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatInTimeZone } from "date-fns-tz"
import { fr } from "date-fns/locale"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const TZ = "Europe/Paris"

export function formatKickoff(date: Date | string, fmt = "EEE d MMM · HH:mm") {
  return formatInTimeZone(new Date(date), TZ, fmt, { locale: fr })
}

export function formatDate(date: Date | string, fmt = "d MMMM yyyy") {
  return formatInTimeZone(new Date(date), TZ, fmt, { locale: fr })
}

export function formatTime(date: Date | string) {
  return formatInTimeZone(new Date(date), TZ, "HH:mm", { locale: fr })
}

export function isMatchLocked(kickoff: Date | string): boolean {
  return new Date() >= new Date(kickoff)
}

export function getMatchResult(
  homeScore: number,
  awayScore: number
): "home" | "away" | "draw" {
  if (homeScore > awayScore) return "home"
  if (awayScore > homeScore) return "away"
  return "draw"
}

export function generateAvatarUrl(seed: string): string {
  const styles = [
    "bottts",
    "big-smile",
    "lorelei",
    "micah",
    "notionists",
    "personas",
    "pixel-art",
    "fun-emoji",
  ]
  const style = styles[Math.abs(hashCode(seed)) % styles.length]
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=0B1020`
}

function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return hash
}

export function formatPoints(points: number): string {
  return `${points > 0 ? "+" : ""}${points} pt${Math.abs(points) > 1 ? "s" : ""}`
}

export function getRankOrdinal(rank: number): string {
  if (rank === 1) return "1er"
  return `${rank}ème`
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
}

export const PHASE_LABELS: Record<string, string> = {
  GROUP: "Phase de groupes",
  ROUND_OF_16: "Huitièmes de finale",
  QUARTER_FINAL: "Quarts de finale",
  SEMI_FINAL: "Demi-finales",
  FINAL: "Finale",
  THIRD_PLACE: "Match pour la 3e place",
}

export const PHASE_ORDER: Record<string, number> = {
  GROUP: 1,
  ROUND_OF_16: 2,
  QUARTER_FINAL: 3,
  SEMI_FINAL: 4,
  THIRD_PLACE: 5,
  FINAL: 6,
}
