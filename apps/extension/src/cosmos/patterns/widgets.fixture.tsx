/* eslint-disable react-refresh/only-export-components */
import type { WidgetChart, WidgetChartView } from "@newsnext/sdk/models"
import { WIDGET_CHARTS } from "@newsnext/sdk/models"
import { FlipAnimate } from "@newsnext/ui/components/flip-animate"
import { useState } from "react"
import { CardBackContent, CardShell } from "@/components/card-shell"
import { CardHeader, CardHeaderActionButton } from "@/components/card-shell/card-header"
import { CardContentBackground } from "@/components/card-shell/card-refresh"
import { PhArrowCircleLeftDuotone, PhInfoDuotone } from "@/components/icons/ph"
import { WidgetChartContent } from "@/components/nextlayer/widget-chart-content"

import { FixturePage } from "../fixture-layout"

// Minimal inline rows for previewing every chart preset. Production Widgets
// own their data producers; these static rows only exercise the views.
// Minimal inline rows for previewing every chart preset. Production Widgets
// own their data producers; these static rows only exercise the views.
interface ObservationRows { observations: { rows: Record<string, unknown>[] } }
const demoQueries: Record<WidgetChart, ObservationRows> = {
  "metric": { observations: { rows: [{ label: "Articles", value: 1248 }, { label: "Sources", value: 36 }] } },
  "line": { observations: { rows: [{ label: "Sep 1", value: 30 }, { label: "Sep 2", value: 47 }, { label: "Sep 3", value: 52 }] } },
  "area": { observations: { rows: [{ label: "Sep 1", value: 30 }, { label: "Sep 2", value: 47 }, { label: "Sep 3", value: 52 }] } },
  "bar": { observations: { rows: [{ label: "Technology", value: 84 }, { label: "Science", value: 62 }, { label: "Design", value: 48 }] } },
  "ranking": { observations: { rows: [{ label: "Technology", value: 84 }, { label: "Science", value: 62 }, { label: "Design", value: 48 }] } },
  "stacked-bar": { observations: { rows: [{ label: "Sep 1", series: "Research", value: 12 }, { label: "Sep 1", series: "Products", value: 19 }, { label: "Sep 2", series: "Research", value: 22 }] } },
  "donut": { observations: { rows: [{ label: "Technology", value: 84 }, { label: "Science", value: 62 }, { label: "Design", value: 48 }] } },
  "scatter": { observations: { rows: [{ label: "Article 1", value: 1, x: 10, y: 15 }, { label: "Article 2", value: 2, x: 13, y: 30 }] } },
  "heatmap": { observations: { rows: [{ label: "Mon Morning", x: "Mon", y: "Morning", value: 38 }, { label: "Mon Afternoon", x: "Mon", y: "Afternoon", value: 55 }] } },
  "histogram": { observations: { rows: [{ label: "Sample 1", value: 20 }, { label: "Sample 2", value: 37 }, { label: "Sample 3", value: 43 }] } },
  "radar": { observations: { rows: [{ label: "Technology", value: 84 }, { label: "Science", value: 62 }, { label: "Design", value: 48 }] } },
  "funnel": { observations: { rows: [{ label: "Discovered", value: 1200 }, { label: "Relevant", value: 850 }, { label: "Read", value: 460 }] } },
  "table": { observations: { rows: [{ label: "Technology", value: 84 }, { label: "Science", value: 62 }, { label: "Design", value: 48 }] } },
  "word-cloud": { observations: { rows: [{ label: "AI", value: 100 }, { label: "Research", value: 95 }, { label: "Design", value: 90 }] } },
  "progress": { observations: { rows: [{ label: "Technology", value: 84 }, { label: "Science", value: 62 }, { label: "Design", value: 48 }] } },
  "trend-metric": { observations: { rows: [{ label: "Technology", value: 84, previous: 72, previousRank: 2, history: [60, 66, 72, 84] }] } },
  "change-ranking": { observations: { rows: [{ label: "Technology", value: 84, previous: 72, previousRank: 2, history: [60, 66, 72, 84] }, { label: "Science", value: 62, previous: 68, previousRank: 1, history: [70, 69, 68, 62] }] } },
  "calendar": { observations: { rows: [{ label: "2026-06-01", value: 12 }, { label: "2026-06-02", value: 29 }] } },
  "status": { observations: { rows: [{ label: "News feed", status: "ok", detail: "All sources up to date", timestamp: "2026-09-11T10:30:00Z" }] } },
  "timeline": { observations: { rows: [{ label: "Source refreshed", detail: "24 new articles collected", timestamp: "2026-09-11T10:00:00Z" }] } },
  "treemap": { observations: { rows: [{ label: "Technology", value: 84 }, { label: "Science", value: 62 }, { label: "Design", value: 48 }] } },
  "bullet": { observations: { rows: [{ label: "Technology", value: 84, target: 65, range: [0, 100] }] } },
  "boxplot": { observations: { rows: [{ label: "Technology", value: 48, box: [10, 25, 48, 60, 76], outliers: [90] }] } },
  "waterfall": { observations: { rows: [{ label: "Starting", value: 100 }, { label: "New", value: 45 }, { label: "Expired", value: -30 }] } },
  "sankey": { observations: { rows: [{ label: "Feeds", destination: "Relevant", value: 80 }, { label: "Relevant", destination: "Read", value: 90 }] } },
}

const views: WidgetChartView[] = WIDGET_CHARTS.map(chart => ({ type: "chart", chart, query: "observations", series: chart === "stacked-bar" ? "series" : undefined, limit: chart === "trend-metric" ? 1 : 500 }))

function DemoCard({ view, data = demoQueries[view.chart]! }: { view: WidgetChartView, data?: Record<string, unknown> }): React.JSX.Element {
  const [flipped, setFlipped] = useState(false)
  const title = view.chart.replaceAll("-", " ")
  const header = <CardHeader avatarSeed={title} title={title} providerTitle="Widget demo" actions={<CardHeaderActionButton aria-label={flipped ? "Widget front" : "Widget details"} onClick={() => setFlipped(!flipped)}>{flipped ? <PhArrowCircleLeftDuotone /> : <PhInfoDuotone />}</CardHeaderActionButton>} />
  return (
    <article className="teal h-80 min-w-0">
      <FlipAnimate flipped={flipped} rotate="y">
        <CardShell header={header}>
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl">
            <CardContentBackground />
            <WidgetChartContent view={view} queries={data} />
          </div>
        </CardShell>
        <CardShell header={header}><CardBackContent><p className="text-sm text-muted-foreground">View is defined in widget.json.</p></CardBackContent></CardShell>
      </FlipAnimate>
    </article>
  )
}

function Gallery(): React.JSX.Element {
  return <FixturePage category="Patterns" title="Widget presets" description="Twenty-five presets with inline sample rows. Flip a card to configure its view." width="xl"><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{views.map(view => <DemoCard key={view.chart} view={view} />)}</div></FixturePage>
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
