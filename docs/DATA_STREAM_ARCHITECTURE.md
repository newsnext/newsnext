# Data Stream Architecture

Status: proposed architecture. This document defines the target processing
model for turning recurring Source results into reusable, durable data products.
It does not imply that every type, pipeline, task, or materialization described
below is implemented.

This document complements [Application Architecture](APPLICATION_ARCHITECTURE.md),
which owns application identities and action boundaries, and
[Source Architecture](SOURCE_ARCHITECTURE.md), which owns Source resolution and
browser execution. The product requirements and delivery order remain in
[PRD](PRD.md).

## Purpose

NewsNext does more than fetch current data. A configured Instance can run
repeatedly, producing observations that become more useful when they can be
compared, accumulated, combined, and transformed over time.

For example, an Instance that runs once per minute can produce sixty results in
an hour. Treating those results as sixty unrelated arrays wastes their temporal
structure. NewsNext should instead turn them into a sequence of execution facts,
content observations, changes, rolling state, window aggregates, and derived
results.

The processing model borrows the useful semantics of reactive stream systems:

- transform values;
- compare adjacent values;
- maintain incremental state;
- group values into time windows;
- combine several inputs;
- suppress redundant work;
- represent success and failure as explicit lifecycle outcomes.

NewsNext does not require an Observable framework or a global event bus to gain
those properties. Durable streams must survive browser suspension, daemon
restart, and UI closure, so their authority is persisted state, versioned tasks,
and replayable transformations rather than in-memory subscriptions.

## Design Goals

1. Execute an identical Source target once and allow many consumers to reuse the
   result.
2. Preserve an Instance as a stable user-visible stream even when execution is
   shared with another Instance.
3. Record enough execution information to measure health without storing the
   same content repeatedly.
4. Convert snapshots into changes and incremental state before repeatedly
   scanning complete history.
5. Let one observation feed Now Layer, History, Agents, and multiple Next Layer
   Widgets.
6. Make every derived result traceable to its input observations, operator
   versions, and coverage limitations.
7. Support deterministic replay when an operator changes, without fetching past
   web data again.
8. Keep browser credentials and Source secrets inside the extension boundary.

## Non-Goals

- Replacing TanStack Query, Jotai, Dexie, or Turso with a custom Observable
  implementation.
- Treating UI events or component state as canonical stream events.
- Keeping a permanently running subscription graph in an MV3 background
  context.
- Writing Now Layer refreshes to durable History without an explicit retention
  or task policy.
- Sending browser credentials, cookies, Source secrets, or unrestricted raw
  responses through Native Messaging.
- Guaranteeing continuous knowledge between polls. NewsNext observes samples;
  it must not claim to know changes that occurred and disappeared between them.

## Core Model

The stream model separates product identity, execution identity, observations,
and consumers:

```text
Source definition
       |
       +-- configured as --> Instance stream
       |                         |
       |                         +--> Widget dependency
       |                         +--> Agent task dependency
       |                         +--> Board membership
       |
       +-- sourceId + version + normalized params --> Execution target
                                                     |
                                                     +--> Run
                                                           |
                                                           +--> Observation
                                                                  |
                                                                  +--> Change
                                                                  +--> Aggregate
                                                                  +--> Materialization
```

### Instance stream identity

`instanceId` is the stable application identity. It records what the user or an
Agent configured and allows that stream to participate in Collections, tasks,
and Widgets.

Two Instances with identical Source parameters remain distinct application
streams. They may have different owners, purposes, schedules, dependencies, and
lifecycles.

### Execution target identity

An execution target identifies equivalent Source work:

```text
sourceId + sourceVersion + normalized parameters
```

Equivalent targets may share request execution, cache entries, normalized
observations, and content revisions. Sharing execution must not merge their
Instance identities or provenance.

### Run

A Run is one attempt to execute a target. Every scheduled or manual attempt can
produce a Run record, including unchanged results and failures.

```ts
interface StreamRun {
  completedAt?: number
  contentHash?: string
  durationMs?: number
  executionKey: string
  itemCount?: number
  runId: string
  startedAt: number
  status: "running" | "success" | "failure" | "cancelled"
}
```

Run data supports scheduling, latency measurement, error inspection, and Source
health. A successful unchanged Run can reference an existing observation rather
than insert duplicate content.

### Observation

An Observation is a validated state seen at a particular time. It contains or
references normalized items, their order, response metadata, and the Source
version used to produce them.

```ts
interface StreamObservation {
  contentHash: string
  executionKey: string
  items: ObservedItemReference[]
  metadata?: unknown
  observationId: string
  observedAt: number
  sourceVersion: number
}
```

Observations describe sampled evidence. They do not imply that the observed
state remained unchanged before or after `observedAt`.

### Provenance

Execution sharing requires provenance to be modeled separately from observation
content:

```ts
interface ObservationUse {
  instanceId: string
  observationId: string
  reason: "manual" | "schedule" | "dependency"
  runId: string
  taskId?: string
}
```

Several Instance streams or tasks may reference one shared Run or Observation.
This preserves attribution without duplicating network requests or item data.

### Change

A Change is a deterministic comparison between two compatible observations:

```ts
interface ObservationChange {
  added: ObservedItem[]
  afterObservationId: string
  beforeObservationId: string
  missing: ObservedItem[]
  moved: ItemMovement[]
  updated: ItemUpdate[]
}
```

The existing History comparison model already provides the foundation for these
categories. A missing item is evidence that it was absent from one sample, not
necessarily proof that the underlying content was deleted.

### Materialization

A Materialization is a stored derived result that can be displayed or consumed
without rerunning its complete input pipeline.

```ts
interface Materialization<Value> {
  generatedAt: number
  inputCoverage: ObservationRange[]
  materializationId: string
  pipelineId: string
  pipelineVersion: number
  value: Value
}
```

Examples include an hourly trend summary, a cross-Source event cluster, a stream
health report, and a saved Next Layer Widget result.

## Processing Stages

NewsNext processes recurring data through distinct stages:

```text
Acquire
  -> Validate and normalize
  -> Identify items and revisions
  -> Record Run and Observation
  -> Compare observations
  -> Update incremental state
  -> Aggregate time windows
  -> Combine streams
  -> Materialize reusable output
  -> Serve Views and Agent queries
```

### Acquire

The extension executes Sources because it owns browser permissions, credentials,
cookies, and Source secrets. The daemon may request or schedule execution, but
it must not acquire those capabilities itself.

### Validate and normalize

Source output must cross the existing validation boundary before it can enter a
durable stream. Parameters, Source version, timestamps, item identity, semantic
fields, metadata, and ordering must be normalized consistently.

### Identify items and revisions

Stable item identity allows observations to reuse content. Content-addressed
revisions avoid storing the same item JSON for every poll while retaining real
updates.

Identity rules are Source-domain decisions. URL canonicalization must not merge
distinct resources merely because they appear similar, and cross-Source entity
matching must retain every original identity and confidence signal.

### Record execution separately from content

All relevant attempts may be retained as Runs. A new Observation is necessary
only when policy requires a sampled state and can reuse the previous content
when its hash is unchanged.

For sixty one-minute executions with twelve content changes, a compact result
may contain:

```text
60 Run records
12 new content states
deduplicated item revisions
11 adjacent changes
1 hourly materialization
```

The exact retention policy is task-owned. The model must not silently discard
evidence that a declared analysis requires.

### Compare adjacent observations

Most temporal analysis should consume changes instead of rescanning complete
snapshots. Adjacent comparison produces item arrivals, sampled absences, ranking
movement, and content updates.

Transient Source failures, incomplete responses, and unusually small results
must not be converted into mass disappearance events. Comparison requires a
successful, validated, and sufficiently complete observation or must carry an
explicit completeness warning.

### Maintain incremental state

Stateful operators update compact state for each item or entity:

```ts
interface ItemTemporalState {
  appearanceCount: number
  bestPosition: number
  consecutiveAppearances: number
  currentPosition?: number
  firstSeenAt: number
  lastSeenAt: number
  missingObservationCount: number
  totalPositionDelta: number
}
```

This state can derive persistence, velocity, volatility, freshness, and
momentum without loading all previous observations for every update.

### Aggregate time windows

Operators may aggregate fixed or rolling windows such as five minutes, one
hour, or one day. Every aggregate records:

- event-time range;
- included and excluded observations;
- successful and failed Run coverage;
- operator and schema versions;
- completeness warnings;
- generation time.

NewsNext normally uses observation time as event time. A NewsItem publication
time is content metadata and must not replace the time at which NewsNext
actually observed it.

### Combine streams

Next Layer pipelines may combine several Instance streams. Inputs must be
aligned by explicit time and freshness policies rather than assuming that
independently scheduled Sources were observed simultaneously.

Cross-stream processing may:

- canonicalize and correlate URLs;
- group related items while retaining original identities;
- compare ranking or attention across communities;
- detect confirmation by independent Sources;
- build an entity or event timeline;
- calculate cross-Source momentum;
- summarize a Board subject over a declared observation range.

### Materialize output

Expensive or Agent-owned processing writes a durable result before the user
opens Next Layer. A materialized Widget reads that result and its provenance; it
does not refetch inputs or repeat transformations during rendering.

Materializations can themselves become typed inputs to later pipelines. Their
lineage must remain transitive so a final result can be traced to original
observations.

## Operator Semantics

The architecture can borrow familiar reactive operator behavior without
exposing RxJS as the product contract:

| Reactive concept | NewsNext behavior |
| --- | --- |
| `map` | Normalize, enrich, classify, or score a value |
| `filter` | Remove values that do not satisfy a declared rule |
| `distinctUntilChanged` | Reuse content when a stable hash has not changed |
| `pairwise` | Compare compatible adjacent observations |
| `scan` | Incrementally maintain temporal or aggregate state |
| `window` | Group observations or changes by explicit time boundaries |
| `groupBy` | Partition by item, entity, topic, provider, or another typed key |
| `merge` | Combine independent events while preserving their provenance |
| `combineLatest` | Compute from the latest acceptable value of each dependency |
| `switchMap` | Cancel obsolete work when configuration changes |
| `concatMap` | Preserve order for work that must execute sequentially |
| `exhaustMap` | Prevent overlapping runs of the same scheduled target |
| `materialize` | Represent success, failure, cancellation, and timeout as data |
| `shareReplay(1)` | Reuse the current cached result for an execution target |

Operators should have typed inputs and outputs and deterministic behavior where
possible. An operator that invokes an external model, clock, or nondeterministic
service must record that dependency in provenance and must not pretend to be
replay-equivalent.

## Declarative Pipelines

A Pipeline is a versioned directed acyclic graph of inputs and operators. The
following syntax is illustrative, not a committed TypeScript API:

```ts
definePipeline({
  id: "developer-trends",
  version: 3,
  inputs: [
    instance("github-trending"),
    instance("hacker-news"),
    instance("reddit-programming"),
  ],
  operators: [
    canonicalizeUrls(),
    correlateRelatedItems(),
    rollingWindow("1h"),
    calculateMomentum(),
    summarize(),
  ],
  output: materializedWidget("developer-trends"),
})
```

Each persisted Pipeline node requires:

- a stable node and operator identity;
- an operator version;
- typed and schema-versioned input and output;
- deterministic configuration;
- an idempotency key;
- checkpoint state when incremental;
- failure and retry state;
- input coverage and provenance;
- an invalidation and replay policy.

Pipelines are data dependencies, not UI component trees. Deleting or moving a
Widget must not mutate unrelated Instance streams or erase shared observations.

## Two Processing Paths

### Current-result path

```text
Source -> latest cache -> Now Layer
```

This path favors low latency and replaceable current state. TanStack Query owns
the active request lifecycle, and the extension cache supplies the most recent
validated result. Viewing or refreshing Now Layer does not implicitly create
durable History.

### Durable-analysis path

```text
Agent task
  -> scheduled Run
  -> retained Observation
  -> incremental Pipeline
  -> Materialization
  -> Next Layer or Agent query
```

This path favors replay, provenance, cross-stream processing, and reliable
background maintenance. Opening Next Layer only reads stored inputs or outputs.

Both paths may share Source execution and normalized results. They differ in
retention intent and lifecycle ownership.

## Storage Model

The durable model should distinguish reusable facts from derived products.

### Facts

- execution targets;
- Runs and their health metadata;
- observations and ordered item membership;
- stable item identities and content revisions;
- Instance, task, and observation-use provenance;
- completeness and validation warnings.

### Derived products

- adjacent changes;
- item or entity temporal state;
- window aggregates;
- stream health summaries;
- cross-stream correlations;
- materialized Widget outputs;
- pipeline checkpoints and execution history.

Derived products must be reproducible from retained inputs when their operators
are deterministic. Reproducible products may be compacted and rebuilt;
irreplaceable observations require explicit retention policy.

## Efficiency Principles

### Execute once, fan out

Equivalent targets share in-flight execution and stored content. One result may
feed the latest cache, History, several pipelines, and many Widgets.

### Compute on change

Use content hashes and revisions to avoid repeating content work. Health
processing still consumes every relevant Run; content processing advances only
when its required input changes.

### Process deltas incrementally

Update compact operator state from new changes instead of scanning all raw
observations for every output refresh.

### Materialize expensive results

Persist expensive cross-stream, Agent, or model-assisted results. Rendering a
Widget must remain a read operation.

### Cache by content and version

An operator output cache key should include the operator version,
configuration, and input content identities. Identical deterministic work can
then be reused safely across consumers.

### Compact without destroying meaning

Retention may keep detailed recent changes, longer-lived window aggregates, and
selected durable observations. Compaction must preserve the evidence required
by declared tasks and must expose reduced coverage to consumers.

## Reliability and Correctness

### Idempotency

Retries must not insert duplicate Runs, observations, changes, or
materializations. Stable request, input, and output identities should make
every commit idempotent.

### Atomic commits

For Agent-owned work, task state, retained input references, pipeline output,
provenance, and the next eligible schedule should commit atomically where the
workflow requires them to agree.

### Cancellation and overlap

Configuration changes cancel obsolete interactive work. Scheduled executions
of the same target normally do not overlap. Cancellation is recorded separately
from failure.

### Failure isolation

A failed Source, operator, or Widget produces local health state and does not
prevent unrelated streams or Widgets from updating.

### Completeness

Empty, malformed, partial, stale, and failed results must remain distinguishable.
Analyses must propagate coverage warnings rather than silently treating missing
evidence as a real-world absence.

### Replay

Changing an operator creates a new operator or Pipeline version. The system can
replay retained compatible inputs into the new version while preserving old
materializations until replacement succeeds.

## Repository and Security Boundaries

The repositories continue to communicate only through the versioned Native
Messaging protocol.

The public extension repository owns:

- Source definitions and runtime execution;
- browser permissions and credentials;
- Source output validation and normalization;
- current-result request lifecycle and cache;
- public projections of versioned wire contracts.

The private App repository owns:

- durable scheduling and task lifecycle;
- Turso History and analytical state;
- pipeline checkpoints and materializations;
- cross-process orchestration;
- desktop and CLI access.

A protocol change must update the canonical Rust schema, protocol version,
generated TypeScript projections, validation, and tests together. Normal builds
must not write across repository boundaries.

## Example: One-Minute Ranking Stream

Consider a ranking Instance that returns fifty items every minute.

```text
12:00  [A, B, C, D]
12:01  [A, C, E, D]
12:02  [E, A, C, F]
```

Adjacent comparison produces:

```text
12:01
  B sampled as missing
  E appeared at position 3
  C moved from 3 to 2

12:02
  F appeared at position 4
  E moved from 3 to 1
  A moved from 1 to 2
  D sampled as missing
```

An hourly incremental aggregate can answer:

- how many unique items appeared;
- which items persisted across most successful observations;
- which rankings rose or fell fastest;
- which items were volatile or briefly sampled;
- how many Runs succeeded, failed, or returned unchanged content;
- whether response latency or item count became abnormal.

An item should not become definitively `disappeared` after one missing sample.
The Pipeline may require several consecutive compatible observations or a time
threshold, and its output must state that policy.

## Incremental Delivery

### Phase 1: identity and execution facts

- Define Run, execution target, observation identity, and provenance contracts.
- Add Instance and task attribution without preventing equivalent-target
  execution sharing.
- Record content hashes and explicit unchanged outcomes.

### Phase 2: incremental temporal processing

- Expose deterministic adjacent changes as stored or reproducible data.
- Introduce versioned temporal state and window aggregate primitives.
- Add completeness propagation and stream health summaries.

### Phase 3: Pipeline and materialization model

- Add typed Pipeline definitions, nodes, dependencies, checkpoints, and runs.
- Persist materialized results and transitive provenance.
- Expose Pipeline and materialization discovery through canonical application
  Queries and Actions.

### Phase 4: multi-stream Next Layer

- Let Widgets declare Instance and materialization dependencies.
- Reuse common deterministic nodes and identical input work.
- Add replay, operator upgrades, retention policy, and compaction controls.

## Architectural Requirements

1. Instance identity and execution identity remain distinct.
2. A current-result read does not imply durable retention.
3. Every retained derived result identifies its Pipeline version and input
   coverage.
4. Equivalent deterministic processing can be shared without losing consumer
   provenance.
5. Widget rendering performs no hidden Source execution or expensive
   transformation.
6. Source failures and incomplete samples do not become false content changes.
7. All durable scheduling and analytical state survive extension and UI
   lifecycles.
8. Credentials and secrets remain inside the browser-owned execution boundary.
9. Protocol changes remain explicit, generated, validated, and versioned across
   repositories.
10. Historical analysis describes observed samples and never overstates
    continuous real-world coverage.

## Summary

NewsNext treats recurring Source output as a durable sequence of evidence, not
as unrelated fetched arrays. Runs describe execution health, Observations
describe sampled states, Changes describe transitions, incremental operators
maintain temporal knowledge, and Materializations make expensive derived results
reusable.

This model captures the valuable processing semantics of reactive streams while
remaining compatible with MV3 lifecycle constraints, explicit History
retention, local-first storage, Agent-owned scheduling, and the extension/App
security boundary.
