/* eslint-disable react-refresh/only-export-components */
import type { WidgetChartOptions, WidgetChartView } from "@newsnext/sdk/models"
import { WIDGET_CHARTS } from "@newsnext/sdk/models"
import { FlipAnimate } from "@newsnext/ui/components/flip-animate"
import { useState } from "react"
import { CardBackContent, CardShell } from "@/components/card-shell"
import { CardHeader, CardHeaderActionButton } from "@/components/card-shell/card-header"
import { CardContentBackground } from "@/components/card-shell/card-refresh"
import { PhArrowCircleLeftDuotone, PhInfoDuotone } from "@/components/icons/ph"
import { WidgetChartContent } from "@/components/nextlayer/widget-chart-content"
import { WidgetViewSettings } from "@/components/nextlayer/widget-view-settings"
import { datasets, presetDatasets } from "../../../../../examples/widgets/demo-data.mjs"

import { FixturePage } from "../fixture-layout"

const views: WidgetChartView[] = WIDGET_CHARTS.map(chart => ({ type: "chart", chart, query: "observations", series: chart === "stacked-bar" ? "series" : undefined, limit: chart === "trend-metric" ? 1 : 500 }))

const demoQueries = Object.fromEntries(WIDGET_CHARTS.map(chart => [chart, { observations: { rows: datasets[presetDatasets[chart]] } }]))

function DemoCard({ view, data = demoQueries[view.chart]! }: { view: WidgetChartView, data?: Record<string, unknown> }): React.JSX.Element {
  const [flipped, setFlipped] = useState(false)
  const [patch, setPatch] = useState<Partial<WidgetChartOptions>>()
  const title = view.chart.replaceAll("-", " ")
  const header = <CardHeader avatarSeed={title} title={title} providerTitle="Widget demo" actions={<CardHeaderActionButton aria-label={flipped ? "Widget front" : "Widget details"} onClick={() => setFlipped(!flipped)}>{flipped ? <PhArrowCircleLeftDuotone /> : <PhInfoDuotone />}</CardHeaderActionButton>} />
  return (
    <article className="teal h-80 min-w-0">
      <FlipAnimate flipped={flipped} rotate="y">
        <CardShell header={header}>
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl">
            <CardContentBackground />
            <WidgetChartContent view={{ ...view, ...patch }} queries={data} />
          </div>
        </CardShell>
        <CardShell header={header}><CardBackContent><WidgetViewSettings view={view} patch={patch} onSave={async value => setPatch(value ?? undefined)} /></CardBackContent></CardShell>
      </FlipAnimate>
    </article>
  )
}

function Gallery(): React.JSX.Element {
  return <FixturePage category="Patterns" title="Widget presets" description="Twenty-five presets with reusable data producers. Flip a card to configure its view." width="xl"><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{views.map(view => <DemoCard key={view.chart} view={view} />)}</div></FixturePage>
}
function States(): React.JSX.Element {
  return (
    <FixturePage category="Patterns" title="Widget states" description="Empty, invalid and signed observations." width="xl">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <DemoCard view={views[1]!} data={{ observations: { rows: [] } }} />
        <DemoCard view={views[3]!} data={{ observations: { rows: [{ label: "Invalid", value: "84" }] } }} />
        <DemoCard view={views[3]!} data={{ observations: { rows: [{ label: "Loss", value: -20 }, { label: "Flat", value: 0 }, { label: "Gain", value: 35 }] } }} />
      </div>
    </FixturePage>
  )
}
export default { Gallery, States }
