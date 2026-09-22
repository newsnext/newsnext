# NewsNext CLI SDK

The SDK ships inside the CLI and is only invoked through it. Run JavaScript
with `newsnext eval`: the evaluated script receives a preconfigured `client`
global targeting the invocation's environment, with no installation,
imports, or setup beyond the CLI itself:

```sh
newsnext eval -e '
const status = await client.status()
console.log(JSON.stringify(status.workers.length))
'
newsnext eval < script.js
```

See `newsnext eval --help` for input and timeout options.

## Installation

Install the CLI globally, then check the daemon connection:

```sh
npm install -g @newsnext/cli
newsnext status
```

The evaluated `client` calls the same CLI over its machine transport. The SDK
is not published as a standalone npm package: it ships inside the CLI and the
workspace, so never install it separately. CLI packages target macOS, Linux glibc
and Windows, on x64 and arm64. The CLI selects its platform binary through
optional dependencies, which must remain enabled during CLI installation. No
Rust compiler is needed.

## Client and environment

```ts
const status = await client.status()
```

The invocation selects the environment (`NEWSNEXT_ENV`, default production)
for the daemon endpoint, database, widget directory, and Native Messaging
host alike. Clients hold no persistent process and need no close call. Each
request owns its process; early iterator return or an AbortSignal terminates
it. Unix cancellation also terminates its process group. Each `eval` starts a
fresh runtime: JavaScript variables do not persist between invocations.

`timeoutMs` is 1–600000, default 60000, per daemon request. Time spent
processing a yielded observation is excluded. Exports have no fixed total timeout;
use AbortSignal for a total deadline. Killing a request does not undo an Action
already sent to the Worker.

## Work efficiently

- Batch independent awaits in one `eval`: each invocation spawns a fresh
  runtime and CLI process, so one script with several awaits beats several
  invocations. JavaScript variables do not persist between invocations; print
  every ID the next round needs (Board IDs, card IDs, widget IDs).
- Keep the action sequence and its verification in the same script: resolve
  IDs, mutate, assert on the returned entity, then print the final state last
  so the next round can act on it directly. Mutations return the affected
  entity; a follow-up query for the same state is waste.
- Collect only the cheapest state sufficient to choose the next action: one
  `liveCard.get` beats `board.get`, and `liveWidget.list` beats one
  `board.listLiveWidgets` per Board. Once the returned value verifies a
  mutation, stop; do not re-query the same state through another surface.
- If an Action fails, inspect the error (`NewsNextError.code`) before
  deciding whether to retry. Do not blindly repeat the call or switch to an
  unrelated surface to confirm the same state.
- Quote `eval -e` scripts with single quotes and use double quotes inside
  the JavaScript. Print results with `console.log(JSON.stringify(value))`
  (no indentation) as the last statement. Prefer stdin (`newsnext eval <
  script.js`) for long scripts.

## Calling Actions

- Call only Actions listed in [actions.md](actions.md), as
  `client.actions.<domain>.<method>` with the documented input shape. Do not
  invent Action names or parameters; the catalog is generated from the SDK
  contracts. `actions.list()` is a runtime diagnostic, never a prerequisite.
- The evaluated script receives a preconfigured `client` global: no imports,
  no setup, no manually constructed clients.

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

## History

Search the latest retained value for each URL without reconstructing observations:

```ts
const page = await client.history.search({
  keyword: "Jev",
  searchIn: "fullText",
  boardIds: ["saved-board-id"],
  cardIds: ["additional-card-id"],
  from: "2026-09-01T00:00:00Z",
  to: "2026-09-30T23:59:59.999Z",
  limit: 50,
})
```

`boardIds` select the Boards' current Now Layer LiveCards and `cardIds` add explicit
LiveCards; duplicate cards are searched once. Omitting both searches every configured
LiveCard. Both time bounds are inclusive and filter item `publishedAt`; items without a
publication time do not match a bounded search. `searchIn` defaults to `title`; use
`fullText` to search every textual value in the retained item, including its title,
summary, and body fields. Results default to newest first and URL deduplication. Pass
`nextCursor` back as `cursor` while `hasMore` is true.

```ts
// Round 1: find the dataset.
const datasets = await client.history.datasets({ sourceId: "weibo:hot-search" })
const candidates = datasets.filter(dataset => dataset.params.type === "search")
const dataset = candidates.length === 1 ? candidates[0] : undefined
if (!dataset) throw new Error("Select a dataset by Worker and Source version")

// Round 2: export and analyze.
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

const response = await client.fetch({ url: "https://example.com/feed.xml" }, { workerId })
const sources = await client.actions.source.list({}, { workerId })
const board = await client.actions.board.create({ name: "Reading" }, { workerId })
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
// Round 1: resolve the name to a unique ID.
const matches = (await client.actions.board.list()).filter(board => board.name === "AI")
const board = matches.length === 1 ? matches[0] : undefined
if (!board) throw new Error("Expected one AI Board; select a Board ID")
const boardId = board.id

// Round 2 (same script): update returns the updated Board; assert on it.
// No follow-up query is needed: every mutation returns the affected entity.
const updated = await client.actions.board.update({ boardId, color: "blue" })
if (updated.color !== "blue") throw new Error("Board color verification failed")
console.log({ boardId, name: updated.name, color: updated.color })
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
