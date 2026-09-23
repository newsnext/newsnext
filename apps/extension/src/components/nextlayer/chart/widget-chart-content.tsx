import type { ChartRow } from "./widget-chart-data"
import type { WidgetLayoutSpan } from "@/lib/widget-host"
import { lazy, Suspense } from "react"
import { useI18n } from "@/hooks/use-i18n"

const WidgetWordCloud = lazy(() => import("./widget-word-cloud"))

export function WidgetChartContent({ rows, layout }: { rows: ChartRow[], layout: WidgetLayoutSpan }): React.JSX.Element {
  const { t } = useI18n()

  return (
    <div className="relative flex size-full min-h-0 flex-col overflow-hidden p-3 text-foreground" onPointerDown={event => event.stopPropagation()}>
      {rows.length > 0 && <Suspense fallback={null}><WidgetWordCloud rows={rows} layout={layout} /></Suspense>}
      {rows.length > 0 && (
        <table className="sr-only">
          <caption>{t("widgetDataCaption")}</caption>
          <thead>
            <tr>
              <th>{t("tableLabel")}</th>
              <th>{t("tableValue")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.label}>
                <td>{row.label}</td>
                <td>{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
