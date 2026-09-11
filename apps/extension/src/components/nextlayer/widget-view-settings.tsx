import type { WidgetChartOptions, WidgetChartView } from "@newsnext/sdk/models"
import type { SourceParamSchemaMap } from "@newsnext/source-kit/types"
import { parseWidgetChartOptions, WIDGET_CHARTS } from "@newsnext/sdk/models"
import { useMemo, useState } from "react"
import { ParamField } from "@/components/card-shell/settings/param-field"
import { CardSettingsSection } from "@/components/card-shell/settings/settings-section"
import { useSourceParams } from "@/hooks/use-source-params"

interface Props { view: WidgetChartView, patch?: Partial<WidgetChartOptions>, onSave: (patch: Partial<WidgetChartOptions> | null) => Promise<void> }

export function WidgetViewSettings({ view, patch, onSave }: Props): React.JSX.Element {
  const [editing, setEditing] = useState(false)
  const params = useMemo<SourceParamSchemaMap>(() => ({
    chart: { type: "select", title: "Chart", values: WIDGET_CHARTS.map(value => ({ value, label: value.replaceAll("-", " ") })), default: view.chart },
    label: { type: "text", title: "Label field", default: view.label ?? "label" },
    value: { type: "text", title: "Value field", default: view.value ?? "value" },
    series: { type: "text", title: "Series field", default: view.series ?? "", description: "Leave empty for a single series." },
    x: { type: "text", title: "X field", default: view.x ?? "x" },
    y: { type: "text", title: "Y field", default: view.y ?? "y" },
    limit: { type: "number", title: "Row limit", default: view.limit ?? 100, min: 1, max: 500, step: 1 },
    sort: { type: "select", title: "Sort by value", default: view.sort ?? "none", values: [{ value: "none", label: "Data order" }, { value: "asc", label: "Ascending" }, { value: "desc", label: "Descending" }] },
    decimals: { type: "number", title: "Decimal places", default: view.decimals ?? 1, min: 0, max: 6, step: 1 },
    suffix: { type: "text", title: "Value suffix", default: view.suffix ?? "" },
    target: { type: "number", title: "Default target", default: view.target ?? 100, min: 0.000001 },
    bins: { type: "number", title: "Histogram bins", default: view.bins ?? 10, min: 1, max: 50, step: 1 },
  }), [view])
  const state = useSourceParams({ params, initialValues: patch })
  const chart = state.draftParams.chart ?? view.chart
  const visible = Object.entries(params).filter(([key]) => {
    if (["status", "timeline"].includes(String(chart)) && ["value", "sort", "decimals", "suffix"].includes(key)) return false
    if (key === "x" || key === "y") return chart === "scatter" || chart === "heatmap"
    if (key === "series") return ["line", "area", "bar", "stacked-bar", "scatter", "table"].includes(String(chart))
    if (key === "target") return chart === "progress" || chart === "bullet"
    if (key === "bins") return chart === "histogram"
    return true
  })
  let error: string | undefined
  try {
    parseWidgetChartOptions({ chart: view.chart, ...state.draftParams })
  } catch (cause) {
    error = cause instanceof Error ? cause.message : "Invalid view settings"
  }
  return (
    <CardSettingsSection
      title="View"
      editLabel="Edit view"
      editing={editing}
      dirty={state.isDirty}
      valid={state.validation.valid && !error}
      errorMessage="Could not save view settings."
      onEdit={() => {
        state.discardDraftParams()
        setEditing(true)
      }}
      onCancel={() => {
        state.discardDraftParams()
        setEditing(false)
      }}
      onSave={async () => {
        const value = parseWidgetChartOptions({ chart: view.chart, ...state.getDraftParams() })
        await onSave(value)
        state.commitParams(value)
        setEditing(false)
      }}
      onReset={async () => {
        await onSave(null)
        state.commitParams({})
        setEditing(false)
      }}
    >
      {visible.map(([key, param]) => (
        <div key={key}>
          <ParamField param={param} value={state.draftParams[key]} editable={editing} onChange={value => state.updateDraftParam(key, value)} />
          {editing && state.validation.errors[key] && <p role="alert" className="text-xs text-destructive">{state.validation.errors[key]}</p>}
        </div>
      ))}
      {editing && error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </CardSettingsSection>
  )
}
