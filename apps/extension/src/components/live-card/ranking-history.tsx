import type { ReactNode } from "react"
import type { RankingHistoryData, RankingPosition } from "@/lib/background/ranking-history"
import { bisector } from "d3-array"
import { scaleLinear } from "d3-scale"
import { pointer } from "d3-selection"
import { curveStepAfter, line } from "d3-shape"
import { useMemo, useState } from "react"

interface Props {
  history: RankingHistoryData | undefined
  currentPosition: number
}

const DAY_MS = 24 * 60 * 60 * 1000
const WIDTH = 280
const HEIGHT = 100
const LEFT = 32
const RIGHT = 8
const TOP = 10
const BOTTOM = 20
const findPoint = bisector<RankingPosition, number>(point => point.observedAt).right

function rankLabel(position: number): string {
  return `#${position}`
}

function timeLabel(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
}

export function RankingHistory({ history, currentPosition }: Props): ReactNode {
  const [hovered, setHovered] = useState<RankingPosition | null>(null)
  const chart = useMemo(() => {
    if (!history) return null
    const now = history.queriedAt
    const positions = history.positions.filter(point => point.observedAt >= now - DAY_MS && point.observedAt <= now)
    const ranked = positions.filter((point): point is RankingPosition & { position: number } => point.position !== null)
    const first = ranked[0]
    if (!first) return null

    const points: RankingPosition[] = [
      ...positions.filter(point => point.observedAt >= first.observedAt),
      { observedAt: now, position: currentPosition },
    ]
    const ranks = [...ranked.map(point => point.position), currentPosition]
    const best = Math.min(...ranks)
    const worst = Math.max(...ranks)
    const x = scaleLinear().domain([first.observedAt === now ? now - 1 : first.observedAt, now]).range([LEFT, WIDTH - RIGHT])
    const y = scaleLinear().domain([best, worst]).range([TOP, HEIGHT - BOTTOM])
    const path = line<RankingPosition>()
      .defined(point => point.position !== null)
      .x(point => x(point.observedAt))
      .y(point => y(point.position ?? best))
      .curve(curveStepAfter)(points)
    return { now, points, first, best, worst, x, y, path }
  }, [history, currentPosition])
  if (!chart) return null

  const { now, points, first, best, worst, x, y, path } = chart
  const activePoint = hovered && points.includes(hovered) ? hovered : null

  return (
    <section className="mt-2 w-full min-w-64 border-t border-border/60 pt-3 text-xs text-muted-foreground" aria-label="Ranking history">
      <div className="flex items-center justify-between gap-3">
        <div className="font-medium text-foreground">Rank · last 24 hours</div>
        <div className="text-lg leading-5 font-semibold text-foreground">{rankLabel(currentPosition)}</div>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-2 h-25 w-full"
        role="img"
        aria-label={`Ranking from ${rankLabel(first.position)} at ${timeLabel(first.observedAt)} to ${rankLabel(currentPosition)} now. Best ${rankLabel(best)}, worst ${rankLabel(worst)}.`}
        onPointerMove={(event) => {
          const [pointerX] = pointer(event.nativeEvent, event.currentTarget)
          const index = findPoint(points, x.invert(pointerX)) - 1
          const point = points[index]
          setHovered(point?.position == null ? null : point)
        }}
        onPointerLeave={() => setHovered(null)}
      >
        <rect x={LEFT} y={TOP} width={WIDTH - LEFT - RIGHT} height={HEIGHT - TOP - BOTTOM} fill="transparent" />
        <line x1={LEFT} x2={WIDTH - RIGHT} y1={y(best)} y2={y(best)} stroke="currentColor" strokeOpacity="0.15" />
        {best !== worst && <line x1={LEFT} x2={WIDTH - RIGHT} y1={y(worst)} y2={y(worst)} stroke="currentColor" strokeOpacity="0.15" />}
        {!activePoint && <text x={0} y={y(best) + 3} fill="currentColor" fontSize="10">{rankLabel(best)}</text>}
        {!activePoint && best !== worst && <text x={0} y={y(worst) + 3} fill="currentColor" fontSize="10">{rankLabel(worst)}</text>}
        {path && <path d={path} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-foreground" />}
        <circle cx={x(now)} cy={y(currentPosition)} r="3.5" fill="currentColor" className="text-foreground" />
        {activePoint?.position != null && (
          <g pointerEvents="none" className="text-foreground">
            <line x1={LEFT} x2={x(activePoint.observedAt)} y1={y(activePoint.position)} y2={y(activePoint.position)} stroke="currentColor" strokeOpacity="0.4" strokeDasharray="3 3" />
            <line x1={x(activePoint.observedAt)} x2={x(activePoint.observedAt)} y1={y(activePoint.position)} y2={HEIGHT - BOTTOM} stroke="currentColor" strokeOpacity="0.4" strokeDasharray="3 3" />
            <circle cx={x(activePoint.observedAt)} cy={y(activePoint.position)} r="4" fill="currentColor" />
            <text x={0} y={y(activePoint.position) + 3} fill="currentColor" fontSize="10">{rankLabel(activePoint.position)}</text>
            <text
              x={x(activePoint.observedAt)}
              y={HEIGHT - 3}
              textAnchor={x(activePoint.observedAt) < LEFT + 24 ? "start" : x(activePoint.observedAt) > WIDTH - RIGHT - 24 ? "end" : "middle"}
              fill="currentColor"
              fontSize="10"
            >
              {timeLabel(activePoint.observedAt)}
            </text>
          </g>
        )}
        {!activePoint && <text x={LEFT} y={HEIGHT - 3} fill="currentColor" fontSize="10">{timeLabel(first.observedAt)}</text>}
        {!activePoint && <text x={WIDTH - RIGHT} y={HEIGHT - 3} textAnchor="end" fill="currentColor" fontSize="10">Now</text>}
      </svg>
    </section>
  )
}
