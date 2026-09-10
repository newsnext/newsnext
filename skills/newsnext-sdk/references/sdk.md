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

The same typed client exposes `instance`, `source`, `nowLayer`, `nextLayer`,
`application`, `developer`, and Worker/native integration Actions. Consult
`@newsnext/sdk/actions` declarations for exact methods, inputs, and results;
do not maintain a second Action catalog in scripts. `ActionName`,
`ActionInput<Name>`, and `ActionResult<Name>` are also exported by the SDK root.
All Actions are exposed, though dynamic data such as Widget snapshots may still
have an `unknown` result type. Browser-dependent operations require a connected
extension; the SDK does not execute browser Sources inside Node.

## Extension app client

NewsNext's own extension app can import `createClient` from
`@newsnext/sdk/extension` and call `client.widgets.data({ widgetId, instanceIds },
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

Data and view are independent. Use a JS entry for custom data:

```json
{
  "id": "keyword-watch",
  "title": "Keyword Watch",
  "data": { "entry": "data.mjs" },
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
  "id": "ai-feed",
  "data": {
    "queries": {
      "feed": { "type": "latest", "keyword": "AI", "limit": 30 }
    }
  }
}
```

`latest` searches retained history for all scoped Instances directly in SQL.
It applies case-insensitive literal title matching, sorting, deduplication and limit
before returning items. Missing publication times sort last; a publication window
excludes items without a publication time. For standalone execution,
pass `instanceIds` to the SDK; installed views use their placement's scope.
Queries and JS may coexist: JS receives materialized results in `queries`, where
query items use `{ value: NewsItem, instanceId?, sourceId?, metadata? }` envelopes.
Its return value replaces those results. Return raw NewsItems in output `items`
arrays; the runtime adds the common envelope. Other named JSON results can carry
statistics or other data independently of LiveCard.
`latest` does not execute Sources or fetch external feeds. Board scope follows the current
Board's complete Instance list. History is isolated by each Instance's Worker,
Source, and resolved parameters; repeated URLs use their newest retained value.
Items absent from the newest observation remain searchable. `publishedAt` remains
the source publication time; refresh time is never substituted for it. No matches
produce an empty list.

Access data without a view, open page, or Board placement:

```ts
const result = await client.widgets.data({ widgetId: "keyword-watch" })
const feed = result.queries.feed
```

The result includes `queries`, completion `refreshedAt`, and Instance `errors`.
The daemon enforces a fixed 60-second request protection window by retaining the
last successful result in SQLite for each Widget and resolved data scope. Calls
inside that window reuse the result; every request after it recomputes data.
Automatic and manual requests follow the same rule, with no `force` option or
additional `staleTimeMs` cache. Concurrent calls share the computed result. A
changed data definition or resolved scope starts a separate protection window.
Extension views retain display state but do not maintain a separate data cache.
A definition without `view` needs only `id` and `data`. The independent data
loader ignores visual configuration. JS uses the first available runtime in this order: Bun, Deno, then Node.js 22+.
The daemon searches PATH and standard installation directories, including
`~/.bun/bin` and `~/.deno/bin`, so browser launches do not depend on shell PATH.
The selected runtime receives
`signal`, `widgetId`, optional `boardId`, and `clientOptions` for the Node SDK.
Execution is bounded to 60 seconds, 16 MiB of JSON and 64 KiB of diagnostics.
Use console logging for diagnostics; do not write other data to stdout. Local
scripts are trusted code with the runtime's normal filesystem/network access.
Each run imports a fresh module. Entry paths/symlinks must stay inside the Widget
directory; dependencies use normal module resolution.

Initial load, manual refresh and periodic placed-Widget refresh execute the data
pipeline. Placed Widgets also have daemon-managed background Jobs. Unplaced data
executes on SDK request. No separate producer or data.json is necessary. Existing
`file` queries can still import `{ items: [...] }` JSON (16 MiB / 500 items).

`view` may select `live-card` with optional `presentation: "list" | "ranking"`;
omit presentation for automatic timeline/list selection. Built-in views omit the
HTML `entry`. Custom views use an HTML `entry` and `view: { "type": "custom" }`.
Preserve original millisecond `publishedAt` values; never substitute fetch time.
When displaying an HN submission, use its discussion URL and submission time,
not a timestamp that implies the linked article was published then.
