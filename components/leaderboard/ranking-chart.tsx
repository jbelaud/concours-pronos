"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import type { RankingEvolutionPoint } from "@/types"

interface RankingChartProps {
  data: RankingEvolutionPoint[]
  totalParticipants: number
  userName?: string
}

export function RankingChart({ data, totalParticipants, userName }: RankingChartProps) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-40 text-[var(--foreground-muted)] text-sm">
        Pas encore de données d&apos;évolution
      </div>
    )
  }

  const yMin = 1
  const yMax = Math.max(totalParticipants, ...data.map((d) => d.rank))

  return (
    <div className="w-full h-52">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 8, right: 8, left: -24, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.05)"
            vertical={false}
          />
          <XAxis
            dataKey="matchday"
            tick={{ fontSize: 11, fill: "rgba(240,244,255,0.5)" }}
            tickFormatter={(v) => `J${v}`}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[yMin, yMax]}
            reversed
            tick={{ fontSize: 11, fill: "rgba(240,244,255,0.5)" }}
            tickCount={Math.min(yMax, 6)}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface-elevated)",
              border: "1px solid var(--border-strong)",
              borderRadius: "0.5rem",
              color: "var(--foreground)",
              fontSize: 12,
            }}
            labelFormatter={(v) => `Journée ${v}`}
            formatter={(value) => [`${value}e`, "Classement"]}
            cursor={{ stroke: "rgba(0,209,255,0.2)", strokeWidth: 1 }}
          />
          {data.find((d) => d.rank === 1) && (
            <ReferenceLine
              y={1}
              stroke="rgba(255,215,0,0.3)"
              strokeDasharray="4 4"
            />
          )}
          <Line
            type="monotone"
            dataKey="rank"
            stroke="var(--accent)"
            strokeWidth={2.5}
            dot={{
              r: 4,
              fill: "var(--accent)",
              strokeWidth: 0,
            }}
            activeDot={{
              r: 6,
              fill: "var(--accent)",
              strokeWidth: 2,
              stroke: "var(--surface)",
            }}
          />
        </LineChart>
      </ResponsiveContainer>
      {userName && (
        <p className="text-center text-xs text-[var(--foreground-muted)] mt-1">
          Évolution de {userName}
        </p>
      )}
    </div>
  )
}
