# Application Architecture

Status: active architecture.

## Purpose

One application model shared by UI, agents, and CLI: a typed Action registry
(`mutation` | `query` | `command`) over a Workspace of Boards. Durable Boards,
LiveCards, and LiveWidgets are ID-keyed entities; Worker is a browser UI running
browser-owned Loaders.

## Package boundaries

- Contracts: `packages/sdk/src/actions.ts`, `packages/sdk/src/action/definition.ts`
  (kinds), `packages/sdk/src/action/application.ts` (Board/LiveCard/Widget params).
- Domain: `apps/extension/src/lib/application/data.ts` (envelope),
  `mutations.ts` (atomic writes), `queries.ts` (reads).
- Binding: `apps/extension/src/lib/background/application-actions.ts`
  (handlers; integrations arrive via factory args, never direct Native imports).
- Identity: `apps/extension/src/lib/id.ts` (16-char NanoIDs).
  Content fingerprints are domain-separated SHA-256 over canonical JSON,
  identifying equal content, not new entities.
- Widget host: `apps/extension/src/lib/widget-host.ts` (iframe protocol, sender checks).

## Data flow

- Writes: UI/SDK dispatches Action name + params → background validates via
  TypeBox → handler runs `context.mutate` atomically → storage subscription
  pushes the new Workspace to frontends (compact receipts on the transport).
- Reads: queries resolve against the mirrored Workspace; LiveCards render even
  when their Source left the registry (snapshot → generic card → routed refresh).
  Snapshots and query caches are disposable acceleration; clearing them never
  edits membership.
- Single ownership: LiveCard and LiveWidget bodies are ID-keyed records, while
  `nowLayer.liveCards` and `nextLayer.liveWidgets` contain only ordered ID arrays.
  Adding an owned entity transfers its ID; re-adding it to the same Board is
  idempotent.

## Sync and persistence

- Browser storage is the durable owner; the CLI daemon (optional) coordinates an
  in-memory Workspace and routes loads to the bound Worker.
- Join conflicts (overwrite / merge / discard) pause sync until resolved in CLI
  Settings; mutations are rejected while a decision is pending.
- Schema: application data version 12, export version 8. Only the current
  ID-keyed shape is accepted; mismatched versions throw instead of silently
  initializing empty data. Native Workspace and CLI use the same keyed shape
  under protocol version 35. Daemon DB schema 15.

## Host internals overview

- LiveCard loads route opaquely (local direct, remote via daemon); the viewing
  browser never persists another Worker's result.
- Widget data (`liveWidgets.data`) runs the manifest/JS pipeline with a
  one-minute request-protection cache; views poll, the daemon never schedules.
- Widget iframes talk over `MessagePort` → runtime port → Native Messaging
  (`__sdk` dispatcher); each pull releases one frame; abort/unmount tears down
  the SDK child process. Custom-view message contracts live in
  [Widget Guideline](WIDGET_GUIDELINE.md#content-protocol); the host owns title,
  palette, layout, and details.
- Widget catalog arrives via `ready` + `widgetCatalogChanged`; background caches
  it and revalidates before render, emitting via `nativeIntegration.statusChanged`.

## Further reading

- [Source Architecture](SOURCE_ARCHITECTURE.md) — execution, caching, transport.
- [Data Stream Architecture](DATA_STREAM_ARCHITECTURE.md) — analytical target.
- [Widget Guideline](WIDGET_GUIDELINE.md) — host/content contracts.
- [Design Guideline](DESIGN_GUIDELINE.md) / [Performance Guideline](PERFORMANCE_GUIDELINE.md) — shared UI and render rules.
