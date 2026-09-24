# NewsNext CLI SDK

Run JavaScript with `newsnext eval`. The script is an async function body with
a preconfigured `client` variable. Return a value to print it as JSON; an
undefined return prints nothing:

```sh
newsnext eval -e '
const status = await client.status()
return status.workers.length
'
```

Load modules with `await import(...)`.

See `newsnext eval --help` for input and timeout options.
Use `newsnext eval --pretty` when reading a nested return value in a terminal;
the default return format is compact JSON.

## Installation

Install the CLI globally, then check the daemon connection:

```sh
npm install -g @newsnext/cli
newsnext status
```

The SDK ships inside the CLI. CLI packages target macOS, Linux glibc, and
Windows on x64 and arm64. The CLI selects its platform binary through optional
dependencies during installation.

## Client

Clients hold no persistent process and need no close call. Each request owns
its process; early iterator return or an AbortSignal terminates it. Unix
cancellation also terminates its process group. Each `eval` starts a fresh
runtime: JavaScript variables do not persist between invocations.

`timeoutMs` is 1–600000, default 60000, per daemon request. Time spent
processing a yielded observation is excluded. Exports have no fixed total timeout;
use AbortSignal for a total deadline. Killing a request does not undo an Action
already sent to the Worker.

## Work efficiently

- Batch independent awaits in one `eval` and return IDs needed by later calls.
  Each invocation starts a fresh runtime and CLI process.
- Keep the action sequence and its verification in one script: resolve IDs,
  mutate, assert on the returned entity, then return the final state.
- Query the smallest scope needed: one `liveCard.get` instead of `board.get`,
  or `liveWidget.list` instead of one `board.listLiveWidgets` per Board.
- If an Action fails, inspect `NewsNextError.code` before retrying.
- Quote `eval -e` scripts with single quotes and use double quotes inside
  the JavaScript. Prefer stdin (`newsnext eval < script.js`) for long scripts.

## LiveCard and LiveWidget data

```ts
const card = await client.liveCards.data({ cardId: "saved-card-id" })
const widget = await client.liveWidgets.data({
  widgetId: "digest",
  cardIds: ["saved-card-id"],
  params: { limit: 20 },
})
const cachedWidget = await client.liveWidgets.readSnapshot({
  widgetId: "digest",
  cardIds: ["saved-card-id"],
  params: { limit: 20 },
})
return {
  cardItemCount: card.result.items.length,
  widgetQueries: Object.keys(widget.queries),
  cached: cachedWidget !== null,
}
```

LiveCard data loads the saved Source through its owning Worker and existing
protection cache. Its response contains `result`, `params`, `fetchedAt`, `loadedAt`,
and `fetchProtected`. Missing cards or unavailable Workers fail through the router.
Configuration is available separately through `client.actions.liveCard.get`.
LiveWidget data returns `{ queries, refreshedAt, errors }`, supports arbitrary
named JSON results, and needs neither a Board placement nor a view. `cardIds` is
an explicit input scope; refreshing a LiveWidget does not refresh its Sources.
`liveWidgets.readSnapshot` returns the latest matching result or `null` without
running the Widget data pipeline.

## Cache

The daemon stores reusable JSON values in a separate SQLite cache database.
Entries are scoped by `namespace` and `key`. Omit `ttlMs` to keep an entry until
it is overwritten; expired entries are omitted by `getMany` and pruned on later
writes. Widget result snapshots use the same store with a 60-second freshness
window, while `liveWidgets.readSnapshot` can still read a stale result.

```ts
const values = await client.cache.getOrComputeMany(
  { namespace: "widget:example:translations", keys: ["content-hash"], ttlMs: 86_400_000 },
  async missingKeys => Object.fromEntries(missingKeys.map(key => [key, { title: "Translated" }])),
)
const entries = await client.cache.getMany({ namespace: "widget:example:translations", keys: ["content-hash"] })
return { value: values["content-hash"], expiresAt: entries["content-hash"]?.expiresAt }
```

`getOrComputeMany` performs a read, computes missing keys, then writes them;
separate concurrent callers can compute the same cold key. Widget data requests
for the same resolved scope are coalesced before the script runs.

## History

Search the latest retained value for each URL without reconstructing observations:

```ts
const latest = await client.history.latest({
  keyword: "agent", // Optional title substring.
  boardIds: ["saved-board-id"],
  limit: 50,
})

const page = await client.history.search({
  keyword: "Jev",
  searchIn: "fullText",
  boardIds: ["saved-board-id"],
  cardIds: ["additional-card-id"],
  from: "2026-09-01T00:00:00Z",
  to: "2026-09-30T23:59:59.999Z",
  limit: 50,
})
return {
  latestCount: latest.items.length,
  searchCount: page.items.length,
  nextCursor: page.nextCursor ?? null,
}
```

`history.latest()` returns newest retained items and accepts an optional title keyword.
It supports the same Board/LiveCard scopes, time bounds, ordering, deduplication, and
pagination as search. Use `history.search()` when the keyword is required or
`searchIn: "fullText"` is needed.

`boardIds` select the Boards' current Now Layer LiveCards and `cardIds` add explicit
LiveCards; duplicate cards are searched once. Omitting both searches every configured
LiveCard. Both time bounds are inclusive and filter item `publishedAt`; items without a
publication time do not match a bounded search. `searchIn` defaults to `title`; use
`fullText` to search every textual value in the retained item, including its title,
summary, and body fields. Results default to newest first and URL deduplication. Pass
`nextCursor` back as `cursor` while `hasMore` is true.

```ts
const datasets = await client.history.datasets({ sourceId: "weibo:hot-search" })
const candidates = datasets.filter(dataset => dataset.params.type === "search")
const dataset = candidates.length === 1 ? candidates[0] : undefined
if (!dataset) throw new Error("Select a dataset by Worker and Source version")

const titles = new Set()
for await (const snapshot of client.history.export({
  datasetId: dataset.id,
  from: "2026-09-08T00:00:00+08:00",
  to: "2026-09-08T23:59:59.999+08:00",
})) {
  for (const item of snapshot.items) {
    if (typeof item.value.title === "string") titles.add(item.value.title)
  }
}
return { datasetId: dataset.id, uniqueTitleCount: titles.size }
```

- Metadata: `datasets(filter)` collects all pages; `datasetPage(query)`
  exposes explicit `cursor` / `limit` pagination. Filters are `workerId`,
  `providerId`, `sourceId` (full qualified ID), and `sourceVersion`.
- Observations: `observations(query)` returns one metadata page with
  completeness diagnostics; `get(datasetId, observedAt)` returns one exact
  reconstructed observation; `compare(query)` returns additions, missing items,
  edits and movements, together with completeness diagnostics.
- `export(query)` yields full observations in ascending order through one CLI
  process. It throws on incomplete/missing data; any records yielded before an
  error are only a partial export. Finish iteration successfully before treating
  an analysis as complete.

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
const status = await client.status()
const worker = status.workers.length === 1 ? status.workers[0] : undefined
if (!worker) throw new Error("Select a connected Worker by its full ID")
const workerId = worker.id
const result = await client.run({
  sourceId: "weibo:hot-search",
  params: { type: "search" },
}, { workerId })
return { execution: result.execution, itemCount: result.data.length }
```

Use the full Worker ID returned by status when the call must run in a
specific browser. With no Worker ID the daemon routes the Action to the
most recently active connected Worker (Worker ID breaks ties); it never
prompts. Workspace
data Actions (`board.*`, `liveCard.*` configuration, `*.list`) are
worker-agnostic because every Worker commits through the shared Workspace.
`run` and `fetch` execute inside a browser: `fetch` shares that
Worker's cookies, so pin `{ workerId }` when the browser matters. `run` accepts
a registered Source, or `{ providerId, provider, sourceId, params?, debug?,
useProviderSecrets? }` for an in-memory provider. Provider JSON is not read from a
path by the SDK. `fetch` accepts the Source `context.fetch` request shape (URL,
method, header pairs, string body or JSON, search params, retry limit, redirect,
credentials, and per-attempt timeout) and shares its timeout, GET retry policy,
hostname queue, and cookie behavior; HTTP errors reject and the response carries
the final URL. The Worker validates requests and owns cookies.

All Action contracts live in `@newsnext/sdk/actions`; the extension binds its
handlers to these same schemas. Use `client.actions.<domain>.<method>(input, options)`
for statically typed names, inputs, and results. Empty-input Actions can omit input
when no per-call options are needed. `actions.execute(name, input, options)` also
uses the static contract. `actions.list()` remains available for runtime diagnostics;
it is not required before calling an Action. All Actions are callable through both the CLI and extension UI. Mutating Actions require the same user authorization as
terminal commands. `NewsNextError.code` preserves structured daemon/Worker errors;
transport failures may also be native process or stream errors.

### Updating an existing Board

Resolve the name (names are not unique), update only the requested field, and
verify it. The example changes the AI Board to blue:

```ts
const matches = (await client.actions.board.list()).filter(board => board.name === "AI")
const board = matches.length === 1 ? matches[0] : undefined
if (!board) throw new Error("Expected one AI Board; select a Board ID")
const boardId = board.id

const updated = await client.actions.board.update({ boardId, color: "blue" })
if (updated.color !== "blue") throw new Error("Board color verification failed")
return { boardId, name: updated.name, color: updated.color }
```

The same typed client exposes `card`, `source`, `nowLayer`, `nextLayer`,
`application`, `developer`, and Worker/native integration Actions. `ActionName`,
`ActionInput<Name>`, and `ActionResult<Name>` are also exported by the SDK root.
All Actions are exposed, though dynamic data such as Widget snapshots may still
have an `unknown` result type. Browser-dependent operations require a connected
extension; the SDK does not execute browser Sources inside Node.

## Extension app client

NewsNext's own extension app can import `createClient` from
`@newsnext/sdk/extension` and call `client.liveWidgets.data` or
`client.liveWidgets.readSnapshot` with `{ widgetId, cardIds }` and `{ signal }`.
The `@newsnext/sdk/*` specifiers below resolve through the workspace
and the CLI's bundled SDK; the SDK is not installed from a registry.
It uses the background's runtime-port SDK bridge and inherits the
host environment. The background accepts this transport only from its own
`app.html`; third-party pages and local widget iframes must use the Widget entry.

## Widget authoring

When authoring a Widget rather than only querying its data, read
[widget-authoring.md](widget-authoring.md): it covers the manifest, views, data
producers, parameters, and validation without additional files.

## Workspace connection decisions

A browser with local changes may report `state: "workspaceConflict"` from
`client.actions.nativeIntegration.getStatus()`. Its `workspaceConflict` contains
local/shared entity counts and the shared revision. After the user chooses a
strategy, call `client.actions.nativeIntegration.resolveWorkspace({ resolution,
expectedRevision })` on that Worker. `resolution` is `overwrite` (local replaces
shared), `merge` (union IDs; shared conflicts and settings win), or `discard`
(shared replaces local). Do not infer overwrite or discard authorization from a
request to connect. Both snapshots are backed up before resolution; stale
revisions require reviewing the latest status again.
