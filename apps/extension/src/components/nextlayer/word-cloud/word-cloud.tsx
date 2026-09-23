import type { WordCloudRow } from "./word-cloud-data"
import type { WidgetLayoutSpan } from "@/lib/widget-host"
import cloud from "d3-cloud"
import { useEffect, useRef, useState } from "react"
import { useI18n } from "@/hooks/use-i18n"

interface PlacedWord {
  text: string
  value: number
  colorIndex: number
  x?: number
  y?: number
  size?: number
  rotate?: number
}

interface LayoutResult {
  words: PlacedWord[]
  transform: string
  width: number
  height: number
}

const COLOR_STEPS = [500, 700, 300, 600, 400] as const

function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 0x100000000
  }
}

function hashRows(rows: WordCloudRow[], width: number, height: number): number {
  let hash = 2166136261
  const text = `${width}:${height}:${rows.map(row => `${row.label}:${row.value}`).join("|")}`
  for (let index = 0; index < text.length; index++) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619)
  return hash >>> 0
}

export default function WidgetWordCloud({ rows, layout: widgetLayout }: { rows: WordCloudRow[], layout: WidgetLayoutSpan }): React.JSX.Element {
  const { t } = useI18n()
  const containerRef = useRef<HTMLDivElement>(null)
  const [layout, setLayout] = useState<LayoutResult>()

  useEffect(() => {
    const element = containerRef.current
    const width = Math.floor(element?.clientWidth ?? 0)
    const height = Math.floor(element?.clientHeight ?? 0)
    if (!element || width <= 0 || height <= 0) return
    let cancelled = false
    const values = rows.map(row => row.value)
    const minValue = Math.min(...values)
    const maxValue = Math.max(...values)
    const compact = height < 220
    const largest = Math.max(16, Math.min(96, width / (compact ? 7 : 5.5), height / (compact ? 3.5 : 2.6)))
    const smallest = Math.max(compact ? 8 : 10, largest * (compact ? 0.22 : 0.26))
    const words: PlacedWord[] = rows.map((row, colorIndex) => ({ text: row.label, value: row.value, colorIndex }))
    const engine = cloud<PlacedWord>()
      .size([width, height])
      .words(words)
      .font(getComputedStyle(element).fontFamily)
      .fontWeight(600)
      .fontSize(word => minValue === maxValue ? (smallest + largest) / 2 : smallest + (Math.sqrt(word.value) - Math.sqrt(minValue)) / (Math.sqrt(maxValue) - Math.sqrt(minValue)) * (largest - smallest))
      .padding(compact ? 1 : 2)
      .rotate(0)
      .spiral("rectangular")
      .random(seededRandom(hashRows(rows, width, height)))
      .timeInterval(8)
      .on("end", (placed, bounds) => {
        if (cancelled || !bounds) return
        const boundsWidth = bounds[1]!.x - bounds[0]!.x
        const boundsHeight = bounds[1]!.y - bounds[0]!.y
        const scale = Math.min((width - 12) / boundsWidth, (height - 12) / boundsHeight, 1.35)
        const centerX = (bounds[0]!.x + bounds[1]!.x - width) / 2
        const centerY = (bounds[0]!.y + bounds[1]!.y - height) / 2
        setLayout({ words: placed, width, height, transform: `translate(${width / 2} ${height / 2}) scale(${scale}) translate(${-centerX} ${-centerY})` })
      })
    engine.start()
    return () => {
      cancelled = true
      engine.stop()
    }
  }, [rows, widgetLayout.width, widgetLayout.height])

  return (
    <div ref={containerRef} className="min-h-0 w-full flex-1" aria-label={t("wordCloudAriaLabel")}>
      {layout && (
        <svg className="size-full overflow-hidden" viewBox={`0 0 ${layout.width} ${layout.height}`} role="img" aria-hidden="true">
          <g transform={layout.transform} fontFamily="inherit" fontWeight={600} textAnchor="middle">
            {layout.words.map(word => (
              <text key={`${word.text}:${word.colorIndex}`} x={word.x} y={word.y} fontSize={word.size} fill={`var(--color-theme-${COLOR_STEPS[word.colorIndex % COLOR_STEPS.length]})`}>{word.text}</text>
            ))}
          </g>
        </svg>
      )}
    </div>
  )
}
