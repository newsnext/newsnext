import type { WidgetChartView } from "@newsnext/sdk/models"
import type { ChartRow } from "./widget-chart-data"
import { lazy, Suspense, useMemo } from "react"
import { useI18n } from "@/hooks/use-i18n"
import { parseChartRows } from "./widget-chart-data"
import { formatChartValue } from "./widget-chart-options"
import { WidgetSummaryContent } from "./widget-summary-content"

const WidgetEchart = lazy(() => import("./widget-echart"))

interface Props { view: WidgetChartView, queries: Record<string, unknown> }

export function WidgetChartContent({ view, queries }: Props): React.JSX.Element {
  const { t } = useI18n()
  const result = useMemo(() => {
    try {
      return { rows: parseChartRows(queries[view.query], view), error: undefined }
    } catch (error) {
      return { rows: [], error: error instanceof Error ? error.message : t("invalidChartData") }
    }
  }, [queries, view, t])
  const { rows } = result

  return (
    <div className="relative flex size-full min-h-0 flex-col overflow-auto p-3 text-foreground" onPointerDown={event => event.stopPropagation()}>
      {rows.length > 0 && (
        <>
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
            : ["trend-metric", "change-ranking", "status", "timeline"].includes(view.chart)
                ? <WidgetSummaryContent rows={rows} view={view} />
                : view.chart === "table"
                  ? <DataTable rows={rows} view={view} />
                  : <Suspense fallback={null}><WidgetEchart rows={rows} view={view} /></Suspense>}
          {!["table", "status", "timeline", "trend-metric", "change-ranking"].includes(view.chart) && <div className="sr-only"><DataTable rows={rows} view={view} /></div>}
        </>
      )}
    </div>
  )
}

function DataTable({ rows, view }: { rows: ChartRow[], view: WidgetChartView }): React.JSX.Element {
  const { t } = useI18n()
  const hasSeries = rows.some(row => row.series)
  const hasDetails = rows.some(row => row.destination || row.box || row.target !== undefined)
  return (
    <table className="w-full text-left text-xs">
      <caption className="sr-only">{t("widgetDataCaption")}</caption>
      <thead>
        <tr className="text-muted-foreground">
          <th className="pb-2 font-medium">{t("tableLabel")}</th>
          {hasSeries && <th className="pb-2 font-medium">{t("tableSeries")}</th>}
          <th className="pb-2 text-right font-medium">{t("tableValue")}</th>
          {hasDetails && <th className="pb-2 font-medium">{t("tableDetails")}</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-t border-border/40">
            <td className="max-w-48 truncate py-2 pr-3" title={row.label}>{row.label}</td>
            {hasSeries && <td className="py-2 pr-3">{row.series}</td>}
            <td className="py-2 text-right tabular-nums">{formatChartValue(row.value, view)}</td>
            {hasDetails && (
              <td className="py-2 pl-3">
                {row.destination && t("chartToDestination", { destination: row.destination })}
                {row.box && t("chartBoxplot", { values: row.box.join(", "), outliers: row.outliers?.join(", ") || t("chartNoOutliers") })}
                {row.target !== undefined && t("chartTarget", { target: row.target, reference: row.range ? t("chartTargetReference", { range: row.range.join("–") }) : "" })}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
