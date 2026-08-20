import type { ComponentMap, GridStackOptions, GridStackWidget } from "gridstack/dist/react"
import type { ComponentType } from "react"
import { GridStack } from "gridstack/dist/react"
import "gridstack/dist/gridstack.css"

type DemoWidgetKind
  = "briefing"
    | "clusters"
    | "confirmation"
    | "coverage"
    | "freshness"
    | "momentum"
    | "rankings"
    | "sources"
    | "timeline"

type DemoWidgetPlacement = Pick<GridStackWidget, "h" | "minH" | "minW" | "w" | "x" | "y">

function createDemoWidget(kind: DemoWidgetKind, placement: DemoWidgetPlacement): GridStackWidget {
  return {
    ...placement,
    id: `demo-${kind}`,
    component: "demoWidget",
    props: { kind },
  }
}

const DEMO_GRID_OPTIONS: GridStackOptions = {
  animate: true,
  cellHeight: 56,
  column: 12,
  columnOpts: {
    breakpoints: [
      { w: 640, c: 1, layout: "list" },
      { w: 960, c: 6, layout: "moveScale" },
    ],
    layout: "moveScale",
  },
  margin: 6,
  resizable: {
    handles: "e, se, s",
  },
  children: [
    createDemoWidget("briefing", {
      x: 0,
      y: 0,
      w: 7,
      h: 5,
      minW: 4,
      minH: 4,
    }),
    createDemoWidget("sources", {
      x: 7,
      y: 0,
      w: 5,
      h: 5,
      minW: 3,
      minH: 4,
    }),
    createDemoWidget("momentum", {
      x: 0,
      y: 5,
      w: 4,
      h: 4,
      minW: 3,
      minH: 3,
    }),
    createDemoWidget("timeline", {
      x: 4,
      y: 5,
      w: 8,
      h: 4,
      minW: 4,
      minH: 3,
    }),
    createDemoWidget("clusters", {
      x: 0,
      y: 9,
      w: 5,
      h: 5,
      minW: 3,
      minH: 4,
    }),
    createDemoWidget("confirmation", {
      x: 5,
      y: 9,
      w: 3,
      h: 5,
      minW: 3,
      minH: 4,
    }),
    createDemoWidget("coverage", {
      x: 8,
      y: 9,
      w: 4,
      h: 5,
      minW: 3,
      minH: 4,
    }),
    createDemoWidget("rankings", {
      x: 0,
      y: 14,
      w: 7,
      h: 5,
      minW: 4,
      minH: 4,
    }),
    createDemoWidget("freshness", {
      x: 7,
      y: 14,
      w: 5,
      h: 5,
      minW: 3,
      minH: 4,
    }),
  ],
}

const SOURCE_ROWS = [
  { label: "Hacker News", detail: "18 new items", tone: "bg-green-500" },
  { label: "GitHub Trending", detail: "6 projects moved", tone: "bg-blue-500" },
  { label: "Product Hunt", detail: "Observed 4m ago", tone: "bg-amber-500" },
]

const TIMELINE_ROWS = [
  { time: "09:10", label: "Open model release crossed three communities" },
  { time: "08:42", label: "Two developer tools entered the top ten" },
  { time: "07:55", label: "Inference pricing discussion accelerated" },
]

const TOPIC_CLUSTERS = [
  { label: "Local inference", count: 18, emphasis: "bg-primary/18 text-foreground" },
  { label: "Agent tooling", count: 14, emphasis: "bg-blue-500/12 text-foreground" },
  { label: "Model releases", count: 11, emphasis: "bg-purple-500/12 text-foreground" },
  { label: "Pricing", count: 9, emphasis: "bg-amber-500/12 text-foreground" },
  { label: "Benchmarks", count: 7, emphasis: "bg-green-500/12 text-foreground" },
]

const RISING_ITEMS = [
  { rank: "01", delta: "+7", label: "Local models move into production workflows" },
  { rank: "02", delta: "+4", label: "Inference cost becomes the release-day metric" },
  { rank: "03", delta: "+3", label: "Agent observability tools converge on traces" },
]

const FRESHNESS_BUCKETS = [
  { label: "Under 15m", value: 68 },
  { label: "Under 1h", value: 24 },
  { label: "Older", value: 8 },
]

const CONFIRMATION_SLOTS = [
  { id: "hacker-news", confirmed: true },
  { id: "github", confirmed: true },
  { id: "product-hunt", confirmed: true },
  { id: "reddit", confirmed: true },
  { id: "lobsters", confirmed: true },
  { id: "arxiv", confirmed: true },
  { id: "techmeme", confirmed: true },
  { id: "company-filings", confirmed: false },
  { id: "regional-coverage", confirmed: false },
]

const MOMENTUM_BARS = [
  { id: "one", height: 28 },
  { id: "two", height: 42 },
  { id: "three", height: 36 },
  { id: "four", height: 58 },
  { id: "five", height: 52 },
  { id: "six", height: 74 },
  { id: "seven", height: 68 },
  { id: "eight", height: 88 },
  { id: "nine", height: 82 },
  { id: "ten", height: 96 },
]

interface DemoWidgetDefinition {
  title: string
  Content: ComponentType
}

const DEMO_WIDGET_DEFINITIONS: Record<DemoWidgetKind, DemoWidgetDefinition> = {
  briefing: { title: "Morning briefing", Content: BriefingDemo },
  clusters: { title: "Topic clusters", Content: ClustersDemo },
  confirmation: { title: "Confirmation", Content: ConfirmationDemo },
  coverage: { title: "Coverage gaps", Content: CoverageDemo },
  freshness: { title: "Data freshness", Content: FreshnessDemo },
  momentum: { title: "Momentum", Content: MomentumDemo },
  rankings: { title: "Rising items", Content: RankingsDemo },
  sources: { title: "Source pulse", Content: SourcesDemo },
  timeline: { title: "Observation window", Content: TimelineDemo },
}

function isDemoWidgetKind(value: unknown): value is DemoWidgetKind {
  return typeof value === "string" && Object.hasOwn(DEMO_WIDGET_DEFINITIONS, value)
}

function DemoWidget(props: Record<string, unknown>) {
  const kind = isDemoWidgetKind(props.kind) ? props.kind : "briefing"
  const { title, Content } = DEMO_WIDGET_DEFINITIONS[kind]

  return (
    <article className="flex h-full min-h-0 cursor-grab flex-col rounded-3xl bg-theme-400/45 p-2.5 shadow-sm active:cursor-grabbing">
      <header className="flex h-10 shrink-0 items-center gap-3 px-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{title}</p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden rounded-2xl bg-background/70 p-4 zenith-theme-400">
        <Content />
      </div>
    </article>
  )
}

function BriefingDemo() {
  return (
    <div className="flex h-full flex-col justify-between gap-4">
      <div>
        <p className="text-xs font-semibold tracking-wide text-primary uppercase">Demo synthesis</p>
        <p className="mt-3 max-w-2xl text-lg leading-7 font-semibold text-foreground sm:text-xl">
          Open-source inference is drawing attention away from model launches and toward deployment cost.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span className="rounded-full bg-neutral-400/10 px-3 py-1.5">3 sources</span>
        <span className="rounded-full bg-neutral-400/10 px-3 py-1.5">24 observations</span>
        <span className="rounded-full bg-neutral-400/10 px-3 py-1.5">Updated 6m ago</span>
      </div>
    </div>
  )
}

function SourcesDemo() {
  return (
    <div className="flex h-full flex-col">
      <p className="text-xs leading-5 text-muted-foreground">
        Current demo data remains local to this page.
      </p>
      <div className="mt-3 divide-y divide-foreground/8 overflow-hidden">
        {SOURCE_ROWS.map(source => (
          <div key={source.label} className="flex items-center gap-3 py-3 first:pt-1">
            <span className={`size-2 shrink-0 rounded-full ${source.tone}`} />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{source.label}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{source.detail}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function MomentumDemo() {
  return (
    <div className="flex h-full flex-col justify-between gap-3">
      <div>
        <p className="text-3xl font-semibold tracking-tight text-foreground">+34%</p>
        <p className="mt-1 text-xs text-muted-foreground">Cross-source mentions · 6 hours</p>
      </div>
      <div className="flex h-16 items-end gap-1.5" aria-label="Momentum rising over ten intervals">
        {MOMENTUM_BARS.map(bar => (
          <span
            key={bar.id}
            className="min-w-1 flex-1 rounded-full bg-primary/70"
            style={{ height: `${bar.height}%` }}
          />
        ))}
      </div>
    </div>
  )
}

function TimelineDemo() {
  return (
    <ol className="grid h-full content-center gap-3">
      {TIMELINE_ROWS.map(item => (
        <li key={item.time} className="grid grid-cols-[3rem_0.5rem_1fr] items-start gap-3">
          <time className="pt-0.5 text-xs font-semibold text-muted-foreground">{item.time}</time>
          <span className="mt-1.5 size-2 rounded-full bg-primary" />
          <p className="text-sm leading-5 text-foreground">{item.label}</p>
        </li>
      ))}
    </ol>
  )
}

function ClustersDemo() {
  return (
    <div className="flex h-full flex-col justify-between gap-4">
      <p className="max-w-sm text-xs leading-5 text-muted-foreground">
        Related observations grouped by recurring language and linked domains.
      </p>
      <div className="flex flex-wrap content-end gap-2">
        {TOPIC_CLUSTERS.map(cluster => (
          <div
            key={cluster.label}
            className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium ${cluster.emphasis}`}
          >
            <span>{cluster.label}</span>
            <span className="text-xs text-muted-foreground">{cluster.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ConfirmationDemo() {
  return (
    <div className="flex h-full flex-col justify-between">
      <div>
        <p className="text-4xl font-semibold tracking-tight text-foreground">
          7
          <span className="text-xl text-muted-foreground">/9</span>
        </p>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">Signals independently observed across selected sources.</p>
      </div>
      <div className="grid grid-cols-3 gap-2" aria-label="Seven of nine sources confirm the signal">
        {CONFIRMATION_SLOTS.map(slot => (
          <span
            key={slot.id}
            className={slot.confirmed ? "h-1.5 rounded-full bg-primary" : "h-1.5 rounded-full bg-neutral-400/20"}
          />
        ))}
      </div>
    </div>
  )
}

function CoverageDemo() {
  return (
    <div className="flex h-full flex-col justify-between gap-4">
      <div>
        <p className="text-3xl font-semibold tracking-tight text-foreground">2 gaps</p>
        <p className="mt-1 text-xs text-muted-foreground">Evidence that could change this briefing</p>
      </div>
      <div className="grid gap-2">
        <div className="rounded-2xl bg-amber-500/10 px-3 py-2.5">
          <p className="text-sm font-medium text-foreground">Primary company filings</p>
          <p className="mt-0.5 text-xs text-muted-foreground">No registered Source</p>
        </div>
        <div className="rounded-2xl bg-neutral-400/10 px-3 py-2.5">
          <p className="text-sm font-medium text-foreground">Asia-Pacific coverage</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Sparse observations</p>
        </div>
      </div>
    </div>
  )
}

function RankingsDemo() {
  return (
    <ol className="grid h-full content-center divide-y divide-foreground/8">
      {RISING_ITEMS.map(item => (
        <li key={item.rank} className="grid grid-cols-[2.25rem_1fr_2.5rem] items-center gap-3 py-3 first:pt-0 last:pb-0">
          <span className="text-xs font-semibold text-muted-foreground">{item.rank}</span>
          <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
          <span className="rounded-full bg-green-500/12 px-2 py-1 text-center text-xs font-semibold text-green-700 dark:text-green-300">
            {item.delta}
          </span>
        </li>
      ))}
    </ol>
  )
}

function FreshnessDemo() {
  return (
    <div className="flex h-full flex-col justify-between gap-4">
      <div>
        <p className="text-3xl font-semibold tracking-tight text-foreground">92%</p>
        <p className="mt-1 text-xs text-muted-foreground">Observed within the last hour</p>
      </div>
      <div className="grid gap-3">
        {FRESHNESS_BUCKETS.map(bucket => (
          <div key={bucket.label} className="grid grid-cols-[4.5rem_1fr_2rem] items-center gap-2">
            <span className="text-xs text-muted-foreground">{bucket.label}</span>
            <span className="h-1.5 overflow-hidden rounded-full bg-neutral-400/15">
              <span className="block h-full rounded-full bg-primary/75" style={{ width: `${bucket.value}%` }} />
            </span>
            <span className="text-right text-xs font-semibold text-foreground">
              {`${bucket.value}%`}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

const DEMO_COMPONENTS: ComponentMap = {
  demoWidget: DemoWidget,
}

export function DemoGrid() {
  return (
    <section aria-labelledby="next-layer-demo-title">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3 px-2 sm:px-3">
        <div>
          <p className="text-xs font-semibold tracking-wide text-primary uppercase">Layout preview</p>
          <h2 id="next-layer-demo-title" className="mt-1 text-xl font-semibold tracking-tight text-foreground">
            Arrange your Next Layer
          </h2>
        </div>
        <p className="max-w-sm text-xs leading-5 text-muted-foreground">
          Drag a card to move it or pull its lower and right edges to resize. This demo resets when the page reloads.
        </p>
      </div>

      <GridStack
        className="next-layer-grid"
        options={DEMO_GRID_OPTIONS}
        components={DEMO_COMPONENTS}
      />
    </section>
  )
}
