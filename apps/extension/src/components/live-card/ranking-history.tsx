import type { ReactNode } from "react"
import type { RankingHistoryData, RankingPosition } from "@/lib/background/ranking-history"

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

function rankLabel(position: number): string {
  return `#${position}`
}

function timeLabel(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
}

export function RankingHistory({ history, currentPosition }: Props): ReactNode {
  if (!history?.positions.some(point => point.position !== null)) return null

  const now = history.queriedAt
  const positions = history.positions.filter(point => point.observedAt >= now - DAY_MS && point.observedAt <= now)
  const ranked = positions.filter((point): point is RankingPosition & { position: number } => point.position !== null)
  if (ranked.length === 0) return null

  const first = ranked[0]!
  const points = [
    ...positions.filter(point => point.observedAt >= first.observedAt),
    { observedAt: now, position: currentPosition },
  ]
  const ranks = [...ranked.map(point => point.position), currentPosition]
  const best = Math.min(...ranks)
  const worst = Math.max(...ranks)
  const start = first.observedAt
  const duration = now - start
  const x = (time: number): number => duration > 0
    ? LEFT + (WIDTH - LEFT - RIGHT) * (time - start) / duration
    : WIDTH - RIGHT
  const y = (rank: number): number => best === worst
    ? (TOP + HEIGHT - BOTTOM) / 2
    : TOP + (HEIGHT - TOP - BOTTOM) * (rank - best) / (worst - best)

  const paths: { observedAt: number, d: string }[] = []
  let path = ""
  let pathStartedAt = 0
  let previousRank: number | null = null
  for (const point of points) {
    if (point.position === null) {
      if (path) paths.push({ observedAt: pathStartedAt, d: path })
      path = ""
      previousRank = null
      continue
    }
    const nextX = x(point.observedAt)
    const nextY = y(point.position)
    if (previousRank === null) pathStartedAt = point.observedAt
    path += previousRank === null
      ? `M ${nextX} ${nextY}`
      : ` H ${nextX} V ${nextY}`
    previousRank = point.position
  }
  if (path) paths.push({ observedAt: pathStartedAt, d: path })

  const changes: { observedAt: number, before: number, after: number }[] = []
  let previous: number | null = null
  for (const point of positions) {
    if (point.position !== null && previous !== null && point.position !== previous) {
      changes.push({ observedAt: point.observedAt, before: previous, after: point.position })
    }
    previous = point.position
  }
  const delta = first.position - currentPosition

  return (
    <section className="mt-2 w-full min-w-64 border-t border-border/60 pt-3 text-xs text-muted-foreground" aria-label="Ranking history">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium text-foreground">Rank · last 24 hours</div>
          <div className="mt-0.5">{`First seen ${timeLabel(first.observedAt)} at ${rankLabel(first.position)}`}</div>
        </div>
        <div className="text-right">
          <div className="text-lg leading-5 font-semibold text-foreground">{rankLabel(currentPosition)}</div>
          <div>{delta > 0 ? `↑ ${delta} places` : delta < 0 ? `↓ ${-delta} places` : "No change"}</div>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-2 h-25 w-full"
        role="img"
        aria-label={`Ranking from ${rankLabel(first.position)} at ${timeLabel(first.observedAt)} to ${rankLabel(currentPosition)} now. Best ${rankLabel(best)}, worst ${rankLabel(worst)}.`}
      >
        <line x1={LEFT} x2={WIDTH - RIGHT} y1={y(best)} y2={y(best)} stroke="currentColor" strokeOpacity="0.15" />
        {best !== worst && <line x1={LEFT} x2={WIDTH - RIGHT} y1={y(worst)} y2={y(worst)} stroke="currentColor" strokeOpacity="0.15" />}
        <text x={0} y={y(best) + 3} fill="currentColor" fontSize="10">{rankLabel(best)}</text>
        {best !== worst && <text x={0} y={y(worst) + 3} fill="currentColor" fontSize="10">{rankLabel(worst)}</text>}
        {paths.map(segment => (
          <path key={segment.observedAt} d={segment.d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-foreground" />
        ))}
        <circle cx={x(now)} cy={y(currentPosition)} r="3.5" fill="currentColor" className="text-foreground" />
        <text x={LEFT} y={HEIGHT - 3} fill="currentColor" fontSize="10">{timeLabel(start)}</text>
        <text x={WIDTH - RIGHT} y={HEIGHT - 3} textAnchor="end" fill="currentColor" fontSize="10">Now</text>
      </svg>
      {changes.length > 0 && (
        <div className="mt-1 space-y-1 border-t border-border/60 pt-2">
          {changes.slice(-2).reverse().map(change => (
            <div key={change.observedAt} className="flex justify-between gap-3">
              <time dateTime={new Date(change.observedAt).toISOString()}>{timeLabel(change.observedAt)}</time>
              <span className="text-foreground">{`${rankLabel(change.before)} → ${rankLabel(change.after)}`}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
