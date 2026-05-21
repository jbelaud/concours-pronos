"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

interface SeriesEntry {
  userId: string
  userName: string
  isMe: boolean
  rank: number
  data: { matchday: number; rank: number; points: number }[]
}

interface RankingChartProps {
  series: SeriesEntry[]
  totalParticipants: number
  currentUserId: string
  itmCount: number
}

// ITM players get distinct muted colors; current user always gets accent (cyan)
const ITM_COLORS = [
  "var(--gold)",
  "var(--silver)",
  "var(--bronze)",
  "#a78bfa", // violet
  "#f472b6", // pink
  "#34d399", // emerald
  "#fb923c", // orange
]

export function RankingChart({ series, totalParticipants, currentUserId, itmCount }: RankingChartProps) {
  if (!series.length || !series.some((s) => s.data.length > 1)) {
    return (
      <div className="flex items-center justify-center h-40 text-[var(--foreground-muted)] text-sm">
        Pas encore de données d&apos;évolution
      </div>
    )
  }

  // Build unified matchday list
  const allMatchdays = [...new Set(series.flatMap((s) => s.data.map((d) => d.matchday)))].sort((a, b) => a - b)

  // Build chart data: one row per matchday, one key per userId
  const chartData = allMatchdays.map((md) => {
    const row: Record<string, number | string> = { matchday: md }
    for (const s of series) {
      const point = s.data.find((d) => d.matchday === md)
      if (point) row[s.userId] = point.rank
    }
    return row
  })

  const yMax = Math.max(totalParticipants, ...series.flatMap((s) => s.data.map((d) => d.rank)))

  // Assign colors: current user = accent, ITM by position
  let itmColorIdx = 0
  const colorMap: Record<string, string> = {}
  for (const s of series.sort((a, b) => a.rank - b.rank)) {
    if (s.isMe) {
      colorMap[s.userId] = "var(--accent)"
    } else {
      colorMap[s.userId] = ITM_COLORS[itmColorIdx % ITM_COLORS.length]
      itmColorIdx++
    }
  }

  const showLegend = series.length > 1

  return (
    <div className="w-full">
      <div style={{ height: showLegend ? 200 : 208 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="matchday"
              tick={{ fontSize: 11, fill: "rgba(240,244,255,0.5)" }}
              tickFormatter={(v) => `J${v}`}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[1, yMax]}
              reversed
              tick={{ fontSize: 11, fill: "rgba(240,244,255,0.5)" }}
              tickCount={Math.min(yMax, 6)}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
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
              formatter={(value, name) => {
                const s = series.find((s) => s.userId === name)
                return [`${value}e`, s?.isMe ? "Moi" : (s?.userName ?? name)]
              }}
              cursor={{ stroke: "rgba(0,209,255,0.1)", strokeWidth: 1 }}
            />
            {showLegend && (
              <Legend
                formatter={(value) => {
                  const s = series.find((s) => s.userId === value)
                  return (
                    <span style={{ fontSize: 11, color: "rgba(240,244,255,0.6)" }}>
                      {s?.isMe ? `Moi (${s.userName})` : s?.userName ?? value}
                    </span>
                  )
                }}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ paddingTop: 4 }}
              />
            )}
            {series.map((s) => (
              <Line
                key={s.userId}
                type="monotone"
                dataKey={s.userId}
                stroke={colorMap[s.userId]}
                strokeWidth={s.isMe ? 2.5 : 1.5}
                strokeOpacity={s.isMe ? 1 : 0.6}
                dot={s.isMe ? { r: 3, fill: colorMap[s.userId], strokeWidth: 0 } : false}
                activeDot={{ r: 5, fill: colorMap[s.userId], strokeWidth: 0 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      {!showLegend && (
        <p className="text-center text-xs text-[var(--foreground-muted)] mt-1">
          Évolution de {series.find((s) => s.isMe)?.userName}
        </p>
      )}
    </div>
  )
}
