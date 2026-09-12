import type { WidgetChartView } from "@newsnext/sdk/models"
import type { ChartRow } from "./widget-chart-data"
import { periodChange } from "@newsnext/sdk/analytics"
import { lazy, Suspense } from "react"
import { formatChartValue } from "./widget-chart-options"

const WidgetEchart = lazy(() => import("./widget-echart"))
const statusColors = { ok: "bg-green-500", warning: "bg-amber-500", error: "bg-red-500", unknown: "bg-muted-foreground" }

export function WidgetSummaryContent({ rows, view }: { rows: ChartRow[], view: WidgetChartView }): React.JSX.Element {
  return (
    <ol className={`flex flex-col gap-3 ${view.chart === "trend-metric" ? "flex-1" : ""}`}>
      {rows.map((row, index) => {
        const change = row.previous === undefined ? undefined : periodChange(row.value, row.previous)
        const movement = row.previousRank === undefined ? undefined : row.previousRank - index - 1
        return (
          <li key={`${row.label}:${index}`} className={`min-w-0 pb-3 ${view.chart === "timeline" ? "border-l-2 border-border pl-3" : "border-b border-border/40 last:border-0"}`}>
            <div className="flex items-center gap-2 text-xs">
              {row.status && <span className={`size-2 shrink-0 rounded-full ${statusColors[row.status]}`} />}
              {view.chart === "change-ranking" && <span className="w-4 text-muted-foreground tabular-nums">{index + 1}</span>}
              <span className="min-w-0 flex-1 truncate" title={row.label}>{row.label}</span>
              {row.status && <span className="text-muted-foreground">{row.status}</span>}
              {view.chart === "change-ranking" && <strong className="tabular-nums">{formatChartValue(row.value, view)}</strong>}
            </div>
            {view.chart === "trend-metric" && <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{formatChartValue(row.value, view)}</p>}
            {change && (
              <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                {change.delta > 0 ? "+" : ""}
                {formatChartValue(change.delta, view)}
                {" "}
                ·
                {change.percent === null ? "No percentage baseline" : `${change.percent > 0 ? "+" : ""}${change.percent.toFixed(1)}%`}
                {movement !== undefined && ` · ${movement === 0 ? "Rank unchanged" : `${movement > 0 ? "↑" : "↓"} ${Math.abs(movement)} ${Math.abs(movement) === 1 ? "place" : "places"}`}`}
              </p>
            )}
            {row.detail && <p className="mt-1 text-xs text-muted-foreground">{row.detail}</p>}
            {row.timestamp && <time dateTime={row.timestamp} className="mt-1 block text-xs text-muted-foreground">{new Date(row.timestamp).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time>}
            {row.history && <div className="flex h-16 min-h-0"><Suspense fallback={null}><WidgetEchart compact view={{ ...view, chart: "line", series: undefined }} rows={row.history.map((value, i) => ({ label: String(i + 1), value, series: "", x: i, y: value }))} /></Suspense></div>}
          </li>
        )
      })}
    </ol>
  )
}
