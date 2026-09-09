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
| Workspace | Owns the shared Board and Instance collections |
| Board | Owns membership and its Now and Next Layers |
| Layer | Presents or materializes a Board's data |
| Worker | Provides a browser UI and runs browser-owned Loaders |

A browser extension is one Worker. Instances are canonical Workspace data and
persist their owning `workerId`. New Instances record the Worker that created
them, and ownership moves only through explicit takeover. The owner selects the
account, permissions, credentials, and session used by the Instance's Loader;
it is not a fifth global navigation concept.

The CLI daemon is optional. When present, it coordinates and broadcasts an
in-memory Workspace and routes an Instance load to its bound Worker without
exposing Worker identity to application code. Each browser persists the
Workspace's last-update time. The first browser connected after daemon startup
supplies the initial baseline. If a later browser has a newer snapshot, the
daemon adopts and broadcasts it, including persisted Instance ownership.
Browser storage remains the durable owner. Without the CLI, the extension reads
its local Workspace and runs locally owned Loaders directly.

## Identity

New Board, Instance, Worker, request, transfer, Job, and History dataset IDs use
16-character Nano IDs from `A-Z`, `a-z`, and `0-9`. The extension's `lib/id.ts`
and CLI's `identity.rs` own generation. Instance IDs no longer embed Source IDs;
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
  version: 6
  boards: Board[]
  instances: Instance[]
}
```

The background application repository applies acknowledged daemon commits to
`browser.storage.local`. Frontend atoms are read-only mirrors plus thin Mutation
Action dispatchers. Every Board reference resolves against the mirrored
Workspace Instance collection.

Version 6 makes single-Board ownership canonical. Persistence normalization
keeps the first Board in persisted Board order as the owner if malformed data
contains duplicates and removes duplicate Layer references. Actions and domain
mutations accept only the version 6 model.

### Instance

An Instance is a configured Source:

```ts
interface Instance {
  createdAt: number
  instanceId: string
  patch: InstancePatch
  sourceId: string
  workerId: string
}
```

`createdAt` records when the Instance itself was created. It does not record
when the Instance joined its Board. An Instance belongs to exactly one Board;
the owning Board keeps that relationship in `instanceIds`, so the Instance does
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
  instanceIds: string[]

  defaultLayer: "now" | "next"
  nowLayer: {
    sort: NowLayerSort
  }
  nextLayer: {
    widgets: NextLayerWidget[]
  }
}
```

There is no separate entry or view table. Membership, membership order, color,
and durable Layer settings belong directly to the Board.

`instanceIds` has two responsibilities:

1. It identifies the Instances that belong to the Board.
2. Its order is the canonical `addedAt` order, from most recently added to least
   recently added.

NewsNext does not persist an `addedAt` timestamp. Adding an unassigned Instance
places its ID at the front. Adding an Instance already owned by another Board
transfers it, removing it from the previous Board and related Layer references.
Moving an Instance to its current Board is idempotent and does not reorder it.

`createdAt` and membership order are deliberately different. Moving an old
Instance into a new Board makes it recently added in that Board but
does not change the Instance's creation time.

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

`addedAt` is the default and reads `board.instanceIds` directly. Provider
sorting derives a presentation order without changing membership order.
Dragging selects `manual` mode and writes the complete membership permutation
to `manualOrder`; it does not rewrite `instanceIds`.

New memberships are also inserted at the front of `manualOrder`, so returning
to manual mode never loses a newly added card. `automaticMode` remembers which
automatic ordering manual mode should use to reconcile an incomplete manual
order.

## Source Results and Registry Independence

An Instance is durable application data. A registry descriptor is only the
currently available executable definition of its Source. Removing a Source
from a new registry must not remove, hide, or reorder its Instances.

Successful loads include items and a serializable Source presentation snapshot.
The owning Worker's protected Loader persists the result by Source ID, version,
and normalized parameters. The App restores it through opaque Instance routing:
local reads go directly to the background; remote reads relay through the daemon.
The viewing browser does not persist another Worker's result. See
[Source request lifecycle](SOURCE_ARCHITECTURE.md#source-request-lifecycle).

NowLayer resolves a card in this order:

1. use the Source snapshot restored into the Instance's TanStack query;
2. otherwise construct a minimal generic presentation from `sourceId`;
3. replace either presentation in place when a routed load returns a newer
   Source snapshot.

Neither path lists or waits for registry descriptors. Every Instance renders a
card and may request refresh through its router; a Loader that can no longer
resolve the Source returns an ordinary execution error while the last snapshot
remains readable. Cards can always be selected, reordered, moved between
Boards, or deleted.

The persisted result and in-memory Query cache provide disposable acceleration
and presentation continuity; neither owns membership. Clearing them may reduce
an unavailable card to the generic presentation, but cannot remove the Instance
from Application Data.

## Layers and Widgets

NowLayer and NextLayer are views of one Board. `defaultLayer` persists the active
preference; switching views does not change membership or trigger collection.
Both share the root scroll container with restoration keyed by Board and Layer.

NowLayer owns LiveCards and Instance-scoped queries. NextLayer owns the Board's
`nextLayer.widgets`: each entry has `widgetId`, grid `layout` (`x`, `y`, `width`,
`height`), and `dataScope` (the whole Board or selected `instanceIds`). GridStack
is a presentation adapter, not the persistence model.

Local Widget files and `widget.json` live in the CLI's Widget directory. The
manifest declares named data queries and a refresh policy. The daemon reconciles
managed Jobs from the authenticated Board projection, collects through the bound
Workers, and persists revisioned Snapshots in Turso. A Snapshot atomically stores
all query results, manifest/scope fingerprints, and a refresh timestamp.

The host reads one Snapshot over Native Messaging for its Board, Widget, and
resolved Instance scope. It owns title, layout, refresh, and error state. The
sandboxed iframe announces readiness and renders the supplied data. The host
refresh button rereads the saved Snapshot. NextLayer does not observe NowLayer's
query cache. The loopback server serves only assets and presentation metadata.

Widgets can also import `createClient` from `@newsnext/sdk/widget` and actively
query history, fetch through the browser, execute Sources, and invoke every typed
Action. Browser-aware bundlers select this same entry for `@newsnext/sdk`.
Snapshot queries and SDK calls are independent: placement `dataScope` limits
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
Existing Snapshot ready/data messages remain unchanged.

Generic transformation graphs, transitive provenance, replay, and a complete
Widget preview/maintenance workflow remain target scope in the [PRD](PRD.md) and
[Data Stream Architecture](DATA_STREAM_ARCHITECTURE.md).

## Action Registry

Every stable capability exposed to the UI, agents, or CLI is an Action.
`@newsnext/sdk/actions` owns each Action's name, kind, description, TypeBox
parameter and result schemas, optional validation, and diagnostic projections.
The extension binds its handler to the SDK contract with `defineAction`.
TypeBox schemas supply static types, runtime validation, and the JSON Schema
returned by `action.list`; there is no parallel descriptor or parser catalog.

```ts
const createBoard = defineAction(
  applicationActionContracts["board.create"],
  async (params, context: ApplicationActionContext) => {
    await context.requireSources((params.instances ?? []).map(instance => instance.sourceId))
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
Instances and persists the Board, Instances, and ownership atomically.
`instance.create` requires one scalar `boardId`.

`instance.move` atomically transfers an existing Instance to its target Board;
there is no standalone membership-removal Action because that would
leave the Instance without an owner.
`instance.delete` removes the Instance from its Board. Deleting a
Board requires exactly one policy: delete its Instances, or transfer them to
another Board.

`nowLayer.setManualOrder` requires every Board Instance exactly once and
selects manual mode atomically. NextLayer mutations install/remove Widgets,
change their data scope, and save layouts through `nextLayer.installWidget`,
`nextLayer.removeWidget`, `nextLayer.setWidgetDataScope`, and
`nextLayer.setWidgetLayouts`.

### Queries

Source discovery, Board context, and Instance queries include:

`source.get/list`, `instance.get/list`, `board.get/list/listInstances`,
`board.getContext`, and `board.getConfiguration`.

`nowLayer.getLiveCards` returns every logical card in the requested Board in
Board membership order. It does not filter against the current registry
or mounted DOM nodes. Registry availability is a presentation and execution
state, not an Instance-existence condition.

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
  Workspace, the connection layer commits changed Board and Instance entities,
  their ID order, and an opaque portable Settings snapshot; peer Workers apply
  the same versioned patch.
  Queries and Commands return their declared outputs directly.
- Browser credentials, permissions, Source execution, and persisted current
  results remain browser-owned. Durable History and daemon lifecycle remain
  App-owned.

## Stream inspection

The Devtool joins scheduler stream IDs to Workspace Instances for names and
parameter overrides; absent Instances and unknown observation counts remain
explicit. Counts represent retained fetch snapshots, including unchanged results,
with dataset/timestamp replays deduplicated.

Presentation belongs to [Design Guideline](DESIGN_GUIDELINE.md#stream-diagnostics),
the wire contract to [Source Architecture](SOURCE_ARCHITECTURE.md#stream-collection-diagnostics),
and subscription performance to [Performance Guideline](PERFORMANCE_GUIDELINE.md#development-diagnostics-subscriptions).
