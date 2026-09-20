# Data Stream Architecture

Status: target analytical architecture on existing collection, History, and
Widget Snapshots. Pipeline/operator/provenance names are conceptual, not APIs.

[Application Architecture](APPLICATION_ARCHITECTURE.md) owns identities and
Actions; [Source Architecture](SOURCE_ARCHITECTURE.md) owns execution, caching,
History, and transport; [PRD](PRD.md) owns priorities.

## Baseline and target

- Today: daemon collects LiveCards on a fixed cadence; History retains
  observations per Worker + Source + version + params + fetch time; Widgets
  compute on demand with request-protection caches.
- Next: compare observations, keep incremental state, aggregate windows, combine
  streams, and materialize versioned outputs — durability from persisted state,
  not in-memory graphs.

## Flow

```text
Browser execution -> validated result -> retained Observation
  -> compatible comparison -> incremental state / windows / combination
  -> versioned Materialization -> Widget or Agent read
```

Rules: extension owns acquisition; foreground snapshots never write History
directly; compare only compatible successful observations; record run coverage,
warnings, and lineage; never rewrite original observations. Content hashes
suppress duplicate work, never evidence of sampling; compaction needs an
explicit retention policy preserving task-required coverage.

## Identities

LiveCard (consumer identity) stays distinct from the Worker-scoped execution
target (Worker + Source + version + params). Runs, observation uses, changes,
and materializations are proposed; item identity is Source-specific and a
missing item means absent, not deleted. Unchanged fresh fetches stay distinct
observations; replaying the same dataset/timestamp inserts nothing. The
time-aware estimator stays a scheduling backup. Collection commits History
before policy state, so a crash may repeat scheduling but never invent or
delete an observation. Rank deltas apply to rankings only; windows use
observation time while publication time stays item metadata.

## Remaining increments

1. Durable Run ledger + observation-use attribution.
2. Versioned incremental state and window aggregates with coverage.
3. Typed Pipeline dependencies, checkpoints, replay, transitive provenance.
4. Shared deterministic processing across Widgets with retention/compaction ops.
