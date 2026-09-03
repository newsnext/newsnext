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

Every successful Source load returns both content and a serializable Source
presentation snapshot:

```ts
interface SourceLoadResult {
  items: NewsItem[]
  inlinePresentation?: string[]
  metadata?: SourcePresentationMetadata // dynamic Loader metadata
  source: {
    id: string
    version: number
    provider: SourceProvider
    metadata: SourcePresentationMetadata // static Source metadata
    params?: SourceParamSchemaMap
    capabilities: SourceCapabilities
  }
}
```

The daemon holds the session's canonical Workspace, including complete Instance
configuration and portable Settings, without storing it in the database. Each
browser persists a local copy. The daemon derives Instance routing directly
from each Instance's persisted `workerId`. The owning Loader
persists protection-cache responses by Source request identity. Before rendering,
the App restores results through the opaque Instance router: local bindings use
the current background directly and other bindings relay through the daemon.
The viewing browser never persists the relayed result. Dynamic Loader metadata
remains part of each refreshed result and may change normally.

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

## Layers

NowLayer and NextLayer are two views of one Board. They are not separate data
containers.

- NowLayer owns interactive LiveCards, Source queries, cached current results,
  and its ordering preferences.
- NextLayer reads future persisted outputs produced by daemon- and CLI-owned
  processing. It does not subscribe to NowLayer React query state.
- `defaultLayer` selects which layer opens; switching layers does not change
  Board membership, Instances, Query cache, or History.

## Action Registry

Every stable capability exposed to the UI, agents, or CLI is an Action. An
Action is defined once with `defineAction`: its name, kind, audiences,
description, TypeBox parameter and result schemas, optional validation and
diagnostic projections, and handler live together. TypeBox schemas are both
the runtime contract and the JSON Schema returned by `action.list`; there is no
parallel descriptor or hand-written parser catalog.

```ts
const createBoard = defineAction({
  name: "board.create",
  kind: "mutation",
  audiences: ["ui", "connected"],
  params: Type.Object({ name: Type.String({ minLength: 1 }) }),
  result: Type.Object({ boardId: Type.String() }),
}, async (params, context) => {
  return await context.mutate((data, dependencies) => (
    createBoardMutation(data, params, dependencies)
  ))
})
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

The UI uses a type-safe client inferred from the UI-visible definitions:

```ts
await actions.board.create({ name: "Research" })
await actions.board.update({ boardId, color: "blue" })
const sources = await actions.source.list()
```

The client sends only the canonical Action name and parameters to the
background. It never imports a handler or browser-owned dependency. The
background Registry validates parameters, invokes the registered handler, and
validates its result. `connected` audience filtering publishes only Actions
available to the local CLI; UI-only operations such as `source.cancel`,
`radar.resolveSuggestions`, `application.replace`, and CLI
connection settings remain absent from that catalog.

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

Persistent writes enter one typed execution boundary. Current canonical names
are:

```text
instance.create
instance.configure
instance.delete
instance.move
instance.resetParams

board.create
board.delete
board.update

nowLayer.setManualOrder
```

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
selects manual mode atomically.

### Queries

Canonical data and presentation-context queries are:

```text
source.get
source.list
instance.get
instance.list
board.get
board.list
board.listInstances
board.getContext
board.getConfiguration
nowLayer.getLiveCards
```

`nowLayer.getLiveCards` returns every logical card in the requested Board in
Board membership order. It does not filter against the current registry
or mounted DOM nodes. Registry availability is a presentation and execution
state, not an Instance-existence condition.

### Commands

The connected-browser catalog currently exposes:

```text
developer.fetch
developer.runSource
source.load
```

`developer.fetch` performs a one-shot browser-owned HTTP request for Source
authoring. `source.load` loads a registered Source through the shared
one-minute third-party API protection for background Jobs. The latest successful
result is persisted so protected requests can reuse it without calling the
third-party API again. `developer.runSource` executes a registered or supplied Source
outside that protected path for authoring and debugging. It returns
raw request and response diagnostics only when debug output is explicitly
enabled. Commands may
depend on browser permissions, credentials, network state, timeouts, or
cancellation and are not presented as deterministic Application Data changes.

Native Messaging framing follows Chromium's directional limits: messages from
the extension to the Native Host may be up to 64 MiB, while messages from the
Native Host to the extension remain limited to 1 MiB. The Native Host
transparently splits larger protocol messages into bounded UTF-8 chunks, and the
extension validates and reassembles them with a 64 MiB aggregate limit.

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

These boundaries keep card existence stable even when executable Source
availability changes independently across registry releases.
