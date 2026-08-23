# Application Architecture

Status: active architecture.

## Purpose

NewsNext exposes one application model to the human UI, agents, the CLI, and
future automation. These consumers may present the model differently, but they
share one typed Action registry, validation, and background persistence runtime.
Each Action declares whether it is a `mutation`, `query`, or `command`.

The central model is:

| Application data | Human presentation |
| --- | --- |
| Source | Source picker item |
| Instance | LiveCard |
| Board | Board navigation and Layers |
| Source result item | Item view |

Layers and LiveCards are human-facing projections. They do not own separate
copies of Board or Instance data.

## Persistent Application Data

Application Data uses one versioned envelope:

```ts
interface ApplicationData {
  version: 3
  boards: Board[]
  instances: Instance[]
}
```

The background application repository is the only writer of this envelope in
`browser.storage.local`. Frontend atoms are read-only mirrors plus thin Mutation
Action dispatchers.

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
when the Instance joined any Board. An Instance may belong to multiple
Boards and therefore must not store a single Board or Board ID.

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

NewsNext does not persist an `addedAt` timestamp. Adding a membership places its
Instance ID at the front. Adding an existing membership is idempotent and does
not move it. Removing a membership removes the ID from both membership order
and any manual NowLayer order.

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
automatic ordering manual mode should use to reconcile an incomplete legacy
or normalized manual order.

## Source Results and Registry Independence

An Instance is durable application data. A registry descriptor is only the
currently available executable definition of its Source. Removing a Source
from a new registry must not remove, hide, or reorder its Instances.

Every successful Source load returns both content and a serializable Source
presentation snapshot:

```ts
interface SourceLoadResult {
  items: NewsItem[]
  itemTemplate?: SourceItemTemplate
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

The background persists this complete result in IndexedDB by Source ID, version,
and normalized effective parameters. The App restores it into the page's
in-memory TanStack Query cache before rendering. Dynamic Loader metadata remains
part of each refreshed result and may change normally.

NowLayer resolves a card in this order:

1. use the current registry Source when available;
2. otherwise use the Source snapshot restored into TanStack Query for that
   Instance's parameters;
3. otherwise construct a minimal generic presentation from `sourceId`.

All three paths retain the Instance and render a card. A restored or generic card
whose Source is missing is explicitly unavailable and cannot refresh, but it
can still be selected, reordered, moved between Boards, or deleted. There is no
visible-subset reorder repair because unavailable cards participate directly in
the complete NowLayer order.

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

### Mutations

Persistent writes enter one typed execution boundary. Current canonical names
are:

```text
instance.create
instance.configure
instance.delete
instance.resetParams

board.create
board.delete
board.update
board.addInstance
board.removeInstance

nowLayer.setManualOrder
```

`board.create` and `board.update` accept Board fields directly, including
`color`, `defaultLayer`, and `sortMode`. Bulk creation may include configured
Instances and persists the Board, Instances, and memberships atomically.

`board.removeInstance` cannot remove an Instance's last membership.
`instance.delete` removes the Instance and every membership. Deleting a
Board requires exactly one policy: delete Instances exclusive to it, or
transfer its memberships to another Board without duplicating or moving
memberships already present in the target.

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

`nowLayer.getLiveCards` returns every logical card in the current Board in
Board membership order. It does not filter against the current registry
or mounted DOM nodes. Registry availability is a presentation and execution
state, not an Instance-existence condition.

### Commands

The connected-browser catalog currently exposes:

```text
app.open
developer.fetch
developer.runSource
source.load
```

`app.open` navigates the exact connected extension instance to a Board or opens
its Settings dialog on the CLI connection tab. Existing App tabs receive an
internal Settings intent and are focused without navigation or reload; the URL
intent is used only while creating a new App tab.
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
Native Host to the extension remain limited to 1 MiB.

## Adapter Rules

- React, agents, and the CLI dispatch the same registered Actions for
  capabilities they share.
- Untrusted UI proxy and Native Messaging input is parsed by the Action's
  TypeBox parameter schema before its handler runs.
- Jotai may own ephemeral route, dialog, focus, selection, drag, animation, and
  form-draft state; it does not own persistent domain mutations.
- Mutation transports return compact receipts. Updated Application Data reaches
  each frontend through its background storage subscription. Queries and
  Commands return their declared outputs directly.
- Browser credentials, permissions, Source execution, and persisted current
  results remain browser-owned. Durable History and daemon lifecycle remain
  App-owned.

These boundaries keep card existence stable even when executable Source
availability changes independently across registry releases.
