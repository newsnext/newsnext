# Widget authoring

Author Widgets with `newsnext widget create`, validate them with
`newsnext widget validate`, and install them through `newsnext eval`. This reference covers the manifest, views, data producers, parameters, and validation without additional files.

## Creating a Widget

Scaffold a Widget:

```sh
newsnext widget create keyword-watch --preset data-only
```

The default `live-card` preset generates a `widget.json` with a `live-card`
view and a `latest` feed query. `word-cloud` adds a sample `data.mjs`, `custom`
adds a sample `data.mjs` and `index.html`, and `data-only` generates only
`widget.json` with no view. The command prints the created directory; the
directory name is the Widget ID (for example, `keyword-watch/widget.json`
identifies `keyword-watch`). Never declare `id` in the JSON. Without
`--force`, existing files fail the command instead of being replaced.

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
  "preset": "live-card",
  "query": "feed"
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

Use a `search` query when the Widget should search history directly and optionally
choose a scope independent of its placement:

```json
{
  "data": {
    "queries": {
      "matches": {
        "type": "search",
        "keyword": "AI agent",
        "searchIn": "fullText",
        "boardIds": ["board-id"],
        "cardIds": ["card-id"],
        "window": "24h",
        "limit": 50
      }
    }
  }
}
```

`boardIds` and `cardIds` form a deduplicated union. If both are omitted, the query
inherits the Widget placement scope. `searchIn` is `title` by default and also
accepts `fullText`. Use `window` (`Nh` or `Nd`) for a relative publication window,
or millisecond `from`/`to` boundaries; `window` and `from` cannot be combined.
Results default to descending publication time and URL deduplication. `direction`,
`deduplicateBy`, and `limit` customize those defaults. Like `latest`, `search`
reads retained history without executing Sources.

Access data without a view, open page, or Board placement:

```ts
const result = await client.liveWidgets.data({ widgetId: "keyword-watch" })
return result.queries.feed
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
file, declare `data.queries`. Omit both for a data-free Widget: the pipeline
yields empty `queries`, and the host hides the refresh button. Built-in views
still require their view query in the declared data. The independent data loader ignores visual configuration. JS uses the first available runtime in this order: Bun, then Node.js 22+.
The daemon searches PATH and standard installation directories, including
`~/.bun/bin` and `~/.local/bin`, so browser launches do not depend on shell PATH.
Script executions share one short-lived runtime host with at most four isolated
worker threads. An idle thread exits after 10 seconds; the host exits after 60
seconds without a script request.
The selected runtime receives a preconfigured `client`, `signal`, `widgetId`,
`cardIds` for the resolved placement scope, and resolved `params`. Use `client`
directly for SDK calls; it inherits the current environment and abort signal without
requiring `@newsnext/sdk` in the Widget directory.
For reusable results across runs, use `client.cache.getOrComputeMany(
{ namespace, keys, ttlMs? }, async missingKeys => values)`. It computes only missing
keys and stores JSON values in the daemon's separate cache database. Omit `ttlMs`
for entries that remain valid until their key changes. Include source content and
processing version in the key when changes should invalidate a result. The same
`client.cache.getMany` and `putMany` calls are available to other SDK clients.
The client connects directly to the current daemon over authenticated local IPC; it does
not launch another CLI process. History export uses the same direct transport and remains
pull-based.
Execution is bounded to 60 seconds, 16 MiB of JSON and 64 KiB of diagnostics.
Use console logging for diagnostics; do not write other data to stdout. Local
scripts are trusted code with the runtime's normal filesystem/network access.
Each run imports a fresh module. Entry paths/symlinks must stay inside the Widget
directory; dependencies use normal module resolution.

Initial load, manual refresh and visible placed-Widget polling execute the data
pipeline. Widgets have no background schedule; `refresh.intervalMs` controls
visible polling. Unplaced data executes on SDK request. No separate producer or data.json is necessary. Existing
`file` queries can still import `{ items: [...] }` JSON (16 MiB / 500 items).

`preset: "live-card"` may use optional `presentation: "list" | "ranking"`;
omit presentation for automatic timeline/list selection. Built-in views need no HTML file. Custom views use `index.html` beside
`widget.json` and are covered in their own section below. Without `preset`,
`index.html` selects a custom view; without it the Widget is data-only.
Neither `entry` nor `data.entry` is a supported manifest field.
Preserve original millisecond `publishedAt` values; never substitute fetch time.


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
Use `client.actions.liveWidget.configure({ liveWidgetId, patch: { params } })` to
replace overrides programmatically. Pass `{}` to restore manifest defaults.

`data.mjs` receives resolved values as `context.params`; custom HTML receives
`params` in each `newsnext.widget.data` message, including loading messages.
Direct data calls accept overrides independently of Board placement:

```ts
const result = await client.liveWidgets.data({
  widgetId: "keyword-watch",
  params: { limit: 5 },
})
return result.queries
```

Parameters participate in the daemon cache identity. Declarative queries remain
literal; read `params` in the data script to filter/transform query results or
choose SDK query arguments. The shared settings editor validates the Source
schema's constraints. The daemon checks JSON types, bounds, and option membership.


Widget layout dimensions use half-LiveCard units. Widths range from `1` (half a
LiveCard) to `4` (two LiveCards), retaining half-card resize increments.
Height may still be `1`.

### Widget display metadata

`widget.json.title` and `widget.json.color` define the default display identity,
using a string title and the same named color palette as Sources. The Widget back
exposes these separately from business parameters. Board placements may override
them with `metadata: { title, color, badge, desc, home }`, the same identity fields
as Cards. Use
`client.actions.liveWidget.configure({ liveWidgetId, patch: { metadata } })` to
replace those overrides; `{}` restores the definition. Blank titles also fall
back to the definition. Metadata edits affect the shell and built-in view title,
without reloading the data pipeline.


Use `client.actions.liveWidget.move({ liveWidgetId, boardId: targetBoardId })` to
move an instance while keeping its ID, dimensions, metadata, and params. The target
may contain other instances of the same definition. Board-wide data follows the new Board;
explicit LiveCard selections are restricted to that Board's LiveCards.
`client.actions.liveCard.resetMetadata({ cardId })` resets a Card's saved
metadata independently of its Source parameters.


### Word cloud Widget

Use `"preset": "word-cloud"` with `"query": "observations"`
for the built-in word cloud. No HTML or chart library import is needed in the
view. The host owns the card header and visualization.

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
  "title": "Topic cloud",
  "color": "teal",
  "preset": "word-cloud",
  "query": "observations"
}
```

Rows require a string or finite numeric `label` and a non-negative finite
numeric `value`. View options are `label` and `value` (literal row field names),
`limit` (1–500, default 100), and `sort` (`none`, `asc`, `desc`, default data
order). Sorting happens before the row limit. Query results may contain at most
10,000 rows. Empty rows are a normal empty state.

The view and its field mappings belong to `widget.json`. Placement overrides
cover data parameters and display metadata; view settings are not editable per
placement. Only resolved data parameters and scope affect the daemon's data
identity.

#### Reusable producer analytics

Import pure helpers from `@newsnext/sdk/analytics` in a data producer with the SDK
available in its runtime module resolution. The specifier resolves through the
workspace and the CLI's bundled SDK, not through a separately installed package.
This entry has no browser, network,
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


Widget definitions and instances have separate identities. `widget.json` remains
in the directory named by `widgetId`; it is never copied into Workspace storage.
`liveWidget.create({ boardId, widgetId, dataScope, size })` creates an
independent instance and returns `{ liveWidgetId }`. Repeated calls may use the
same definition in the same Board. Use `liveWidgetId` for configuration, movement,
removal, and layout updates; keep using `widgetId` for `client.liveWidgets.data`.
Each instance stores its own sparse `patch`, `dataScope`, and `layout`. Identical
definition inputs share the daemon's result cache. Host data messages expose both
`widgetId` and `liveWidgetId`; iframe source-window checks isolate each instance.

A full install flow asks the user for the target Board first when they did not
name one: list the Boards, let the user pick, and never install into a
default Board. Then resolve that Board, install with a Board-wide scope,
and verify the returned placement:

```ts
const named = (await client.actions.board.list()).filter(board => board.name === "<board name>")
const board = named.length === 1 ? named[0] : undefined
if (!board) throw new Error("Expected one matching Board; select a Board ID")
const boardId = board.id
const { liveWidgetId, liveWidget } = await client.actions.liveWidget.create({
  boardId,
  dataScope: { type: "board" },
  size: { height: 1, width: 3 },
  widgetId: "<widget-id>",
})
if (liveWidget.liveWidgetId !== liveWidgetId || liveWidget.boardId !== boardId) {
  throw new Error("Widget placement missing after install")
}
return liveWidget
```

`dataScope` is `{ type: "board" }` for the Board's complete LiveCard list or
`{ type: "cards", cardIds }` for selected cards. `size` takes the manifest's
`width`/`height` (from `client.actions.nativeIntegration.getWidgets()`) in
half-LiveCard units; the placement always appends after the Board's existing
Widgets. Omitted `width`/`height` fall back to 2.

A minimal real-data Widget lives at `references/examples/word-cloud-widget/`
(`widget.json` and `data.mjs`). Scaffold new Widgets with
`newsnext widget create` instead of copying this directory by hand.

Validate with `newsnext widget validate --run <widgetId>` before installing:
`--run` resolves `latest` queries as empty, so zero rows standalone are
expected and do not indicate a broken producer. `select` parameter values are
strings; quote them for `--param` (`--param 'window="24"'`), since a bare
number parses as JSON and fails validation. Install the example above through
the install flow with `widgetId: "board-word-cloud"`.

### Custom HTML views

A runnable example lives at `references/examples/custom-html-widget/`
(`widget.json`, `data.mjs`, `index.html`).

A custom view is an `index.html` beside `widget.json`; omit `preset`. The host owns the shell,
surface, scroll container, and status layer; the document only styles and
draws its own content. The protocol version is `1`. The view posts
`{ type: "newsnext.widget.ready", version: 1 }` once its message listener is
installed. The host then delivers
`{ type: "newsnext.widget.data", version: 1, status, stale, queries, params, layout }`
where `status` is `loading`, `ready`, or `error`, and `layout` is
`{ width, height }` in half-LiveCard units, re-sent when the card is resized.
The host repeats the latest payload after each load and refresh.

Report content status with
`{ type: "newsnext.widget.status", version: 1, message }`
(`message: null` clears it) instead of drawing status text; the host renders
it in the shared status layer with its own loading and error states. Report
height with
`{ type: "newsnext.widget.size", version: 1, height }`; the host sizes the
iframe and its content panel owns scrolling, so the document itself must never
scroll or show a scrollbar: no viewport height or `overflow: auto` on `html`,
`body`, or inner elements, and keep the root at `overflow: hidden`.

Keep the iframe and document background transparent so the host surface stays
visible. Do not repeat the title, refresh control, outer padding, rounded
shell, or background. Links may open as normal new-tab links. Use the
NewsNext semantic typography, foreground, muted, divider, hover, spacing, and
motion tokens instead of a separate visual system: the daemon injects its
built-in stylesheet (`/widgets/newsnext.css`) into every served HTML document,
providing the tokens resolved through `light-dark()` plus base styles and
shared `nn-*` content components—do not redeclare them. For managed rendering,
import the shared view runtime explicitly as a module,
`import { createView } from "/widgets/newsnext.js"`, which wires the host
protocol and grid-span layout so the view renders from a frame carrying the
payload, measured box, and grid span instead of handling messages itself.
