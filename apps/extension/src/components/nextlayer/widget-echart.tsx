import type { WidgetChartView } from "@newsnext/sdk/models"
import type { ChartRow } from "./widget-chart-data"
import type { ChartTheme } from "./widget-chart-options"
import { BarChart, FunnelChart, HeatmapChart, LineChart, PieChart, RadarChart, ScatterChart } from "echarts/charts"
import { AriaComponent, GridComponent, LegendComponent, TooltipComponent, VisualMapComponent } from "echarts/components"
import { getInstanceByDom, init, use as registerCharts } from "echarts/core"
import { CanvasRenderer } from "echarts/renderers"
import { useEffect, useRef } from "react"
import { createChartOption } from "./widget-chart-options"
import "echarts-wordcloud"

registerCharts([BarChart, FunnelChart, HeatmapChart, LineChart, PieChart, RadarChart, ScatterChart, AriaComponent, GridComponent, LegendComponent, TooltipComponent, VisualMapComponent, CanvasRenderer])

/** Canvas color utilities expect RGB; resolve the application's OKLCH tokens in-browser. */
function readTheme(element: HTMLElement): ChartTheme {
  const probe = document.createElement("span")
  probe.hidden = true
  element.append(probe)
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = 1
  const context = canvas.getContext("2d", { willReadFrequently: true })
  const color = (token: string): string => {
    probe.style.color = `var(${token})`
    const computed = getComputedStyle(probe).color
    if (!context) return computed
    context.clearRect(0, 0, 1, 1)
    context.fillStyle = computed
    context.fillRect(0, 0, 1, 1)
    const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data
    return `rgba(${r},${g},${b},${a! / 255})`
  }
  const theme = { colors: [500, 700, 300, 600, 400].map(step => color(`--color-theme-${step}`)), foreground: color("--foreground"), muted: color("--muted-foreground"), divider: color("--border"), fontFamily: getComputedStyle(element).fontFamily }
  probe.remove()
  return theme
}

export default function WidgetEchart({ rows, view }: { rows: ChartRow[], view: WidgetChartView }): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const element = ref.current
    return () => {
      if (element) getInstanceByDom(element)?.dispose()
    }
  }, [])
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const chart = getInstanceByDom(element) ?? init(element, undefined, { renderer: "canvas" })
    const render = (): void => {
      const theme = readTheme(element)
      const option = view.chart === "word-cloud"
        ? {
            animation: false,
            tooltip: { show: false },
            series: [{ type: "wordCloud", shape: "circle", width: "96%", height: "96%", sizeRange: [12, 42], rotationRange: [0, 0], gridSize: 5, drawOutOfBound: false, shrinkToFit: true, layoutAnimation: false, textStyle: { fontFamily: theme.fontFamily, fontWeight: 600 }, data: rows.map((row, i) => ({ name: row.label, value: row.value, textStyle: { color: theme.colors[i % theme.colors.length] } })) }],
          }
        : createChartOption(rows, view, theme)
      chart.setOption(option, { notMerge: true })
    }
    render()
    const resize = new ResizeObserver(() => chart.resize())
    resize.observe(element)
    const theme = new MutationObserver(render)
    for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) theme.observe(ancestor, { attributes: true, attributeFilter: ["class", "style"] })
    return () => {
      resize.disconnect()
      theme.disconnect()
    }
  }, [rows, view])
  return <div ref={ref} className="min-h-0 w-full flex-1" aria-label={`${view.chart} chart`} />
}
