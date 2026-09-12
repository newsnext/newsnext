# Widget Guideline

This is the canonical reference for NewsNext Widgets: their manifest, views, data
producers, and the document contract they share with the host. Source
configuration, loaders, and templates belong to the
[Source Authoring Guide](SOURCE_GUIDELINE.md); app-wide visual rules belong to the
[Design Guideline](DESIGN_GUIDELINE.md); the host lifecycle belongs to the
[Application Architecture](APPLICATION_ARCHITECTURE.md#layers-and-widgets).

## Widget definition

Widget manifest `width`, `height`, `minWidth`, and `minHeight` use half-LiveCard
grid units. `width: 2, height: 2` matches a standard 400px × 500px LiveCard.
The 24px grid gutter is included in each footprint: one unit renders as 188px
wide or 238px high. Width and height default to 2; `minWidth` and `minHeight`
default to 1. Resizing and saved Board layouts use the same units. Placement
width must be at least `2` (one LiveCard); the UI supports widths `2`, `3`, and
`4`, retaining half-card resize increments. Height may still be `1`. Older
narrower placements expand to the minimum when loaded.

When converting older local Widgets, update both the manifest sizes (including
minimums) and the saved Board layouts. Convert old widths with
`max(1, min(4, round(width / 2)))` and old heights with
`max(1, round(height * 56 / 262))` to snap their previous footprints to the
nearest new unit. Apply this once to known old data; the numeric fields alone
do not identify the unit system. Changing defaults does not update explicit
manifest sizes or already installed placements.

Data and view are independent. Place custom data logic in `data.mjs` beside
`widget.json`; the runtime discovers it automatically. The directory name is
the Widget ID (for example, `keyword-watch/widget.json` identifies
`keyword-watch`); do not declare `id` in the JSON:

```json
{
  "title": "Keyword Watch",
  "view": { "type": "live-card", "query": "feed" }
}
```

`widget.json.title` and `widget.json.color` define the default display identity,
using a string title and the same named color palette as Sources (`blue`,
`teal`, and so on; `slate` when omitted). Board placements may override them with
`metadata: { title, color, badge, desc, home }`, the same identity fields as
Cards. Use
`client.actions.nextLayer.setLiveWidgetMetadata({ boardId, liveWidgetId, metadata })`
to replace those overrides; `{}` restores the definition, and a blank title also
falls back to it. Metadata edits affect the shell and built-in view title without
reloading the data pipeline.

### Widget parameters

Declare optional top-level `params` in `widget.json` using the same parameter
schema as Sources (`text`, `url`, `number`, `switch`, `select`, `multiselect`):

```json
{
  "params": {
    "limit": { "type": "number", "title": "Limit", "default": 10, "min": 1, "max": 50 }
  }
}
```

Placed Widgets show these settings on their back, with Edit, Save, Cancel, and
Reset. Values belong to the Widget's Board placement. Reset clears overrides.
Use `client.actions.nextLayer.setLiveWidgetParams({ boardId, liveWidgetId, params })`
to replace overrides programmatically. Pass `{}` to restore manifest defaults.

`data.mjs` receives resolved values as `context.params`; custom HTML receives
`params` in each `newsnext.widget.data` message, including loading messages.
Direct data calls accept overrides independently of Board placement:

```ts
const result = await client.liveWidgets.data({
  widgetId: "keyword-watch",
  params: { limit: 5 },
})
```

Parameters participate in the daemon cache identity. Declarative queries remain
literal; read `params` in the data script to filter or transform query results or
to choose SDK query arguments. The shared settings editor validates the Source
schema's constraints, and the daemon checks JSON types, bounds, and option
membership.

## Data producers

`data.mjs` default-exports an async function. It returns named query results;
LiveCard consumes a result containing standard NewsItems:

```js
export default async function load({ signal }) {
  const response = await fetch("https://example.com/feed.json", { signal })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const items = await response.json() // Must conform to NewsItem.
  return { feed: { items } }
}
```

Alternatively, declare queries directly in the manifest:

```json
{
  "data": {
    "queries": {
      "feed": { "type": "latest", "keyword": "AI", "limit": 30 }
    }
  }
}
```

`latest` searches retained history for all scoped LiveCards directly in SQL.
It applies case-insensitive literal title matching, sorting, deduplication and limit
before returning items. Missing publication times sort last; a publication window
excludes items without a publication time. For standalone execution,
pass `cardIds` to the SDK; installed views use their placement's scope.
Queries and JS may coexist: JS receives materialized results in `queries`, where
query items use `{ value: NewsItem, cardId?, sourceId?, metadata? }` envelopes.
Its return value replaces those results. Return raw NewsItems in output `items`
arrays; the runtime adds the common envelope. Other named JSON results can carry
statistics or other data independently of LiveCard.
`latest` does not execute Sources or fetch external feeds. Board scope follows the current
Board's complete LiveCard list. History is isolated by each LiveCard's Worker,
Source, and resolved parameters; repeated URLs use their newest retained value.
Items absent from the newest observation remain searchable. `publishedAt` remains
the source publication time; refresh time is never substituted for it. No matches
produce an empty list.

Access data without a view, open page, or Board placement:

```ts
const result = await client.liveWidgets.data({ widgetId: "keyword-watch" })
const feed = result.queries.feed
```

The result includes `queries`, completion `refreshedAt`, and LiveCard `errors`.
With `data.mjs` present, a data-only `widget.json` can be `{}`. Without that
file, declare `data.queries`. The independent data loader ignores visual configuration. JS uses the first available runtime in this order: Bun, Deno, then Node.js 22+.
The daemon searches PATH and standard installation directories, including
`~/.bun/bin` and `~/.deno/bin`, so browser launches do not depend on shell PATH.
The selected runtime receives
`signal`, `widgetId`, optional `boardId`, and `clientOptions` for the Node SDK.
Execution is bounded to 60 seconds, 16 MiB of JSON and 64 KiB of diagnostics.
Use console logging for diagnostics; do not write other data to stdout. Local
scripts are trusted code with the runtime's normal filesystem/network access.
Each run imports a fresh module. Entry paths/symlinks must stay inside the Widget
directory; dependencies use normal module resolution.

Initial load, manual refresh and visible placed-Widget polling execute the data
pipeline. Widgets have no background schedule; `refresh.intervalMs` controls
visible polling. Unplaced data executes on SDK request. No separate producer or data.json is necessary. Existing
`file` queries can still import `{ items: [...] }` JSON (16 MiB / 500 items).

## Views

`view` may select `live-card` with optional `presentation: "list" | "ranking"`;
omit presentation for automatic timeline/list selection. Built-in views need no HTML file. Custom views use `index.html` beside
`widget.json` and may declare `view: { "type": "custom" }`. With `view` omitted,
`index.html` selects a custom view; without it the Widget is data-only.
Neither `entry` nor `data.entry` is a supported manifest field.
Preserve original millisecond `publishedAt` values; never substitute fetch time.
When displaying an HN submission, use its discussion URL and submission time,
not a timestamp that implies the linked article was published then.

Treat LiveCard as a built-in Widget UI, independent of the data producer.
Widgets selecting `view: { type: "live-card", query: "feed" }` render through the shared `LiveCardItems` presentation layer
in the extension; do not recreate item rows, time formatting, previews, or
statistics in local HTML. Only custom UIs need an iframe. Preserve the same
shell, details back, palette, and controls for either renderer. Empty item
results are an ordinary empty state; malformed data must show an error.

### Custom HTML documents

A custom view receives `newsnext.widget.data` messages from the host, carrying
`status` (`loading`, `ready`, or `error`), `stale`, `queries`, and the resolved
`params`, and answers with `newsnext.widget.ready` once its message listener is
installed. The host repeats the latest payload after each load and refresh.
Report empty or malformed data with `newsnext.widget.status`
(`{ "type": "newsnext.widget.status", "version": 1, "message": "No data to display." }`,
`message: null` clears it) instead of drawing status text; the host renders that
message in the shared status layer together with its own loading and error
states. The document must not scroll or show a scrollbar: keep its natural
content height and report it with `newsnext.widget.size`
(`{ "type": "newsnext.widget.size", "version": 1, "height": 128 }`). The host
sizes the iframe and its content panel owns the scrolling state, so do not give
`html`, `body`, or an inner element a viewport height or `overflow: auto`, and
keep the root at `overflow: hidden` so the document cannot scroll before the
host applies the reported height.
`examples/widgets/demo-custom-html/index.html` is the reference implementation
for this contract.

Keep the iframe and its document background transparent so the host's nested
surface remains visible. iframe content must not repeat the title, refresh
control, outer padding, rounded shell, or background. It may render links as
normal new-tab links; the host sandbox permits popups while retaining script,
DOM, storage, and same-origin isolation. Widget content should use NewsNext
semantic typography, foreground, muted, divider, hover, spacing, and motion
tokens instead of defining an unrelated visual system. An embedded document
cannot inherit the shell's custom properties, so declare the semantic tokens a
view uses locally with the app's values and declare `color-scheme: light dark`
so `light-dark()` follows the host's propagated scheme.

### SDK access inside Widgets

Custom-UI Widgets have two independent ways to obtain data: manifest queries receive
materialized Snapshots, and SDK calls actively query data or execute Actions.
A Widget may use both. The manifest's data scope applies to Snapshot queries;
it does not restrict SDK calls.

```ts
import { createClient } from "@newsnext/sdk/widget"

const client = createClient()
const boards = await client.actions.board.list()
const datasets = await client.history.datasets({ sourceId: "weibo:hot-search" })
```

The Widget entry runs inside an installed NewsNext iframe and uses its host's
runtime environment and Worker. It exposes the same Actions, `run`, `fetch`,
`status`, and history API as the Node client, with timeout and AbortSignal
support. Browser-aware bundlers also resolve `@newsnext/sdk` to this entry.
Bundle the SDK with the Widget's JavaScript; bare npm imports do not work in
unbundled HTML. The native host must advertise the `sdk` capability; after
updating it, reconnect the extension. An older host returns an explicit update
error. Installed local Widgets can execute mutating Actions as well as queries.

### Preset chart views

Use `view: { "type": "chart", "chart": "bar", "query": "observations" }`
for a built-in visualization. No HTML, chart library import, or network request is
needed in the view. Supported presets are `metric`, `line`, `area`, `bar`,
`ranking` (horizontal bars), `stacked-bar`, `donut`, `scatter`, `heatmap`,
`histogram`, `radar`, `funnel`, `table`, `word-cloud`, `progress`,
`trend-metric`, `change-ranking`, `calendar`, `status`, `timeline`, `treemap`,
`bullet`, `boxplot`, `waterfall`, and `sankey`.
The host uses ECharts and its word-cloud extension; metric and table views use
semantic HTML, as do status, timeline and comparison summaries. The front contains only the visualization and shared card header.

Return a named result from `data.mjs`:

```js
export default async function load() {
  return { observations: { rows: [
    { label: "Research", value: 42 },
    { label: "Products", value: 28 },
  ] } }
}
```

A minimal matching `widget.json`:

```json
{
  "title": "Topic share",
  "color": "teal",
  "view": { "type": "chart", "chart": "donut", "query": "observations" }
}
```

Rows use a string or numeric `label` and a finite numeric `value`. Strings are
never coerced to numbers and malformed data is reported visibly. Use `series`
to group lines or bars; declare its field explicitly, for example
`"series": "source"`. `scatter` uses numeric `x` and `y`; `heatmap` uses scalar
`x` and `y` category coordinates and numeric `value` for intensity. Coordinate
fields default to `x`/`y`, falling back to `label`/`value`. `label`, `value`,
`series`, `x`, and `y` in the view select literal row field names, not expressions.
Aggregate duplicate labels within each Cartesian/radar series in the data
producer. Missing series observations remain gaps rather than zeroes.

View options are `limit` (1–500, default 100), `sort` (`none`, `asc`, `desc`,
default data order), `decimals` (0–6, default 1), `suffix` (default empty),
`bins` (1–50, default 10), and `target` (positive progress target, default 100).
Sorting happens before the row limit; histograms bin the selected rows. Query
results may contain at most 10,000 rows. Donut, stacked bars, funnel, radar,
word cloud, and progress require non-negative values. Radar requires at least
three selected observations. Empty rows are a normal empty state.

The card back has a separate **View** section with Edit, Save, Cancel and Reset.
Field mapping and chart choices live here, separate from producer **Parameters**.
Changing the view never changes the query identifier or executes another data
pipeline. A placement stores Source-style sparse overrides in
`patch: { params, metadata, view }`. Each view field falls back to `widget.json`.
Only explicit `patch` sections are read; top-level placement settings are ignored.

```ts
await client.actions.nextLayer.configureLiveWidget({
  boardId, liveWidgetId,
  patch: { view: { chart: "bar", limit: 12 }, metadata: { title: "Top topics" } },
})
// Reset only presentation. Keep data parameters and metadata overrides.
await client.actions.nextLayer.configureLiveWidget({
  boardId, liveWidgetId, patch: { view: null },
})
```

Patch sections merge field by field; omitted fields are retained. Arrays replace
as values. `null` resets an entire section; `{}` is an empty merge. Existing
`setLiveWidgetParams` and `setLiveWidgetMetadata` replace their respective sections,
so `{}` with those Actions still resets them. Only resolved data parameters and
scope affect the daemon's data identity; metadata and view patches do not.

#### Additional preset data

Additional fields below have fixed names; `label` and `value` retain their view
field mappings. Producers own comparisons, statistics, chronological ordering,
and rank calculations. A view change does not manufacture missing fields.

| Preset | Additional row fields and behavior |
| --- | --- |
| `trend-metric` | Finite `previous` and `history` (1–500 finite numbers, oldest first). Displays current value, period change and sparkline. Use `limit: 1` for one compact metric. |
| `change-ranking` | Finite `previous`; optional positive integer `previousRank`. Current rank follows visible row order. Percentage changes use the absolute previous value; a zero baseline has no percentage. |
| `calendar` | `label` is a real `YYYY-MM-DD` date; `value` is non-negative. Unique dates, maximum span 366 days between endpoints. Increase `limit` above 100 for longer periods. Missing dates remain empty. |
| `status` | `status`: `ok`, `warning`, `error`, or `unknown`; timezone-qualified ISO `timestamp`; optional nonempty `detail`. No numeric value needed. |
| `timeline` | Timezone-qualified ISO `timestamp`, optional nonempty `detail`. No numeric value needed. Producer order is retained. |
| `treemap` | Non-negative category values. A flat composition treemap. |
| `bullet` | Non-negative actual `value`, optional non-negative row `target` (falls back to view target, then 100); optional ordered non-negative `range: [low, high]`. Thin foreground marker indicates the target; shaded band indicates the reference range. |
| `boxplot` | Ordered `box: [min, q1, median, q3, max]`; optional finite `outliers` array. `value` remains required for sorting/table switching; normally use the median. |
| `waterfall` | Signed contributions in producer order, accumulating from zero. A starting balance is an ordinary first contribution. Zero-crossing intervals are supported. |
| `sankey` | `label` names the source node, `destination` names the target node, non-negative `value` is flow magnitude. Cyclic flows are rejected. |

Status meanings are shown in text as well as color. Sorting waterfall rows changes
the contribution sequence; leave `sort: "none"` to preserve its meaning.

#### Reusable producer analytics

Import pure helpers from `@newsnext/sdk/analytics` in a data producer with the SDK
available in its runtime module resolution. This entry has no browser, network,
or transport dependencies and never mutates inputs:

```js
import { groupCount, topN, periodChange, movingAverage, timeBuckets, compareItems } from "@newsnext/sdk/analytics"

const counts = groupCount(items, item => item.category)
const rows = topN(counts, row => row.value, 10)
const change = periodChange(currentCount, previousCount)
const averages = movingAverage([12, 18, null, 20, 24], 2)
const days = timeBuckets(items, item => item.publishedAt, "day")
const { added, removed } = compareItems(previousItems, items, item => item.id)
```

`groupCount` preserves first-seen group order; `topN` preserves ties.
`timeBuckets` counts occupied UTC hour/day/week/month buckets (Monday weeks),
sorted chronologically; it does not fill missing buckets. Use timestamps with an
explicit timezone. `movingAverage` returns null until a complete trailing window
is present; null observations break the window. `compareItems` deduplicates by
identity, keeping the first item. `periodChange` returns current, previous, delta,
and percent (null for a zero baseline). Invalid numbers and invalid window/count
arguments throw rather than silently changing observations.

## Widget surface

Keep the trusted Widget shell outside the iframe. LiveCards and Widgets share
`CardShell`, `CardHeader`, `CardBackContent`, and `CardHeaderActionButton`;
Source identity is a leading slot in the common header. Keep surface, spacing,
back scrolling, and action placement in these shared components. Match the compact LiveCard header on both Widget
faces: a single title line in a 32px row and an 8px gap before the content panel.
LiveCards and Widgets share `CardRefreshButton` and the content refresh
background/opacity treatment. Disable the refresh button while fetching, spin its
indicator, and apply content dimming/pulsing only for initial loading and explicit
refreshes. Keep automatic background refreshes visually stable when data exists.
Explicit feedback lasts at least 500ms through the shared minimum-duration helper.
A failed background refresh retains the last successful items. First-load errors
reuse the LiveCard retry action; error details remain available in the shell.
The Widget shell owns the refresh state. Hold the content in a loading state
until the first data arrives, and keep it there during explicit refreshes and
initial loading. Derive empty, malformed, and request-error status in the shell
from the same data the renderers use, and render it in a single
`SourceStatusMessage` bottom layer shown only once data is ready. Content
renderers stay free of loading and status text.

Apply the Widget's `color` palette to the shell so the outer surface, nested
`zenith-theme-400` wash, and header controls use the Widget's scoped `theme-*`
tokens independently of the Board color. The host owns the title, refresh state
and button, drag behavior, nested `2xl` content surface, and error or connection
treatment. Widgets also have a host-owned details back, opened with the same
information icon as LiveCards and closed with a back arrow. Reuse `FlipAnimate`
for the Y-axis transition and the same shell on both faces. Keep slot content
overflow `visible` so the perspective animation can extend beyond the cell. Keep
clipping inside each face's nested content panel, and raise hovered or focused
grid items above their neighbors. Keep the iframe mounted during flips and make
the hidden face inert so keyboard focus cannot enter it. `FlipAnimate` owns
`inert` and `aria-hidden` for both kinds of card. Register only the visible
face's header as the drag handle, and build the drag preview from that header.
Both faces remain draggable.

The back's removal action shares `DeleteCardButton` and its two-step confirmation
with LiveCards; removing a Widget deletes its Board placement. The back shows
snapshot status, the number of scoped LiveCards, and the last update time. Place
the common metadata editor in a section first, separate from business parameters.
Use the LiveCard metadata editing pattern and shared `ThemeSelector` palette. Save
applies Board placement overrides to both faces; Cancel discards the draft and
Reset restores the `widget.json` defaults. Preview the draft identity in the back
header and theme without persisting it or changing data inputs. Use
`CardSettingsSection` for both metadata and parameter editors: share
Edit/Cancel/Save/Reset controls, validation gates, pending-state field disabling,
and inline errors. Keep failed saves editable and clear errors when cancelling or
starting a new edit. Allow settings action rows and the shared color palette to
wrap within narrow Widget widths; do not force a six-column palette or fixed
height when the available width is smaller. When `widget.json` declares
parameters, place their settings above the status details. Reuse the LiveCard
`ParameterSettings` section and fields, including read-only values, Edit, Cancel,
Reset, Save, and inline validation. Keep drafts local until Save; Reset clears
placement overrides to manifest defaults. Hide the parameter section when none
are declared.

Card and Widget backs share the same metadata editor, parameter editor, and Board
selection controls. Metadata drafts preview locally; saving changes presentation
without changing source parameters. `liveCard.resetMetadata` clears saved display
overrides independently of `liveCard.resetParams`. Widget metadata uses the same
fields through `nextLayer.setLiveWidgetMetadata`; its data inputs remain separate.

### Preset presentation

Preset visualizations use ECharts with restrained axes, compact labels, scoped
palette colors, transparent backgrounds and no toolbar, zoom controls or export
buttons. Series legends identify data but do not toggle it. Disable chart
animation so polling and card flips remain stable. Word clouds keep words
horizontal. Resolve CSS theme colors to RGB before passing them to Canvas.
Metric and table presets use semantic HTML; charts also expose their observations
in a screen-reader table. Keep view controls in a separate View section on the
back using the shared card settings and parameter fields. Cancel discards drafts,
Save updates the placement patch, and Reset removes only view overrides.

Advanced Widget presets keep controls on the card back. Trend metrics combine a
value and explicit period delta with a compact ECharts sparkline. Status rows show
a written state beside their colored dot; timelines include local display times
and machine-readable timestamps. Bullet charts separate actual bars, reference
bands, and target markers. Missing comparison baselines display explicit text.

## Instance identity

Widget definitions and instances have separate identities. `widget.json` remains
in the directory named by `widgetId`; it is never copied into Workspace storage.
`nextLayer.installLiveWidget({ boardId, widgetId, dataScope, layout })` creates an
independent instance and returns `{ liveWidgetId }`; repeated calls may use the
same definition in the same Board. Each instance stores its own sparse `patch`,
`dataScope`, and `layout`, so editing, dragging, resizing, moving, and removal
must target only the selected `liveWidgetId`. Moving an instance to another Board
preserves its identity and does not disable Boards that contain the same
definition, and definition-based avatars may stay identical across instances.
Identical definition inputs share the daemon's result cache. Host data messages
expose both `widgetId` and `liveWidgetId`; iframe source-window checks isolate
each instance, and `client.liveWidgets.data` keeps addressing the definition.

## Examples and verification

Runnable examples for all twenty-five presets live in `examples/widgets`. Copy its
contents (including the shared `demo-data.mjs`) to the Widget directory reported
by `newsnext status`, then install the `demo-*` directories on a Board through
`nextLayer.installLiveWidget`. The shared producer contains deterministic sample
data; its `dataset` parameter is editable on the back. Use the extension's Cosmos
**Patterns → Widgets → Gallery** for interactive previews and **States** for
empty, malformed and negative-value examples. The `demo-custom-html` example
renders a custom `index.html` view from the same `newsnext.widget.data` message.
The `demo-digest` example builds a multi-section dashboard from one `latest`
query: stat tiles, an interactive daily chart, ranked sources, topic deltas with
sparklines, and highlights. It reports status and height, keeps its own document
scroll-free, and shows how a producer turns raw item envelopes into view data.

Widget data and view changes are verified through the installed Widget: refresh
the manifest list, confirm the placement renders, and check the empty, malformed,
and error states the producer can produce. Next Layer grid behavior belongs to the
[Design Guideline](DESIGN_GUIDELINE.md#next-layer-surfaces).
