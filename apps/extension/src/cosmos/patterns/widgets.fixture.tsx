/* eslint-disable react-refresh/only-export-components */
import { FlipAnimate } from "@newsnext/ui/components/flip-animate"
import { useState } from "react"
import { CardBackContent, CardShell } from "@/components/card-shell"
import { CardHeader, CardHeaderActionButton } from "@/components/card-shell/card-header"
import { CardContentBackground } from "@/components/card-shell/card-refresh"
import { PhArrowCircleLeftDuotone, PhInfoDuotone } from "@/components/icons/ph"
import { WidgetChartContent } from "@/components/nextlayer/chart/widget-chart-content"
import { FixturePage } from "../fixture-layout"

const rows = [{ label: "AI", value: 100 }, { label: "Research", value: 95 }, { label: "Design", value: 90 }]

function DemoCard(): React.JSX.Element {
  const [flipped, setFlipped] = useState(false)
  const header = <CardHeader avatarSeed="Word cloud" title="Word cloud" providerTitle="Widget demo" actions={<CardHeaderActionButton aria-label={flipped ? "Widget front" : "Widget details"} onClick={() => setFlipped(!flipped)}>{flipped ? <PhArrowCircleLeftDuotone /> : <PhInfoDuotone />}</CardHeaderActionButton>} />
  return (
    <article className="teal h-80 min-w-0">
      <FlipAnimate flipped={flipped} rotate="y">
        <CardShell header={header}>
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl">
            <CardContentBackground />
            <WidgetChartContent rows={rows} layout={{ width: 2, height: 1 }} />
          </div>
        </CardShell>
        <CardShell header={header}><CardBackContent><p className="text-sm text-muted-foreground">View is defined in widget.json.</p></CardBackContent></CardShell>
      </FlipAnimate>
    </article>
  )
}

function Gallery(): React.JSX.Element {
  return <FixturePage category="Patterns" title="Word cloud Widget" description="The built-in chart view with inline sample rows." width="xl"><DemoCard /></FixturePage>
}
export default { Gallery }
