# NewsNext CLI SDK

`@newsnext/sdk` provides typed access to NewsNext Actions and history through the
CLI. The SDK and CLI are installed independently; installing the SDK does not
download the CLI.

## Installation

Install the SDK in the project and the CLI globally:

```sh
npm install @newsnext/sdk
npm install -g @newsnext/cli
newsnext status
```

The CLI runs independently as `newsnext`. The SDK invokes `newsnext` on PATH by
default, or uses the client's explicit `command`. It does not resolve CLI npm
packages or install an executable automatically.

Node.js 22+ and Bun are supported. CLI packages target macOS, Linux glibc and
Windows, on x64 and arm64. The CLI selects its platform binary through optional
dependencies, which must remain enabled during CLI installation. No Rust compiler
is needed.

## Client and environment

```ts
import { createClient } from "@newsnext/sdk"

const client = createClient({ environment: "production" })
const status = await client.status()
```

The default environment is production, independently of ambient `NEWSNEXT_ENV`.
Clients hold no persistent process and need no close call. Each request owns its
process; early iterator return or an AbortSignal terminates it. Unix cancellation
also terminates its process group.

`timeoutMs` is 1–600000, default 60000, per daemon request. The SDK additionally
bounds inactive CLI output waits, allowing two seconds for startup. Time spent
processing a yielded observation is excluded. Exports have no fixed total timeout;
use AbortSignal for a total deadline. Killing a request does not undo an Action
already sent to the Worker.

## LiveCard and LiveWidget data

```ts
const card = await client.liveCards.data({ cardId: "saved-card-id" })
const widget = await client.liveWidgets.data({
  widgetId: "digest",
  cardIds: ["saved-card-id"],
  params: { limit: 20 },
})
```

LiveCard data loads the saved Source through its owning Worker and existing
protection cache. Its response contains `result`, `params`, `fetchedAt`, `loadedAt`,
and `fetchProtected`. Missing cards or unavailable Workers fail through the router.
Configuration is available separately through `client.actions.liveCard.get`.
LiveWidget data returns `{ queries, refreshedAt, errors }`, supports arbitrary
named JSON results, and needs neither a Board placement nor a view. `cardIds` is
an explicit input scope; refreshing a LiveWidget does not refresh its Sources.

## History

```ts
const datasets = await client.history.datasets({ sourceId: "weibo:hot-search" })
const candidates = datasets.filter(dataset => dataset.params.type === "search")
if (candidates.length !== 1) throw new Error("Select a dataset by Worker and Source version")
const dataset = candidates[0]!

const titles = new Set<string>()
for await (const snapshot of client.history.export({
  datasetId: dataset.id,
  from: "2026-09-08T00:00:00+08:00",
  to: "2026-09-08T23:59:59.999+08:00",
})) {
  for (const item of snapshot.items) {
    if (typeof item.value.title === "string") titles.add(item.value.title)
  }
}
```

- `history.datasets(filter)` collects metadata pages. Filters are `workerId`,
  `providerId`, `sourceId` (full qualified ID), and `sourceVersion`.
- `history.datasetPage(query)` exposes explicit `cursor` / `limit` pagination.
- `history.observations({ datasetId, from?, to?, cursor?, limit? })` returns one
  metadata page with completeness diagnostics.
- `history.get(datasetId, observedAt)` returns one exact reconstructed observation.
- `history.compare({ datasetId, before, after })` returns additions, missing items,
  edits and movements, together with completeness diagnostics.
- `history.export({ datasetId, from?, to? })` yields full observations in ascending
  order through one CLI process. It throws on incomplete/missing data; any records
  yielded before an error are only a partial export. Finish iteration successfully
  before treating an analysis as complete.

All methods accept a final `{ timeoutMs?, signal? }` argument. Times accept safe,
nonnegative Unix milliseconds, Date objects, YYYY-MM-DD (midnight UTC), or RFC 3339
with an explicit timezone. Both range bounds are inclusive. Page limits are 1–250.
An omitted export upper bound is fixed from the dataset's latest timestamp on the
first page. Exports are not transactional snapshots: late/backfilled observations
can still change earlier intervals. Dataset discovery is also a live listing.

Observation items contain `identity: { providerId, url }`, `position` and `value`.
Positions represent retained list order. Do not treat ranking as a numeric heat
score, or count repeated appearances as distinct topics.

## Source execution, fetch and Actions

```ts
if (status.workers.length !== 1) throw new Error("Select a connected Worker by its full ID")
const workerId = status.workers[0]!.id
const result = await client.run({
  sourceId: "weibo:hot-search",
  params: { type: "search" },
}, { workerId })

const response = await client.fetch({ url: "https://example.com/feed.xml" }, { workerId })
const sources = await client.actions.source.list({}, { workerId })
const board = await client.actions.board.create({ name: "Reading" }, { workerId })
```

Use the full Worker ID returned by status. With no Worker ID the daemon selects
only when there is exactly one connected Worker; it never prompts. `run` accepts
a registered Source, or `{ providerId, provider, sourceId, params?, debug?,
useProviderSecrets? }` for an in-memory provider. Provider JSON is not read from a
path by the SDK. `fetch` accepts URL, method, header pairs and a string body; the
Worker validates requests and owns cookies.

All Action contracts live in `@newsnext/sdk/actions`; the extension binds its
handlers to these same schemas. Use `client.actions.<domain>.<method>(input, options)`
for statically typed names, inputs, and results. Empty-input Actions can omit input
when no per-call options are needed. `actions.execute(name, input, options)` also
uses the static contract. `actions.list()` remains available for runtime diagnostics;
it is not required before calling an Action. All Actions are callable through both the CLI and extension UI. Mutating Actions require the same user authorization as
terminal commands. `NewsNextError.code` preserves structured daemon/Worker errors;
transport failures may also be native process or stream errors.

### Updating an existing Board

For a requested color change, resolve the name, update only the color, and verify
it. Names are not guaranteed to be unique; do not silently pick the first match.
The example assumes the user requested changing the AI Board to blue and the
client already targets the intended Worker:

```ts
const matches = (await client.actions.board.list()).filter(board => board.name === "AI")
if (matches.length !== 1) throw new Error("Expected one AI Board; select a Board ID")
const boardId = matches[0]!.id

await client.actions.board.update({ boardId, color: "blue" })
const updated = (await client.actions.board.list()).find(board => board.id === boardId)
if (updated?.color !== "blue") throw new Error("Board color verification failed")
console.log({ boardId, name: updated.name, color: updated.color })
```

The same typed client exposes `card`, `source`, `nowLayer`, `nextLayer`,
`application`, `developer`, and Worker/native integration Actions. Consult
`@newsnext/sdk/actions` declarations for exact methods, inputs, and results;
do not maintain a second Action catalog in scripts. `ActionName`,
`ActionInput<Name>`, and `ActionResult<Name>` are also exported by the SDK root.
All Actions are exposed, though dynamic data such as Widget snapshots may still
have an `unknown` result type. Browser-dependent operations require a connected
extension; the SDK does not execute browser Sources inside Node.

## Extension app client

NewsNext's own extension app can import `createClient` from
`@newsnext/sdk/extension` and call `client.liveWidgets.data({ widgetId, cardIds },
{ signal })`. It uses the background's runtime-port SDK bridge and inherits the
host environment. The background accepts this transport only from its own
`app.html`; third-party pages and local widget iframes must use the Widget entry.

## Widget clients

Inside an installed Widget iframe, use the browser entry:

```ts
import { createClient } from "@newsnext/sdk/widget"

const client = createClient()
const boards = await client.actions.board.list()
const datasets = await client.history.datasets()
```

Bundle this import with the Widget. Browser-aware bundlers also select the
Widget entry for `@newsnext/sdk`. Both entries share the same Actions, history,
`status`, `run`, and `fetch` implementation. Widget options are `workerId`,
`timeoutMs`, and `signal`; the environment is inherited from the host, and Widgets
cannot select an executable or working directory. The default Worker is the
embedding extension's Worker.

The host forwards requests through Native Messaging to its own CLI SDK process.
History exports remain pull-based streams. Abort, early iterator return, iframe
unmount, or disconnection cancels the request; this does not undo an Action
already executed. The host must advertise the additive `sdk` capability. Update
and reconnect the native host when the Widget client reports missing support.

Manifest Snapshot queries and active SDK calls can coexist. A placement's data
scope applies to its Snapshot queries, not to SDK access; installed local Widgets
can call every Action, including mutations outside their Board.


### Data-only Widgets

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
The daemon enforces a fixed 60-second request protection window by retaining the
last successful result in SQLite for each Widget and resolved data scope. Calls
inside that window reuse the result; every request after it recomputes data.
Automatic and manual requests follow the same rule, with no `force` option or
additional `staleTimeMs` cache. Concurrent calls share the computed result. A
changed data definition or resolved scope starts a separate protection window.
Extension views retain display state but do not maintain a separate data cache.
With `data.mjs` present, a data-only `widget.json` can be `{}`. Without that
file, declare `data.queries`. The independent data loader ignores visual configuration. JS uses the first available runtime in this order: Bun, Deno, then Node.js 22+.
The daemon searches PATH and standard installation directories, including
`~/.bun/bin` and `~/.deno/bin`, so browser launches do not depend on shell PATH.
The selected runtime receives
`signal`, `widgetId`, optional `boardId`, resolved `params`, and `clientOptions` for the Node SDK.
Execution is bounded to 60 seconds, 16 MiB of JSON and 64 KiB of diagnostics.
Use console logging for diagnostics; do not write other data to stdout. Local
scripts are trusted code with the runtime's normal filesystem/network access.
Each run imports a fresh module. Entry paths/symlinks must stay inside the Widget
directory; dependencies use normal module resolution.

Initial load, manual refresh and visible placed-Widget polling execute the data
pipeline. Widgets have no background schedule; `refresh.intervalMs` controls
visible polling. Unplaced data executes on SDK request. No separate producer or data.json is necessary. Existing
`file` queries can still import `{ items: [...] }` JSON (16 MiB / 500 items).

`view` may select `live-card` with optional `presentation: "list" | "ranking"`;
omit presentation for automatic timeline/list selection. Built-in views need no HTML file. Custom views use `index.html` beside
`widget.json` and may declare `view: { "type": "custom" }`. With `view` omitted,
`index.html` selects a custom view; without it the Widget is data-only.
Neither `entry` nor `data.entry` is a supported manifest field.
Preserve original millisecond `publishedAt` values; never substitute fetch time.
When displaying an HN submission, use its discussion URL and submission time,
not a timestamp that implies the linked article was published then.


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
Use `client.actions.nextLayer.setLiveWidgetParams({ boardId, widgetId, params })` to
replace overrides programmatically. Pass `{}` to restore manifest defaults.

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
literal; read `params` in the data script to filter/transform query results or
choose SDK query arguments. The shared settings editor validates the Source
schema's constraints. The daemon checks JSON types, bounds, and option membership.


Widget layout dimensions use half-LiveCard units. Placement width must be at least
`2` (one LiveCard); the UI supports widths `2`, `3`, and `4`, retaining half-card
resize increments. Height may still be `1`. Older narrower placements expand to
the minimum when loaded.

### Widget display metadata

`widget.json.title` and `widget.json.color` define the default display identity,
using a string title and the same named color palette as Sources. The Widget back
exposes these separately from business parameters. Board placements may override
them with `metadata: { title, color, badge, desc, home }`, the same identity fields
as Cards. Use
`client.actions.nextLayer.setLiveWidgetMetadata({ boardId, widgetId, metadata })` to
replace those overrides; `{}` restores the definition. Blank titles also fall
back to the definition. Metadata edits affect the shell and built-in view title,
without reloading the data pipeline.


Use `client.actions.nextLayer.moveLiveWidget({ boardId, targetBoardId, widgetId })` to
move a placement while keeping its dimensions, metadata, and params. The target
must not already contain the Widget. Board-wide data follows the new Board;
explicit LiveCard selections are restricted to that Board's LiveCards.
`client.actions.liveCard.resetMetadata({ cardId })` resets a Card's saved
metadata independently of its Source parameters.


### Preset chart Widgets

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
Legacy top-level placement `params`/`metadata` migrate when data is read.

```ts
await client.actions.nextLayer.configureLiveWidget({
  boardId, widgetId,
  patch: { view: { chart: "bar", limit: 12 }, metadata: { title: "Top topics" } },
})
// Reset only presentation. Keep data parameters and metadata overrides.
await client.actions.nextLayer.configureLiveWidget({
  boardId, widgetId, patch: { view: null },
})
```

Patch sections merge field by field; omitted fields are retained. Arrays replace
as values. `null` resets an entire section; `{}` is an empty merge. Existing
`setLiveWidgetParams` and `setLiveWidgetMetadata` replace their respective sections,
so `{}` with those Actions still resets them. Only resolved data parameters and
scope affect the daemon's data identity; metadata and view patches do not.

Runnable examples for all twenty-five presets live in `examples/widgets`. Copy its
contents (including the shared `demo-data.mjs`) to the Widget directory reported
by `newsnext status`, then install the `demo-*` directories on a Board through
`nextLayer.installLiveWidget`. The shared producer contains deterministic sample
data; its `dataset` parameter is editable on the back. Use the extension's Cosmos
**Patterns → Widgets → Gallery** for interactive previews and **States** for
empty, malformed and negative-value examples.

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
