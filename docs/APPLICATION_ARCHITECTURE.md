# Application Architecture

Status: active architecture.

## Purpose

NewsNext exposes one application model to the human UI, agents, the CLI, and
future automation. These consumers may present the model differently, but they
share one typed Action registry, validation, and background persistence runtime.
Each Action declares whether it is a `mutation`, `query`, or `command`.

The central model has four product-level concepts:

| Concept | Responsibility |
| --- | --- |
| Workspace | Owns the shared Board and LiveCard collections |
| Board | Owns membership and its Now and Next Layers |
| Layer | Presents or materializes a Board's data |
| Worker | Provides a browser UI and runs browser-owned Loaders |

A browser extension is one Worker. LiveCards are canonical Workspace data and
persist their owning `workerId`. New LiveCards record the Worker that created
them, and ownership moves only through explicit takeover. The owner selects the
account, permissions, credentials, and session used by the LiveCard's Loader;
it is not a fifth global navigation concept.

The CLI daemon is optional. When present, it coordinates and broadcasts an
in-memory Workspace and routes a LiveCard load to its bound Worker without
exposing Worker identity to application code. Each browser persists the
Workspace's last-update time. The first browser connected after daemon startup
supplies the initial baseline. Later registrations never replace an existing
Workspace, regardless of timestamps. The joining browser compares its local data
with the shared snapshot before writing either side. An unchanged previously
synced mirror adopts the shared snapshot; differing new or locally edited
snapshots pause synchronization for an explicit decision in CLI Settings:

- **Overwrite shared data:** replace shared Boards, LiveCards, Widgets, and
  settings with local data through a revision-checked commit.
- **Merge both:** union entity IDs, retaining shared fields, settings, and Board
  ownership on conflicts. Append local-only membership and Widget instances;
  Widget card scopes remain restricted to their resulting Board. Instances of
  the same Widget definition remain distinct.
- **Discard local data:** adopt the shared Workspace without committing changes
  to it.

Pending decisions retain local browser storage across disconnects and background
restarts. Shared notifications update only the pending shared snapshot. The
resolution Action requires the displayed shared revision; stale choices must be
reviewed again. Before applying any choice, the browser saves both snapshots at
`newsnext-workspace-resolution-backup`. The last successful synchronization time
is persisted separately from offline changes. Mutations are rejected during
initial synchronization and pending decisions, preventing unintended writes and
circular waits between the application mutation and Workspace mirror queues.

Browser storage remains the durable owner. Without the CLI, the extension reads
its local Workspace and runs locally owned Loaders directly.

## Identity

New Board, LiveCard, Worker, request, transfer, and History dataset IDs use
16-character Nano IDs from `A-Z`, `a-z`, and `0-9`. The extension's `lib/id.ts`
and CLI's `identity.rs` own generation. LiveCard IDs no longer embed Source IDs;
use the separate `sourceId` field. Existing IDs remain opaque and valid without
rewriting persisted references. Widget IDs remain authored manifest identifiers.

Content fingerprints and derived keys use domain-separated SHA-256 over canonical
JSON (sorted object keys, preserved array order), encoded as 64 lowercase hex
characters. They identify equal content/configuration, not new entities. Source,
revision, and Widget fingerprints use separate domains.

## Persistent Application Data

Each browser mirrors the complete Workspace in one versioned envelope:

```ts
interface ApplicationData {
  version: 8
  boards: Board[]
  liveCards: LiveCard[]
}
```

The background application repository applies acknowledged daemon commits to
`browser.storage.local`. Frontend atoms are read-only mirrors plus thin Mutation
Action dispatchers. Every Board reference resolves against the mirrored
Workspace LiveCard collection.

Application data writes version 8, with `liveCards`, `cardId`, `cardIds`,
`nextLayer.liveWidgets`, and explicit Widget scopes `{ type: "cards", cardIds }`.
Only application version 8 and export version 6 are accepted. Completed migrations
are not rerun; existing instance IDs remain opaque and are preserved verbatim.
New instances use 16-character Nano IDs. Unsupported versions or
malformed collection envelopes throw before initialization or storage writes;
only an absent storage key may initialize an empty Workspace. Never treat an
unrecognized persisted version as new-user data. When changing schemas in a live
development checkout, install migration readers before bumping the version:
background hot reload can otherwise run an intermediate incompatible build. The daemon keeps Workspace in memory
and receives the browser projection. New databases initialize schema 15; existing
databases must already use schema 15. Startup does not run legacy migrations,
search-index backfills, or table cleanup.

Single-Board ownership remains canonical. Persistence normalization
keeps the first Board in persisted Board order as the owner if malformed data
contains duplicates and removes duplicate Layer references. Actions and domain
mutations accept only the version 8 model.

### LiveCard

A LiveCard is a configured Source:

```ts
interface LiveCard {
  createdAt: number
  cardId: string
  patch: LiveCardPatch
  sourceId: string
  workerId: string
}
```

`createdAt` records when the LiveCard itself was created. It does not record
when the LiveCard joined its Board. A LiveCard belongs to exactly one Board;
the owning Board keeps that relationship in `cardIds`, so the LiveCard does
not duplicate a Board ID.

### Board

A Board is the persistent identity, membership container, and presentation
configuration:

```ts
interface Board {
  color: Color
  createdAt: number
  id: string
  name: string

  // Membership in recently-added-first order.
  cardIds: string[]

  defaultLayer: "now" | "next"
  nowLayer: {
    sort: NowLayerSort
  }
  nextLayer: {
    liveWidgets: LiveWidget[]
  }
}
```

There is no separate entry or view table. Membership, membership order, color,
and durable Layer settings belong directly to the Board.

`cardIds` has two responsibilities:

1. It identifies the LiveCards that belong to the Board.
2. Its order is the canonical `addedAt` order, from most recently added to least
   recently added.

NewsNext does not persist an `addedAt` timestamp. Adding an unassigned LiveCard
places its ID at the front. Adding a LiveCard already owned by another Board
transfers it, removing it from the previous Board and related Layer references.
Moving a LiveCard to its current Board is idempotent and does not reorder it.

`createdAt` and membership order are deliberately different. Moving an old
LiveCard into a new Board makes it recently added in that Board but
does not change the LiveCard's creation time.

### NowLayer ordering

Sorting is a NowLayer concern because NextLayer does not present the same
interactive card order:

```ts
type NowLayerAutomaticSortMode = "addedAt" | "provider"
type NowLayerSortMode = NowLayerAutomaticSortMode | "manual"

interface NowLayerSort {
  mode: NowLayerSortMode
  automaticMode: NowLayerAutomaticSortMode
  manualOrder: string[]
}
```

`addedAt` is the default and reads `board.cardIds` directly. Provider
sorting derives a presentation order without changing membership order.
Dragging selects `manual` mode and writes the complete membership permutation
to `manualOrder`; it does not rewrite `cardIds`.

New memberships are also inserted at the front of `manualOrder`, so returning
to manual mode never loses a newly added card. `automaticMode` remembers which
automatic ordering manual mode should use to reconcile an incomplete manual
order.

## Source Results and Registry Independence

A LiveCard is durable application data. A registry descriptor is only the
currently available executable definition of its Source. Removing a Source
from a new registry must not remove, hide, or reorder its LiveCards.

Successful loads include items and a serializable Source presentation snapshot.
The owning Worker's protected Loader persists the result by Source ID, version,
and normalized parameters. The App restores it through opaque LiveCard routing:
local reads go directly to the background; remote reads relay through the daemon.
The viewing browser does not persist another Worker's result. See
[Source request lifecycle](SOURCE_ARCHITECTURE.md#source-request-lifecycle).

NowLayer resolves a card in this order:

1. use the Source snapshot restored into the LiveCard's TanStack query;
2. otherwise construct a minimal generic presentation from `sourceId`;
3. replace either presentation in place when a routed load returns a newer
   Source snapshot.

Neither path lists or waits for registry descriptors. Every LiveCard renders a
card and may request refresh through its router; a Loader that can no longer
resolve the Source returns an ordinary execution error while the last snapshot
remains readable. Cards can always be selected, reordered, moved between
Boards, or deleted.

The persisted result and in-memory Query cache provide disposable acceleration
and presentation continuity; neither owns membership. Clearing them may reduce
an unavailable card to the generic presentation, but cannot remove the LiveCard
from Application Data.

## Layers and Widgets

The product entities are LiveCard and LiveWidget. Both use the shared CardShell
primitives in `components/card-shell`; content/data adapters retain their own
loading, refresh, configuration, and Board mutation semantics. CardShell is not
another persistent entity. Shared item rendering lets a LiveWidget display the
standard list content without becoming a LiveCard.

A Widget definition remains identified by its directory's `widgetId`. A LiveWidget
is an independent instance with a globally unique `liveWidgetId`. Multiple instances
may reference the same definition, including within one Board. Installation creates
a new instance and returns its ID; configuration, removal, layout and movement
Actions address `liveWidgetId` within its owning Board. Moving preserves identity,
settings and dimensions. Definitions remain exclusively in the filesystem.
Native protocol 29 requires instance IDs and rejects duplicate ownership.
React keys, drag identifiers and iframe data messages carry instance identity;
data computation and cache identity continue to use the definition and its inputs,
so equal inputs can share results across instances.

`client.liveCards.data({ cardId })` delegates to `liveCard.load`, returning the
existing SourceLoadResponse including normalized content, timestamps, resolved
parameters, and protection status. It uses the owning Worker's load/cache path;
it does not introduce a Card Data table. Missing cards and unavailable Workers
fail through that existing router. `liveCard.readCache` remains the explicit
cache-only operation.


NowLayer and NextLayer are views of one Board. `defaultLayer` persists the active
preference; switching views does not change membership or trigger collection.
Both share the root scroll container with restoration keyed by Board and Layer.

NowLayer owns LiveCards and LiveCard-scoped queries. NextLayer owns the Board's
`nextLayer.liveWidgets`: each entry has `liveWidgetId`, `widgetId`, grid `layout` (`x`, `y`, `width`,
`height`), `dataScope` (the whole Board or selected `cardIds`), and optional
`patch.params`, `patch.metadata`, and `patch.view` overrides. Metadata uses shared `CardMetadata`: optional `title`, `badge`, `desc`, `home`, and `color`,
using the same title and named palette contract as Source definitions. Widget
layout persistence encodes order as `x: 0`, `y: orderIndex`, alongside dimensions.
The React grid derives positions with ordered packing and uses the shared
Pragmatic Drag and Drop infrastructure for live insertion previews. Widget drag
data is scoped separately from LiveCard dragging; there is no grid-library
position cache or collision engine.

Both Layers share `DndContext` for drag scope, drop-target registration, and
axis-specific auto-scrolling. Scroll targets accept only drags from their owning
context. `isDropWithin` requires both the registered target and an in-bounds
pointer for sorting and trash drops. Shared card header rules, native previews,
and placeholder styling keep feedback consistent; each Layer retains its own
layout and persistence logic.

Widget catalog discovery isolates invalid or unfinished directories: `/widgets`
returns valid renderable definitions and logs each rejected manifest with its
Widget ID and validation error. A rejected definition still fails when queried
directly. Old local manifests must remove `id`, `entry`, and `data.entry` when
these match the directory name, `index.html`, and `data.mjs`; the loader continues
to enforce the current schema rather than silently accepting obsolete fields.

Local Widget files and `widget.json` live in the CLI's Widget directory. Each
Widget's directory name is its ID; the manifest has no configurable `id`. The
manifest declares named data queries and a refresh policy. The daemon reads retained LiveCard history and caches on-demand computation
results in Turso. Widgets do not create background schedules. Widget refreshes do not execute
Sources. A Snapshot atomically stores
all query results, manifest/scope fingerprints, and a refresh timestamp.

Widget data and view are independent contracts. `data.queries` declares named
queries; an optional `data.mjs` beside `widget.json` is discovered automatically.
Its default async function receives `{ queries, params, widgetId, boardId, signal, clientOptions }`. Queries execute
first; the JS function returns the final named results, for example
`{ feed: { items: [...] }, stats: { count: 42 } }`. Item arrays are adapted to
`{ items: [{ value: NewsItem }] }`, matching LiveCard query results. Non-item JSON
is preserved for other consumers. `latest` queries support a case-insensitive
`keyword` substring filter on titles before sorting and limiting. History scope
uses each LiveCard's Worker and Source with resolved parameters from collection
bindings (or exact explicit parameters when no binding exists). Each URL keeps its newest retained value across Source versions before keyword
filtering. Historical items need not still appear
in the latest Source response. Publication timestamps are preserved. History search uses `history_search_items`,
a transactional projection with one
latest retained row per dataset and URL, a normalized title, and normalized
publication time. Retention updates it in the same transaction, ignoring older
observations.
SQL resolves latest versions, applies literal substring matching and publication
windows, deduplicates, orders, and limits results before decoding JSON in Rust.
Window sorts carry lightweight columns; full JSON is joined only for the final page.
Widget history queries execute on blocking worker threads with a shared two-query
semaphore; queued work waits asynchronously instead of occupying daemon event
threads. This isolates database computation from IPC processing.
On the development history copy with 12 datasets, eight keyword searches took
266–330 ms each. An eight-card concurrent SDK check completed
all data requests in about 2.2 seconds while five status requests succeeded
(0.7–1.14 seconds including the local CLI launcher). These measurements are a
local baseline, not a latency guarantee.
The dataset and publication-time indexes narrow retrieval to retained search rows;
substring matching still scans titles within the selected datasets and is not
a full-text index. The daemon
filters logs at INFO before event construction so Turso instruction-level tracing
does not dominate history-query execution. `file` queries
remain an optional JSON import path, not the required data mechanism.

The CLI runs `data.mjs` in a fresh process in the Widget directory, preferring
Bun, then Deno, then Node.js 22+. For each runtime it searches PATH followed by
standard user and system installation directories. This also handles the minimal
PATH inherited by browser Native Messaging hosts. A script failure is returned
without rerunning it under another runtime. Modules can use native `fetch` or bundle/import
the SDK and construct a client with the supplied `clientOptions`, which select
the running CLI and its environment. Scripts are trusted local code, not browser
sandbox code. Execution is limited to 60 seconds (the supplied AbortSignal fires
at 55 seconds); result output is bounded to 16 MiB and diagnostics to 64 KiB.
stdout is reserved for JSON; console diagnostics use stderr. Failed runs retain
the previous cached data. Entrypoint paths and symlinks must stay within the
Widget directory; dependencies follow the JS runtime's normal module resolution.

`client.liveWidgets.data({ widgetId, cardIds?, params? })` executes this same data pipeline
directly through SDK/daemon IPC and returns `{ queries, refreshedAt, errors }`.
It requires neither a Board placement nor a view. With no LiveCard inputs,
JS-only data works without a connected browser. Declarative LiveCard queries use
the explicit `cardIds` supplied by this consumer. Direct calls use the persistent one-minute request protection cache, stored
without a Board placement ID. Calls after that window recompute the result. The daemon advertises `widgetData`.
Data loading ignores view, HTML, title, palette, and grid configuration;
only data/refresh/params fields and the presence of `data.mjs` participate in
this contract. Both loaders resolve conventional files through the same path
validation, rejecting files and symlinks outside the Widget directory. Script
presence participates in the data fingerprint, so adding or removing `data.mjs`
invalidates the previous definition.

The extension centralizes Widget data fetching in `useLiveWidgetData`. Its request
identity includes Widget, sorted LiveCard scope, manifest data fingerprint, and
resolved parameters. Changing these inputs aborts the obsolete request and clears
its displayed result. The daemon's persistent one-minute protection cache includes
parameter definitions and resolved values, so edited settings cannot reuse data
computed with different values. Identical defaults and explicit default values
share a cache entry. Refresh failures preserve prior data for the same inputs.
The hook calls `client.liveWidgets.data({ widgetId, cardIds, params }, { signal })`
through `@newsnext/sdk/extension`. The extension client uses a validated runtime
port and the existing Native Messaging SDK bridge. UI requests resolve manifest defaults and placement overrides and use the
direct-data cache. No background Widget scheduler runs while the view is closed.

LiveCard and Widget presentation share `CardShell`, `CardHeader`,
`CardBackContent`, `CardMetadataSettings`, `CardSettingsSection`, `CardBoardSelect`,
and `DeleteCardButton`. Only the visible
header receives the drag handle. The hidden flip face remains mounted and inert.
Widget metadata drafts preview the back title/theme; successful saves update the
placement, while cancellation restores saved values. Removing from the back uses
the same confirmation interaction as LiveCards and removes only the placement.

Optional top-level `widget.json.params` uses the shared Source parameter schema.
The manifest parser validates definitions with `validateSourceParamDefinitions`.
The Widget back reuses `ParameterSettings`, `ParamField`, and `useSourceParams`
with LiveCards. `nextLayer.setLiveWidgetParams` replaces one Board placement's
persisted overrides; `{}` resets defaults. `nextLayer.setLiveWidgetMetadata` separately
replaces the shared Title, Color, Badge, Description, and Home overrides. The shell resolves metadata over manifest defaults
without changing data cache identity; an empty title falls back to the definition. Import/export normalization preserves
them. Parameters are sent to custom iframe `newsnext.widget.data` messages and
`data.mjs` as `context.params`. The daemon resolves defaults and checks value
types, numeric bounds, and select membership before invoking author code; the
shared editor also applies required/format/regex validation. Declarative queries
remain literal; scripts can use parameters to filter or transform their results.

Optional `view: { type: "live-card", query: "feed" }` selects the extension's
built-in renderer, sharing `LiveCardItems` with NowLayer. Automatic timeline/list
selection and explicit `presentation: "list" | "ranking"` reuse the Source
presentation contract. Custom views use the fixed `index.html` file and may declare
`view: { type: "custom" }`. An omitted view selects custom UI when `index.html`
exists; without that file it defines data only and is
excluded from the renderable manifest list. Built-in views validate the complete
NewsItem contract, accept empty arrays, and cap aggregates at 500 items.

For placed views, initial load, manual refresh, and visible polling use the same
query/JS execution pipeline and request protection cache. Overlapping requests
with the same inputs are serialized. The view's data scope supplies the LiveCard
inputs; SDK requests can compute data independently of any mounted view.
`refresh.intervalMs` controls visible polling, not daemon scheduling.
Placed views call `liveWidgets.data`; there is no separate placed Snapshot Action
or Native Messaging request. Cache identity depends on Widget definition,
resolved inputs, and parameters, independent of Board placement.
The loopback HTTP server serves assets and presentation metadata, not
an unauthenticated endpoint that executes local JavaScript. NextLayer does not
observe NowLayer's query cache. The host owns title, palette, refresh state,
layout, and the details back, including local data entry filenames.

Widgets can also import `createClient` from `@newsnext/sdk/widget` and actively
query history, fetch through the browser, execute Sources, and invoke every typed
Action. Browser-aware bundlers select this same entry for `@newsnext/sdk`.
Declarative queries and other SDK calls are independent: placement `dataScope` limits
materialized query inputs, not SDK access. Installed local Widgets therefore have
full SDK access, including mutations outside their Board.

The iframe transfers a MessagePort to its parent for each SDK request. The host
checks the sending window against the mounted iframe and forwards the stream over
an extension runtime port. The background accepts these ports only from the
extension app. Native Messaging carries requests, pull signals, cancellation,
and response frames; the native host runs its own executable's existing `__sdk`
dispatcher. It advertises the additive `sdk` capability and supplies its Worker
when the request does not select one. Widget clients inherit the host environment;
they cannot choose an executable or IPC endpoint.

Each pull releases one frame, preserving history export streaming and avoiding
unbounded buffering. Abort, iterator return, document pagehide, iframe unmount,
and port disconnection release the request and terminate its SDK child process.
Timeouts cover waiting for a response, not time spent consuming yielded data.
The host delivers data to the iframe through the Widget view ready/data messages.

Generic transformation graphs, transitive provenance, replay, and a complete
Widget preview/maintenance workflow remain target scope in the [PRD](PRD.md) and
[Data Stream Architecture](DATA_STREAM_ARCHITECTURE.md).

Widget host message validation and error framing live in the extension at
`src/lib/widget-host.ts`. Widget authors use `@newsnext/sdk/widget`; host-side
helpers are not SDK exports.

## Action Registry

Every stable capability exposed to the UI, agents, or CLI is an Action.
`@newsnext/sdk/actions` owns each Action's name, kind, description, TypeBox
parameter and result schemas, and optional validation.
The extension binds its handler to the SDK contract with its local `defineAction`
and supplies diagnostic projections alongside the handler. Action execution and
registry helpers are internal; consumers use the unified `actionContracts` export.
Its keys are derived from each contract's `name`, preserving the corresponding
parameter and result types. Duplicate names fail during catalog construction.
TypeBox schemas supply static types, runtime validation, and the JSON Schema
returned by `action.list`; there is no parallel descriptor or parser catalog.

```ts
const createBoard = defineAction(
  actionContracts["board.create"],
  async (params, context: ApplicationActionContext) => {
    await context.requireSources((params.liveCards ?? []).map(card => card.sourceId))
    const result = await context.mutate((data, dependencies) => (
      createBoardMutation(data, params, dependencies)
    ))
    if (!result.boardId) throw new Error("Board creation returned no Board ID")
    return { boardId: result.boardId }
  },
)
```

The three kinds have distinct contracts:

- `mutation` atomically changes canonical Application Data;
- `query` reads canonical data or discoverable Source descriptors without a
  persistent side effect;
- `command` asks the browser runtime to perform an environment-dependent
  operation.

UI mechanics such as opening dialogs, flipping cards, focus, scrolling, and
form drafts are not registered Actions. Agents operate those surfaces through
general browser control when needed.

The UI uses a type-safe client inferred from the shared SDK contracts:

```ts
await actions.board.create({ name: "Research" })
await actions.board.update({ boardId, color: "blue" })
const sources = await actions.source.list()
```

The client sends only the canonical Action name and parameters to the
background. It never imports a handler or browser-owned dependency. The
background Registry validates parameters, invokes the registered handler, and
validates its result. All registered Actions are available through both UI and
CLI clients, including `source.cancel`, `radar.resolveSuggestions`,
`application.replace`, and connection settings. Invocation origin is recorded
for diagnostics, not used as an availability filter. Browser-dependent Actions
still require their normal browser context and parameters.

Background services receive environment integrations through factory
arguments. In particular, the Action service must not import the Native
Messaging integration: that integration also consumes the shared Action
context, so a reverse runtime import would create a cycle whose initialization
order depends on the bundler. Action contexts and services must be constructed
from the background entrypoint after their modules have initialized.

The UI proxy service remains available while the optional App integration
initializes. Operations that require Native Messaging wait for an active
connection attempt to receive the host's validated `ready` message before they
send. This readiness boundary applies equally to queries and Workspace commits;
unrelated UI Actions remain available during the handshake. A disconnect or
bounded connection timeout rejects all pending connection waiters.

### Mutations

Persistent writes enter one typed execution boundary. Discover the complete
catalog with `action list`; definitions live in
`apps/extension/src/lib/background/application-actions.ts`.

`board.create` and `board.update` accept Board fields directly, including
`color`, `defaultLayer`, and `sortMode`. Bulk creation may include configured
LiveCards and persists the Board, LiveCards, and ownership atomically.
`liveCard.create` requires one scalar `boardId`.

`liveCard.move` atomically transfers an existing LiveCard to its target Board;
there is no standalone membership-removal Action because that would
leave the LiveCard without an owner.
`liveCard.delete` removes the LiveCard from its Board. Deleting a
Board requires exactly one policy: delete its LiveCards, or transfer them to
another Board.

`nowLayer.setManualOrder` requires every Board LiveCard exactly once and
selects manual mode atomically. NextLayer mutations install/remove Widgets,
change their data scope, and save layouts through `nextLayer.installLiveWidget`,
`nextLayer.removeLiveWidget`, `nextLayer.setLiveWidgetDataScope`, and
`nextLayer.setLiveWidgetLayouts`, and `nextLayer.setLiveWidgetParams`.

### Queries

Source discovery, Board context, and LiveCard queries include:

`source.get/list`, `liveCard.get/list`, `board.get/list/listLiveCards`,
`board.getContext`, and `board.getConfiguration`.

`nowLayer.getLiveCards` returns every logical card in the requested Board in
Board membership order. It does not filter against the current registry
or mounted DOM nodes. Registry availability is a presentation and execution
state, not a LiveCard-existence condition.

### Commands

Browser-dependent operations include `developer.fetch`, `developer.runSource`,
and `source.load`. Developer operations investigate endpoints or validate Sources;
normal loads share the protected Loader. Debug request/response capture is opt-in.
See [CLI execution](SOURCE_ARCHITECTURE.md#cli-execution) for transport, permission,
and protocol boundaries. The SDK types expose every registered Action without a catalog request.

## Adapter Rules

- React, agents, and the CLI dispatch the same registered Actions for
  capabilities they share.
- Untrusted UI proxy and Native Messaging input is parsed by the Action's
  TypeBox parameter schema before its handler runs.
- Jotai may own ephemeral route, dialog, focus, selection, drag, animation, and
  form-draft state; it does not own persistent domain mutations.
- Mutation transports return compact receipts. Updated Application Data reaches
  each frontend through its background storage subscription. When App
  integration is enabled, the originating Action produces a candidate
  Workspace, the connection layer commits changed Board and LiveCard entities,
  their ID order, and an opaque portable Settings snapshot; peer Workers apply
  the same versioned patch.
  Queries and Commands return their declared outputs directly.
- Browser credentials, permissions, Source execution, and persisted current
  results remain browser-owned. Durable History and daemon lifecycle remain
  App-owned.

## Stream inspection

The Devtool joins scheduler stream IDs to Workspace LiveCards for names and
parameter overrides; absent LiveCards and unknown observation counts remain
explicit. Counts represent retained fetch snapshots, including unchanged results,
with dataset/timestamp replays deduplicated.

Presentation belongs to [Design Guideline](DESIGN_GUIDELINE.md#stream-diagnostics),
the wire contract to [Source Architecture](SOURCE_ARCHITECTURE.md#stream-collection-diagnostics),
and subscription performance to [Performance Guideline](PERFORMANCE_GUIDELINE.md#development-diagnostics-subscriptions).


`nextLayer.moveLiveWidget` atomically transfers the placement to another Board,
preserving metadata, params, and dimensions and appending it to the destination
layout. Other instances of the same definition may coexist there. Whole-Board
scopes follow the destination Board; explicit LiveCard scopes retain only IDs
belonging to it, without moving LiveCards. Both card types use `CardBoardSelect`
with pending/error handling; these data-scope rules belong to the Widget adapter.


Preset chart Widgets use the same shell, visibility gating and data hook as
custom and LiveCard views. `WidgetChartContent` validates the selected named
`{ rows }` result; `widget-chart-options` maps observations to ECharts options.
ECharts and the word-cloud plugin load in a separate lazy module. Instances
survive data and view updates, resize with `ResizeObserver`, reapply resolved
RGB theme tokens when ancestor theme classes change, and dispose on unmount.
The view never fetches data. Source-style placement `patch` contains independent
`params`, `metadata`, and `view` sections. `configureLiveWidget` merges sparse
fields and removes a section when its value is null. Existing replacement
Actions write the same sections. The Rust wire reader and export normalization
migrate legacy top-level params/metadata once on read. Data fingerprints exclude
all view/metadata settings. The SDK chart option parser is shared by catalog
validation, persisted view normalization and patch validation; malformed query
rows produce an inline state rather than being coerced to zero.
