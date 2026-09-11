import type { WidgetChartView } from "@newsnext/sdk/models"
import type { ChartRow } from "./widget-chart-data"
import { lazy, Suspense, useMemo } from "react"
import { parseChartRows } from "./widget-chart-data"
import { formatChartValue } from "./widget-chart-options"

const WidgetEchart = lazy(() => import("./widget-echart"))

interface Props { view: WidgetChartView, queries: Record<string, unknown>, statusMessage?: string }

export function WidgetChartContent({ view, queries, statusMessage }: Props): React.JSX.Element {
  const result = useMemo(() => {
    try {
      return { rows: parseChartRows(queries[view.query], view), error: undefined }
    } catch (error) {
      return { rows: [], error: error instanceof Error ? error.message : "Invalid chart data." }
    }
  }, [queries, view])
  const { rows } = result
  const message = statusMessage ?? result.error
  if (!rows.length) return <div role="status" className="flex size-full items-center justify-center p-4 text-center text-sm text-muted-foreground">{message ?? "No data to display."}</div>
  return (
    <div className="relative flex size-full min-h-0 flex-col overflow-auto p-3 text-foreground scrollbar-hidden" onPointerDown={event => event.stopPropagation()}>
      {message && <p role="status" className="mb-2 text-xs text-muted-foreground">{message}</p>}
      {view.chart === "metric"
        ? (
            <div className="grid flex-1 content-center gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))" }}>
              {rows.map((row, i) => (
                <div key={i} className="min-w-0">
                  <p className="truncate text-xs text-muted-foreground" title={row.label}>{row.label}</p>
                  <p className="mt-1 truncate text-3xl font-semibold tracking-tight tabular-nums" title={formatChartValue(row.value, view)}>{formatChartValue(row.value, view)}</p>
                </div>
              ))}
            </div>
          )
        : view.chart === "table"
          ? <DataTable rows={rows} view={view} />
          : <Suspense fallback={<p role="status" className="m-auto text-sm text-muted-foreground">Loading chart…</p>}><WidgetEchart rows={rows} view={view} /></Suspense>}
      {view.chart !== "table" && <div className="sr-only"><DataTable rows={rows} view={view} /></div>}
    </div>
  )
}

function DataTable({ rows, view }: { rows: ChartRow[], view: WidgetChartView }): React.JSX.Element {
  const hasSeries = rows.some(row => row.series)
  return (
    <table className="w-full text-left text-xs">
      <caption className="sr-only">Widget data</caption>
      <thead>
        <tr className="text-muted-foreground">
          <th className="pb-2 font-medium">Label</th>
          {hasSeries && <th className="pb-2 font-medium">Series</th>}
          <th className="pb-2 text-right font-medium">Value</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-t border-border/40">
            <td className="max-w-48 truncate py-2 pr-3" title={row.label}>{row.label}</td>
            {hasSeries && <td className="py-2 pr-3">{row.series}</td>}
            <td className="py-2 text-right tabular-nums">{formatChartValue(row.value, view)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
