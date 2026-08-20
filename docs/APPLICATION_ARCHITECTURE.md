# Application Architecture

Status: active architecture. The Collection/Instance data model, Board/LiveCard
projections, shared Application Actions and Queries, and v1 import migration
are implemented. Native Agent read/write adapters and operation discovery are
implemented. Frontend and Agent writes share the background mutation runtime.

## Purpose

NewsNext treats humans and agents as first-class application users. Both operate
the same application data through the same actions. They may use different
presentations, but neither presentation owns business rules or writes storage
directly.

The architecture separates three concerns:

```text
Data                     Actions                    Views

Source                   Queries                    Human view
Instance                 Commands                   Agent view
Collection               Validation
Collection entry         Browser capabilities
Result and item
```

The central rule is:

> Humans and agents operate Collections and Instances. Humans see Collections
> as Boards and Instances as LiveCards.

Isomorphism belongs to the Data and Actions layers. It does not require human
and agent views to use the same representation.

## Conceptual Model

The Data and human View layers have corresponding relationships:

```text
Data layer

Collection ---- contains ----> Instance
    |                            |
    | project                    | project
    v                            v

Human View layer

Board -------- displays -------> LiveCard
```

The canonical correspondences are:

| Data concept | Human View | Meaning |
| --- | --- | --- |
| Source | Source picker item | A capability that can create configured Instances |
| Instance | LiveCard | A configured Source and its runtime state |
| Collection | Board | An organization of Instances |
| Collection entry | LiveCard placement | An Instance's membership and position in a Collection |
| Result item | Item view | Content returned by an Instance |

Board and LiveCard are not separate copies of Collection and Instance data. They
are projections that retain stable references to their underlying Data
identities.

## Data Layer

### Source

A Source defines reusable behavior, parameters, metadata, and capabilities. It
does not represent something the user has already configured.

```ts
interface Source {
  id: string
  capabilities: SourceCapabilities
  metadata: SourceMetadata
  parameters: ParameterDefinition[]
}
```

Instantiating a Source creates an Instance:

```text
Source ---- instantiate ----> Instance
```

### Instance

An Instance is a configured Source. Its identity and configuration remain
independent of every View that presents it.

```ts
interface Instance {
  createdAt: number
  instanceId: string
  patch: SourceInstancePatch
  sourceId: string
}
```

An Instance must not store a Board identifier. Board is a View concept, and an
Instance may belong to multiple Collections.

### Collection

A Collection organizes Instances. Membership is modeled explicitly instead of
placing a single collection or board identifier on an Instance.

```ts
interface Collection {
  createdAt: number
  id: string
  name: string
}

interface CollectionEntry {
  addedAt: number
  collectionId: string
  instanceId: string
  position: number
}
```

This model allows an Instance to appear in multiple Collections. Removing an
Instance from one Collection does not delete the Instance or remove it from
other Collections.

Manual position belongs to a Collection entry when it expresses the curated
order of the Collection. Sorting that only changes a presentation belongs to
View preferences instead.

### Results and Items

Source results and returned items belong to the Instance that produced them,
not to a LiveCard component.

```ts
interface InstanceResult {
  instanceId: string
  items: NewsItem[]
  status: InstanceResultStatus
  updatedAt: number
}
```

LiveCards project this state for human presentation. Agent queries may consume the
same state in a structured form without constructing LiveCard components.

`instanceId` is the stable application reference, while Source execution and
storage resolve it to the Instance's `sourceId` and normalized effective
parameters. Cache and History share that resolved target:

```text
instanceId -> sourceId + normalized params
                        +-- current result in Cache
                        +-- observations in History
```

Now Layer owns the interactive request lifecycle for current results through
independent Instance queries. Next Layer does not read that browser Query cache.
Its future Widgets read persisted results produced through the CLI and daemon by
Agent-owned refresh and processing tasks. They do not subscribe to the Now
Layer's per-Instance query path or pass result data through React state owned by
a LiveCard.

The proposed processing model for recurring Runs, retained Observations,
incremental changes, time windows, and materialized outputs is defined in
[Data Stream Architecture](DATA_STREAM_ARCHITECTURE.md).

Now Layer and Next Layer are two Views of one Board, not separate Data
containers. A persisted `defaultLayer` preference selects which View opens with
each custom Board. Switching Views changes presentation only and preserves the
Board, Collection, Instances, Cache entries, and History observations.

## View Layer

### Board

A Board is the human presentation of a Collection. Board appearance and
presentation preferences are keyed by the Collection identity rather than
being embedded in the Collection's membership model.

```ts
interface CollectionViewPreferences {
  collectionId: string
  color: Color
  defaultLayer: "now" | "next"
  sort: BoardSort
}

interface BoardView {
  liveCards: LiveCardView[]
  collectionId: string
  color: Color
  defaultLayer: "now" | "next"
  name: string
  sort: BoardSort
}
```

A normal Board has no independent domain identity: its stable identity is the
underlying `collectionId`. System views such as All may project a Collection
query rather than require a persisted aggregate Collection.

### LiveCard

A LiveCard is the human presentation of an Instance in a Collection context.

```ts
interface LiveCardView {
  collectionId: string | null
  instanceId: string
  items: NewsItemView[]
  sourceId: string
  status: LiveCardStatusView
  title: string
}
```

A LiveCard has no independent domain identity. The complete reference for a LiveCard
placement is the pair of `collectionId` and `instanceId`:

```ts
interface LiveCardViewReference {
  collectionId: string
  instanceId: string
}
```

The pair matters because the same Instance can be displayed in multiple
Boards. Instance-level actions need only `instanceId`; membership-level actions
also need `collectionId`.

### View State

Durable presentation preferences may include Board color, default layer, and
sorting. Ephemeral View state includes the current route, open dialog, focus,
selection, hover state, animation state, LiveCard face, and unsubmitted form
drafts.

Neither durable nor ephemeral View state may become an alternative owner of
Instance or Collection business rules.

## Actions Layer

The application exposes one typed execution boundary:

```ts
interface NewsNextApplication {
  execute<Action extends NewsNextAction>(
    action: Action,
  ): Promise<ActionResult<Action>>

  query<Query extends NewsNextQuery>(
    query: Query,
  ): Promise<QueryResult<Query>>
}
```

React, agents, the CLI, and future automation are adapters to this boundary.
They must not maintain parallel implementations of validation, defaults,
cascading updates, persistence, or browser side effects.

### Canonical Actions

The current persistent Actions distinguish Data intent from durable View
configuration:

```text
instance.create
instance.configure
instance.delete
instance.resetParams

collection.create
collection.delete
collection.rename
collection.update
collection.addInstance
collection.removeInstance
collection.reorderInstances

view.configureCollection
```

`collection.rename` changes only canonical Data. `view.configureCollection`
changes only Board color, default layer, or sort mode. `collection.create` accepts an
optional nested View configuration and an optional list of configured Instances,
then persists the Collection, View, Instances, and memberships in one operation.
This is the atomic boundary used by bulk imports such as creating a Board from
OPML. `collection.update` atomically combines an optional name change
with an optional nested View change when one human intent spans both layers.
`collection.reorderInstances` atomically records the complete manual order and
selects manual View sorting.

For example, adding a LiveCard to a Board and an agent adding an Instance to a
Collection both execute the same action:

```ts
collection.addInstance({
  collectionId: board.collectionId,
  instanceId: liveCard.instanceId,
})
```

Removing a LiveCard from one Board executes `collection.removeInstance`. Deleting
the underlying configured Instance executes `instance.delete` and removes all
of its Collection entries. `collection.delete` preserves Instances by default;
setting `deleteInstances` deletes each Instance used only by that Collection,
which also removes it from All. Shared Instances remain in their other
Collections.

Application-level composite actions capture common atomic intent. Creating a
Collection with `instances` configures every Source Instance and creates its
Collection entry in the same operation:

```ts
collection.create({
  name: "Subscriptions",
  instances: [
    { sourceId: "rss:feed", patch: { params: { url: feedUrl } } },
  ],
})
```

Consumers must not be required to reproduce that orchestration themselves.

### View Actions

Durable presentation changes remain distinct from Data Actions:

```text
view.configureCollection
```

A human interaction that changes Data and durable View state together uses one
atomic composite Action with View fields nested explicitly. Consumers must not
sequence persistent Actions to reproduce that intent. Route navigation, focus,
dialogs, and hover remain ephemeral UI state until a product feature requires
them to cross an adapter boundary.

### Queries

Data queries expose the canonical application state:

```text
source.get
source.list
instance.get
instance.list
collection.get
collection.list
collection.listInstances
```

View queries expose presentation context when an agent needs to resolve human
references such as "this LiveCard" or "the current Board":

```text
view.getContext
view.getCollection
view.getVisibleLiveCards
```

Every View reference returned by these queries must include the corresponding
Collection and Instance identities.

`view.getVisibleLiveCards` means LiveCards logically displayed by the current Board,
not only mounted DOM nodes inside the viewport. NewsNext does not currently
have cross-adapter selection or focus semantics, so the query contract does not
invent them.

## Human and Agent Adapters

### Human adapter

React renders Board and LiveCard projections. Clicks, forms, drag operations, and
shortcuts dispatch Actions with the Collection and Instance identities carried
by those projections.

Jotai owns ephemeral View state, exposes read-only Application Data
subscriptions, and provides thin asynchronous dispatch adapters. Persistent
domain mutations execute in the background runtime; frontend atoms cannot
replace Application Data directly.

### Agent adapter

Agents consume structured Source, Instance, and Collection queries. The Native
Messaging adapter exposes `action list`, `action execute`, `query list`, and
`query execute`; Actions and Queries are discovered with descriptions and JSON
schemas and validated before execution. When a task refers to the visible
interface, agents may additionally query View context instead of inferring
identity from screenshots or duplicating UI logic.

Agent tools and CLI commands are generated or adapted from one Action catalog.
They are transports and presentations, not separate application services.

## Action Catalog

The typed Action union and executor define application semantics. The Action
catalog is keyed exhaustively by that union and adds each stable name's input
and output schemas, description, and runtime parser:

```ts
parseApplicationAction({
  type: "collection.addInstance",
  input: { collectionId, instanceId },
})
```

React dispatches the typed Action directly. Untrusted Agent and CLI input passes
through the catalog parser, then reaches the same executor. Catalog discovery
supports agent tools, CLI commands, debugging, and future generated adapters
without duplicating business semantics.

Actions describe application intent. Generic storage patches, atom updates,
button clicks, dialog submissions, and drag events are not canonical Actions.

## Ownership and Lifecycle Rules

- Removing a Collection entry does not delete its Instance.
- Deleting an Instance removes every Collection entry that references it and
  cleans up Instance-owned runtime data according to the relevant retention
  policy.
- Deleting a Collection removes its entries but does not implicitly delete its
  Instances.
- A Board projection cannot be the owner of Collection membership.
- A LiveCard projection cannot be the owner of Instance configuration or results.
- View preferences cannot be required to interpret canonical Collection or
  Instance data.
- Every persistent mutation passes through the application execution boundary.
- Every human-visible business resource retains stable references to its
  underlying Data identities.

## Runtime Boundaries

The background application runtime owns persistent mutations and browser
capabilities. Repositories hide Browser Storage and IndexedDB layouts. The
frontend and Native Messaging connection both call the same runtime.

```text
React / Jotai ---------+
                      |
Agent / CLI transport +----> NewsNextApplication
                      |             |
Automation -----------+             +--> Repositories
                                    +--> Browser capabilities
```

Frontend code must not perform independent read-modify-write operations on
persistent arrays. Centralizing mutation is also necessary once multiple
extension pages, agents, and automation can act concurrently.

## Migration Status

The migration is proceeding incrementally:

1. Completed: define canonical Source, Instance, Collection, and
   CollectionEntry contracts.
2. Completed: add pure Board and LiveCard projections that retain Data identities.
3. Completed: introduce typed application Query and Action execution
   boundaries.
4. Completed: route existing Jotai write atoms through the Action boundary.
5. Completed for reads: route Native Messaging and CLI reads through the new
   Application Data model and projections.
6. Completed: replace `Instance.boardId` with explicit Collection entries.
7. Completed: separate persisted Board presentation preferences from
   Collection membership and manual entry positions.
8. Completed: expose Action and Query discovery and execution through Native
   Messaging and the CLI Agent adapter.
9. Completed: add an exhaustive Action catalog with runtime validation and JSON
   input/output schemas.
10. Completed: move frontend Action execution into the background-owned runtime
    so frontend and Agent writes share one serialized mutation queue.
11. Completed: expose current Board and logically visible LiveCard View queries with
    stable Collection and Instance identities.
12. Completed: remove the parallel Native/CLI Board and Instance listing
    commands; all application discovery now uses the canonical Query catalog.
13. Completed: route both frontend and Agent Source discovery through
    `source.list` and remove the parallel Registry/Native listing services.
14. Completed: make Board creation, editing, and manual ordering atomic while
    retaining explicit nested Data and View fields.
15. Completed: introduce the shared Instance data target used by persistent
    Cache reads and History queries, and remove the React-owned result handoff to
    Next Layer.
16. Completed: persist each custom Board's default Now or Next View in its
    Collection View preferences.

The architecture migration described by this document is complete. Future
features must extend the Data, Action, Query, and View contracts instead of
introducing parallel UI-only or Agent-only mutation paths.

The v2 user-data envelope persists Collections, Collection entries, Collection
Views, and Instances. Import accepts v1 exports and converts their Boards and
single `Instance.boardId` memberships at the boundary. Runtime storage does not
carry the legacy representation or compatibility branches. Import normalization
rejects empty identities and duplicate Collection names, discards invalid
memberships, and rebuilds each Collection's membership positions as a stable
contiguous sequence.
