# Data Stream Architecture

Status: target analytical architecture built on existing collection, History,
and Widget Snapshots. Generic Pipelines, operator checkpoints, and transitive
provenance remain proposed; the names below are conceptual, not published APIs.

[Application Architecture](APPLICATION_ARCHITECTURE.md) owns Workspace identities,
Actions, and Widget lifecycle. [Source Architecture](SOURCE_ARCHITECTURE.md) owns
execution, caching, History boundaries, and transport. [PRD](PRD.md) owns product
priorities and acceptance criteria.

## Baseline and target

The daemon already collects Workspace LiveCards through adaptive automatic collection.
History retains observations by execution Worker, Source ID, version, normalized
parameters, and fetch time, reusing content-addressed item revisions. Unchanged
fresh fetches remain distinct observations; replaying the same dataset/timestamp
does not insert another. Local Widgets compute data on demand and reuse persisted request-protection caches.

The next analytical layer should reuse these facts to compare observations,
maintain incremental state, aggregate windows, combine streams, and materialize
results without repeatedly scanning all History or fetching solely for display.
Durability comes from versioned persisted state, not an in-memory Observable graph
or a permanently running extension service worker.

## Identities and evidence

| Concept | Responsibility |
| --- | --- |
| LiveCard | Stable user-configured stream and consumer identity; remains distinct even when execution is shared |
| Execution target | Worker ID + Source ID + Source version + normalized parameters |
| Run (proposed) | Attempt identity, start/completion, duration, outcome, error, and content reference |
| Observation | Validated sampled state, actual fetch time, ordered items, effective metadata, and Source version |
| Observation use (proposed) | Associates a LiveCard/task and retention reason with a Run or Observation |
| Change | Deterministic added, missing, moved, and updated facts between compatible observations |
| Materialization | Versioned derived output with generation time, input coverage, and lineage |

Execution and cache sharing are Worker-scoped because Workers have different
credentials, permissions, and sessions. Sharing a target must not merge LiveCard
ownership or erase consumer attribution. Item revisions may reuse content while
observations preserve each sample's time and ordering.

Stable item identity is Source-specific. URL canonicalization must not collapse
distinct resources, and cross-Source entity matching must retain original identities
and confidence. A missing item means absent from a sample, not proven deleted.

## Processing flow

```text
Browser Source execution
  -> validated, bounded, normalized result
  -> retained Observation and reusable item revisions
  -> compatible adjacent comparison
  -> incremental state / time windows / cross-stream combination
  -> versioned Materialization
  -> Widget or Agent read
```

The extension owns acquisition authority. The daemon schedules and persists
normalized results without receiving credentials. Foreground loading updates the
replaceable cache without directly writing History; automatic collection may
later retain that cached result at its original fetch time. Presentation never
becomes a second collection path.

A future Run ledger should record failures, cancellation, latency, and unchanged
outcomes independently of content processing. Content hashes suppress duplicate
transformation work, not evidence of successful repeated sampling. Compaction
requires an explicit retention policy and must preserve task-required coverage.

### Compare and accumulate

Compare only compatible, successful observations. Failed, malformed, partial,
or suspiciously small results must not silently become mass disappearance events.
Propagate completeness warnings; ranking movement is meaningful only for rankings.

Incremental state may retain first/last seen, appearance counts, consecutive
appearances, missing-sample counts, best/current position, and position deltas.
Update it from changes rather than rescanning all observations for every refresh.

### Window and combine

Fixed or rolling aggregates record their time range, included/excluded samples,
known run coverage, operator/schema versions, generation time, and warnings.
Use observation time for sampling windows; publication time remains item metadata.

Combine streams under explicit time-alignment and freshness policies. Independently
scheduled Sources are not simultaneous measurements. Correlation, reconciliation,
entity matching, and summaries retain every input identity; corrected values are
derived outputs and never rewrite original observations.

### Materialize

Persist expensive, agent-owned, or model-assisted work before a Widget reads it.
A materialized output may feed another Pipeline only with transitive lineage back
to the original observations. Current Widget Snapshots are a foundation for this;
they do not imply a general Pipeline or provenance implementation.

## Proposed Pipeline contract

A Pipeline is a versioned directed acyclic graph of typed inputs and operators.
It is independent of the UI component tree. Each persisted node needs:

- stable node/operator identity and version;
- schema-versioned inputs/outputs and deterministic configuration;
- input coverage and provenance;
- idempotency identity and incremental checkpoint state where applicable;
- failure/retry, invalidation, and replay policies.

Useful operators include mapping, filtering, content deduplication, adjacent
comparison, accumulation, windowing, grouping, merging, and latest-compatible-input
combination. Execution controls cancel obsolete work, preserve required ordering,
and prevent overlapping runs for the same scheduled target.

Deterministic output caches include operator version, configuration, and input
content identities. Operators using an external model, clock, or other
nondeterministic service must record that dependency and cannot claim identical
replay results.

## Persistence and correctness

Keep reusable facts (targets, attempts, observations, revisions, attribution,
coverage) distinct from derived state (changes, aggregates, correlations,
checkpoints, and materializations).

- Make retries idempotent at each commit boundary.
- Commit task state, input references, provenance, outputs, and next schedule
  atomically wherever correctness requires them to agree. Current collection
  commits History before policy state; a crash may repeat scheduling but cannot
  invent or delete an observation. Do not claim a cross-stage transaction exists.
- Isolate failed Sources/operators/Widgets and record cancellation separately.
- Version operator changes; replay compatible retained inputs while preserving
  old outputs until replacement succeeds.
- Compact reproducible derived state independently from irreplaceable evidence.
  Expose reduced coverage after retention or compaction.
- Keep credentials browser-owned. Protocol changes update canonical Rust types,
  generated TypeScript projections, validation, and compatibility handling together.

## Example

For a ranking sampled as `[A, B, C, D]`, then `[A, C, E, D]`, comparison reports
B missing, E added at position 3, and C moving from 3 to 2. It does not establish
that B was deleted. A downstream absence rule may require several compatible
samples or a time threshold and must expose that policy.

An hourly aggregate can report observed unique items, persistence, ranking
movement, sampled volatility, and known collection failures. It cannot recover
short-lived items that appeared and disappeared between polls.

## Remaining increments

1. Add durable Run and observation-use attribution around existing identities.
2. Add versioned incremental state and window aggregates with coverage propagation.
3. Add typed Pipeline dependencies, checkpoints, replay, and transitive provenance.
4. Reuse deterministic processing across Widgets; expose retention, compaction,
   operator upgrades, and analytical discovery through canonical operations.
