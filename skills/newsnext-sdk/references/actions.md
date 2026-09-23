# Action catalog

Generated from `packages/sdk/src/action/*.ts`. Regenerate with
`bun packages/sdk/scripts/generate-actions-reference.ts` from the web
checkout after changing an action contract. Call actions as
`client.actions.<domain>.<method>(input, options)` inside `newsnext eval`;
the evaluated script receives a preconfigured `client` variable.
This catalog covers `client.actions.*` and background events; `status`,
`history.*`, `liveCards.data`, `liveWidgets.data`, `run`, and `fetch` are
documented in sdk.md.
`{…}` marks a TypeScript-only result shape: see the matching type in
`@newsnext/sdk` models.

## Conventions

- Mutations return the affected entity (a Board, LiveCard, or Widget
  placement): assert on the returned value instead of issuing a follow-up
  query. Deletes and removals return `{}`.
- Identifiers are opaque strings. Board names are not unique: resolve a
  name to an ID with `board.list` before mutating. `widgetId` names a
  Widget definition; `liveWidgetId` names one installed instance.
- LiveCard entries carry only patch overrides. The display title resolves
  as `patch.metadata.title ?? source.metadata.title ?? provider.title`; use
  `source.get` for the fallback.

## Index

| Action | Kind | Purpose |
| --- | --- | --- |
| `application.replace` | mutation | Replace all durable Application data after validating its integrity. |
| `board.create` | mutation | Create a Board and optional configured LiveCards. Returns the created Board so callers can verify without a follow-up query. |
| `board.delete` | mutation | Delete a Board and either delete or transfer its LiveCards and Live Widgets. |
| `board.get` | query | Get a Board with ordered entries and resolved LiveCards. |
| `board.list` | query | List Boards. |
| `board.listLiveCards` | query | List the LiveCards in a Board's Now Layer in display order. Entries carry only patch overrides; the display title resolves as patch.metadata.title ?? source.metadata.title ?? provider.title. |
| `board.listLiveWidgets` | query | List the Widget placements in a Board's Next Layer in display order. |
| `board.update` | mutation | Atomically update a Board. Returns the updated Board so callers can verify without a follow-up query. |
| `developer.fetch` | command | Fetch an HTTP(S) URL through the connected browser for Source development. |
| `developer.runSource` | command | Run a registered or supplied Source for development and debugging. |
| `liveCard.configure` | mutation | Merge configuration and presentation overrides into a LiveCard. Returns the updated LiveCard so callers can verify without a follow-up query. |
| `liveCard.create` | mutation | Create a configured LiveCard in one Board. Returns the created LiveCard so callers can verify without a follow-up query. |
| `liveCard.delete` | mutation | Delete a LiveCard from its Board. |
| `liveCard.get` | query | Get one configured LiveCard. The entry carries only patch overrides; the display title resolves as patch.metadata.title ?? source.metadata.title ?? provider.title. |
| `liveCard.list` | query | List configured LiveCards. Entries carry only patch overrides; the display title resolves as patch.metadata.title ?? source.metadata.title ?? provider.title. Use source.get for the fallback. |
| `liveCard.load` | query | Load a LiveCard through the Workspace router. |
| `liveCard.move` | mutation | Move an existing LiveCard to a Board. Returns the moved LiveCard. |
| `liveCard.readSnapshot` | query | Read a LiveCard's Source snapshot through the Workspace router. |
| `liveCard.resetMetadata` | mutation | Reset a LiveCard's presentation overrides while preserving its parameters. Returns the updated LiveCard. |
| `liveCard.resetParams` | mutation | Reset a LiveCard's parameters while preserving presentation overrides. Returns the updated LiveCard. |
| `liveWidget.configure` | mutation | Merge sparse overrides into a LiveWidget. Null resets a section to widget.json defaults. Returns the updated placement. |
| `liveWidget.create` | mutation | Create a configured LiveWidget in one Board's Next Layer. The placement prepends before existing Widgets; omitted size fields default to 2. Returns the created LiveWidget so callers can verify without a follow-up query. |
| `liveWidget.delete` | mutation | Remove a local Widget from a Board's Next Layer. |
| `liveWidget.get` | query | Get one configured LiveWidget. The entry carries only patch overrides; includes its Board ID. |
| `liveWidget.list` | query | List configured LiveWidgets across all Boards in Board order. Mirrors liveCard.list. |
| `liveWidget.move` | mutation | Move a Widget placement to another Board while preserving its settings and size. Returns the moved placement (with its new Board ID). |
| `liveWidget.resetMetadata` | mutation | Reset a LiveWidget's presentation overrides while preserving its parameters. Returns the updated LiveWidget. |
| `liveWidget.resetParams` | mutation | Reset a LiveWidget's parameters while preserving presentation overrides. Returns the updated LiveWidget. |
| `liveWidget.setLayouts` | mutation | Persist Widget sizes and order for a Board's Next Layer in display order. Returns the placements in display order. |
| `nativeIntegration.getLogs` | query | Get recent NewsNext CLI service logs. |
| `nativeIntegration.getStatus` | query | Get the local NewsNext CLI connection status. |
| `nativeIntegration.getWidgets` | query | List the renderable Widget definitions the daemon last published, including their entry URLs. |
| `nativeIntegration.regenerateIdentity` | mutation | Generate a new Worker identity and reconnect this browser. |
| `nativeIntegration.resolveWorkspace` | mutation | Resolve local and shared Workspace differences before synchronization. Overwrite replaces shared data, merge keeps shared conflicts, discard uses shared data. |
| `nativeIntegration.restart` | mutation | Restart the local NewsNext CLI service. The connection drops and reconnects automatically. |
| `nativeIntegration.setEnabled` | mutation | Enable or disable the local NewsNext CLI connection on this device. |
| `nativeIntegration.setLogLevel` | mutation | Set the NewsNext CLI service log level (off disables logging entirely). |
| `nativeIntegration.takeOver` | mutation | Reassign selected LiveCards from an offline Worker to this Worker. |
| `nextLayer.setManualOrder` | mutation | Set the complete manual Widget order for a Board's Next Layer. Returns the ordered widgets so callers can verify without a follow-up query. |
| `nowLayer.getLiveCards` | query | List the LiveCards in one Board's Now Layer. |
| `nowLayer.setManualOrder` | mutation | Set the complete manual LiveCard order for a Board's Now Layer. Returns the ordered cards so callers can verify without a follow-up query. |
| `radar.resolveSuggestions` | query | Resolve Source suggestions for the current browser page. |
| `source.cancel` | command | Cancel an active background Source load. |
| `source.get` | query | Get one available Source descriptor. |
| `source.list` | query | List Sources available for creating or resolving LiveCards. |
| `source.load` | command | Load one configured Source through the background runtime. |

### application.replace

*mutation* — Replace all durable Application data after validating its integrity.

```ts
await client.actions.application.replace(input: { boards: { color: "red" | "pink" | "fuchsia" | "purple" | "indigo" | "blue" | "cyan" | "teal" | "green" | "amber" | "orange" | "slate"; createdAt: number; layer: "now" | "next"; id: string; name: string; nowLayer: { liveCards: …[] }; nextLayer: { liveWidgets: …[] } }[]; version: number })
// => { boards: { color: "red" | "pink" | "fuchsia" | "purple" | "indigo" | "blue" | "cyan" | "teal" | "green" | "amber" | "orange" | "slate"; createdAt: number; layer: "now" | "next"; id: string; name: string; nowLayer: { liveCards: …[] }; nextLayer: { liveWidgets: …[] } }[]; version: number }
```

### board.create

*mutation* — Create a Board and optional configured LiveCards. Returns the created Board so callers can verify without a follow-up query.

```ts
await client.actions.board.create(input: { color?: "red" | "pink" | "fuchsia" | "purple" | "indigo" | "blue" | "cyan" | "teal" | "green" | "amber" | "orange" | "slate"; layer?: "now" | "next"; liveCards?: { patch: { metadata?: Record<string, …>; params?: Record<string, …> }; sourceId: string }[]; name: string })
// => { board: { color: "red" | "pink" | "fuchsia" | "purple" | "indigo" | "blue" | "cyan" | "teal" | "green" | "amber" | "orange" | "slate"; createdAt: number; layer: "now" | "next"; id: string; name: string; nowLayer: { liveCards: { cardId: …; createdAt: …; patch: …; sourceId: …; workerId: … }[] }; nextLayer: { liveWidgets: { dataScope: …; layout: …; liveWidgetId: …; patch?: …; widgetId: … }[] } }; boardId: string }
```

### board.delete

*mutation* — Delete a Board and either delete or transfer its LiveCards and Live Widgets.

```ts
await client.actions.board.delete(input: { boardId: string; deleteLiveCards: boolean } | { boardId: string; targetBoardId: string })
// => {}
```

### board.get

*query* — Get a Board with ordered entries and resolved LiveCards.

```ts
await client.actions.board.get(input: { boardId: string })
// => { color: "red" | "pink" | "fuchsia" | "purple" | "indigo" | "blue" | "cyan" | "teal" | "green" | "amber" | "orange" | "slate"; createdAt: number; layer: "now" | "next"; id: string; name: string; nowLayer: { liveCards: { cardId: string; createdAt: number; patch: { metadata?: …; params?: … }; sourceId: string; workerId: string }[] }; nextLayer: { liveWidgets: { dataScope: … | …; layout: { height: …; width: … }; liveWidgetId: string; patch?: { metadata?: …; params?: … }; widgetId: string }[] } }
```

- `input.boardId`: Board identifier. Board names are not unique: resolve with board.list first.

### board.list

*query* — List Boards.

```ts
await client.actions.board.list()
// => { color: "red" | "pink" | "fuchsia" | "purple" | "indigo" | "blue" | "cyan" | "teal" | "green" | "amber" | "orange" | "slate"; createdAt: number; layer: "now" | "next"; id: string; name: string; nowLayer: { liveCards: { cardId: …; createdAt: …; patch: …; sourceId: …; workerId: … }[] }; nextLayer: { liveWidgets: { dataScope: …; layout: …; liveWidgetId: …; patch?: …; widgetId: … }[] } }[]
```

### board.listLiveCards

*query* — List the LiveCards in a Board's Now Layer in display order. Entries carry only patch overrides; the display title resolves as patch.metadata.title ?? source.metadata.title ?? provider.title.

```ts
await client.actions.board.listLiveCards(input: { boardId: string })
// => { cardId: string; createdAt: number; patch: { metadata?: { badge?: string; desc?: string; home?: string; title?: string; type?: "list" | "ranking" }; params?: Record<string, unknown> }; sourceId: string; workerId: string }[]
```

- `input.boardId`: Board identifier. Board names are not unique: resolve with board.list first.

### board.listLiveWidgets

*query* — List the Widget placements in a Board's Next Layer in display order.

```ts
await client.actions.board.listLiveWidgets(input: { boardId: string })
// => { dataScope: { type: "board" } | { cardIds: …[]; type: "cards" }; layout: { height: integer ≥ 1 ≤ 100; width: integer ≥ 1 ≤ 12 }; liveWidgetId: string; patch?: { metadata?: { badge?: string; color?: "red" | "pink" | "fuchsia" | "purple" | "indigo" | "blue" | "cyan" | "teal" | "green" | "amber" | "orange" | "slate"; desc?: string; home?: string; title?: string }; params?: Record<string, unknown> }; widgetId: string }[]
```

- `input.boardId`: Board identifier. Board names are not unique: resolve with board.list first.

### board.update

*mutation* — Atomically update a Board. Returns the updated Board so callers can verify without a follow-up query.

```ts
await client.actions.board.update(input: { color?: "red" | "pink" | "fuchsia" | "purple" | "indigo" | "blue" | "cyan" | "teal" | "green" | "amber" | "orange" | "slate"; layer?: "now" | "next"; boardId: string; name?: string })
// => { color: "red" | "pink" | "fuchsia" | "purple" | "indigo" | "blue" | "cyan" | "teal" | "green" | "amber" | "orange" | "slate"; createdAt: number; layer: "now" | "next"; id: string; name: string; nowLayer: { liveCards: { cardId: string; createdAt: number; patch: { metadata?: …; params?: … }; sourceId: string; workerId: string }[] }; nextLayer: { liveWidgets: { dataScope: … | …; layout: { height: …; width: … }; liveWidgetId: string; patch?: { metadata?: …; params?: … }; widgetId: string }[] } }
```

- `input.boardId`: Board identifier. Board names are not unique: resolve with board.list first.

### developer.fetch

*command* — Fetch an HTTP(S) URL through the connected browser for Source development.

```ts
await client.actions.developer.fetch(input: { body?: string; headers: unknown[][]; method: string; timeoutMs: number; url: string; searchParams?: Record<string, string | number | boolean> | unknown[][]; json?: unknown; retry?: integer ≥ 0 ≤ 10; throwHttpErrors?: boolean; redirect?: "follow" | "manual" | "error"; credentials?: "include" | "omit" | "same-origin" })
// => { body: string; headers: unknown[][]; status: number; statusText: string; url: string }
```

### developer.runSource

*command* — Run a registered or supplied Source for development and debugging.

```ts
await client.actions.developer.runSource(input: { debug: boolean; params?: Record<string, unknown>; sourceId: string } | { debug: boolean; params?: Record<string, unknown>; provider: Record<string, unknown>; providerId: string; sourceId: string; useProviderSecrets?: boolean })
// => { data: unknown[]; execution: { durationMs: number; loadedAt: number; params: Record<string, unknown>; providerId: string; sourceId: string; sourceVersion: number }; fetches?: unknown[] }
```

### liveCard.configure

*mutation* — Merge configuration and presentation overrides into a LiveCard. Returns the updated LiveCard so callers can verify without a follow-up query.

```ts
await client.actions.liveCard.configure(input: { cardId: string; patch: { metadata?: Record<string, unknown>; params?: Record<string, unknown> } })
// => { cardId: string; createdAt: number; patch: { metadata?: { badge?: string; desc?: string; home?: string; title?: string; type?: "list" | "ranking" }; params?: Record<string, unknown> }; sourceId: string; workerId: string }
```

- `input.cardId`: LiveCard identifier.

### liveCard.create

*mutation* — Create a configured LiveCard in one Board. Returns the created LiveCard so callers can verify without a follow-up query.

```ts
await client.actions.liveCard.create(input: { boardId: string; patch: { metadata?: Record<string, unknown>; params?: Record<string, unknown> }; sourceId: string })
// => { cardId: string; liveCard: { cardId: string; createdAt: number; patch: { metadata?: { badge?: string; desc?: string; home?: string; title?: string; type?: "list" | "ranking" }; params?: Record<string, unknown> }; sourceId: string; workerId: string } }
```

- `input.boardId`: Board identifier. Board names are not unique: resolve with board.list first.
- `input.sourceId`: Qualified Source ID (e.g. "x:list").

### liveCard.delete

*mutation* — Delete a LiveCard from its Board.

```ts
await client.actions.liveCard.delete(input: { cardId: string })
// => {}
```

- `input.cardId`: LiveCard identifier.

### liveCard.get

*query* — Get one configured LiveCard. The entry carries only patch overrides; the display title resolves as patch.metadata.title ?? source.metadata.title ?? provider.title.

```ts
await client.actions.liveCard.get(input: { cardId: string })
// => { cardId: string; createdAt: number; patch: { metadata?: { badge?: string; desc?: string; home?: string; title?: string; type?: "list" | "ranking" }; params?: Record<string, unknown> }; sourceId: string; workerId: string }
```

- `input.cardId`: LiveCard identifier.

### liveCard.list

*query* — List configured LiveCards. Entries carry only patch overrides; the display title resolves as patch.metadata.title ?? source.metadata.title ?? provider.title. Use source.get for the fallback.

```ts
await client.actions.liveCard.list()
// => { cardId: string; createdAt: number; patch: { metadata?: { badge?: string; desc?: string; home?: string; title?: string; type?: "list" | "ranking" }; params?: Record<string, unknown> }; sourceId: string; workerId: string }[]
```

### liveCard.load

*query* — Load a LiveCard through the Workspace router.

```ts
await client.actions.liveCard.load(input: { cardId: string })
// => { fetchProtected: boolean; fetchedAt: number; loadedAt: number; params: Record<string, unknown>; result: {…} }
```

### liveCard.move

*mutation* — Move an existing LiveCard to a Board. Returns the moved LiveCard.

```ts
await client.actions.liveCard.move(input: { boardId: string; cardId: string })
// => { cardId: string; createdAt: number; patch: { metadata?: { badge?: string; desc?: string; home?: string; title?: string; type?: "list" | "ranking" }; params?: Record<string, unknown> }; sourceId: string; workerId: string }
```

- `input.boardId`: Board identifier. Board names are not unique: resolve with board.list first.
- `input.cardId`: LiveCard identifier.

### liveCard.readSnapshot

*query* — Read a LiveCard's Source snapshot through the Workspace router.

```ts
await client.actions.liveCard.readSnapshot(input: { cardId: string })
// => { fetchProtected: boolean; fetchedAt: number; loadedAt: number; params: Record<string, unknown>; result: {…} } | unknown
```

### liveCard.resetMetadata

*mutation* — Reset a LiveCard's presentation overrides while preserving its parameters. Returns the updated LiveCard.

```ts
await client.actions.liveCard.resetMetadata(input: { cardId: string })
// => { cardId: string; createdAt: number; patch: { metadata?: { badge?: string; desc?: string; home?: string; title?: string; type?: "list" | "ranking" }; params?: Record<string, unknown> }; sourceId: string; workerId: string }
```

- `input.cardId`: LiveCard identifier.

### liveCard.resetParams

*mutation* — Reset a LiveCard's parameters while preserving presentation overrides. Returns the updated LiveCard.

```ts
await client.actions.liveCard.resetParams(input: { cardId: string })
// => { cardId: string; createdAt: number; patch: { metadata?: { badge?: string; desc?: string; home?: string; title?: string; type?: "list" | "ranking" }; params?: Record<string, unknown> }; sourceId: string; workerId: string }
```

- `input.cardId`: LiveCard identifier.

### liveWidget.configure

*mutation* — Merge sparse overrides into a LiveWidget. Null resets a section to widget.json defaults. Returns the updated placement.

```ts
await client.actions.liveWidget.configure(input: { liveWidgetId: string; patch: { params?: unknown | Record<string, unknown>; metadata?: unknown | { title?: string; badge?: string; desc?: string; home?: string; color?: "red" | "pink" | "fuchsia" | "purple" | "indigo" | "blue" | "cyan" | "teal" | "green" | "amber" | "orange" | "slate" }; dataScope?: unknown | { type: … } | { cardIds: …; type: … } } })
// => { dataScope: { type: "board" } | { cardIds: string[]; type: "cards" }; layout: { height: integer ≥ 1 ≤ 100; width: integer ≥ 1 ≤ 12 }; liveWidgetId: string; patch?: { metadata?: { badge?: string; color?: "red" | "pink" | "fuchsia" | "purple" | "indigo" | "blue" | "cyan" | "teal" | "green" | "amber" | "orange" | "slate"; desc?: string; home?: string; title?: string }; params?: Record<string, unknown> }; widgetId: string; boardId: string }
```

- `input.liveWidgetId`: LiveWidget instance identifier, not the Widget definition ID.

### liveWidget.create

*mutation* — Create a configured LiveWidget in one Board's Next Layer. The placement prepends before existing Widgets; omitted size fields default to 2. Returns the created LiveWidget so callers can verify without a follow-up query.

```ts
await client.actions.liveWidget.create(input: { boardId: string; dataScope: { type: "board" } | { cardIds: string[]; type: "cards" }; size: { height?: integer ≥ 1 ≤ 100; width?: integer ≥ 1 ≤ 12 }; widgetId: string })
// => { liveWidget: { dataScope: { type: "board" } | { cardIds: …[]; type: "cards" }; layout: { height: integer ≥ 1 ≤ 100; width: integer ≥ 1 ≤ 12 }; liveWidgetId: string; patch?: { metadata?: { badge?: string; color?: "red" | "pink" | "fuchsia" | "purple" | "indigo" | "blue" | "cyan" | "teal" | "green" | "amber" | "orange" | "slate"; desc?: string; home?: string; title?: string }; params?: Record<string, unknown> }; widgetId: string; boardId: string }; liveWidgetId: string }
```

- `input.boardId`: Board identifier. Board names are not unique: resolve with board.list first.
- `input.widgetId`: Widget definition ID (e.g. "snake"); the running instance ID is liveWidgetId.

### liveWidget.delete

*mutation* — Remove a local Widget from a Board's Next Layer.

```ts
await client.actions.liveWidget.delete(input: { liveWidgetId: string })
// => {}
```

- `input.liveWidgetId`: LiveWidget instance identifier, not the Widget definition ID.

### liveWidget.get

*query* — Get one configured LiveWidget. The entry carries only patch overrides; includes its Board ID.

```ts
await client.actions.liveWidget.get(input: { liveWidgetId: string })
// => { dataScope: { type: "board" } | { cardIds: string[]; type: "cards" }; layout: { height: integer ≥ 1 ≤ 100; width: integer ≥ 1 ≤ 12 }; liveWidgetId: string; patch?: { metadata?: { badge?: string; color?: "red" | "pink" | "fuchsia" | "purple" | "indigo" | "blue" | "cyan" | "teal" | "green" | "amber" | "orange" | "slate"; desc?: string; home?: string; title?: string }; params?: Record<string, unknown> }; widgetId: string; boardId: string }
```

- `input.liveWidgetId`: LiveWidget instance identifier, not the Widget definition ID.

### liveWidget.list

*query* — List configured LiveWidgets across all Boards in Board order. Mirrors liveCard.list.

```ts
await client.actions.liveWidget.list()
// => { dataScope: { type: "board" } | { cardIds: …[]; type: "cards" }; layout: { height: integer ≥ 1 ≤ 100; width: integer ≥ 1 ≤ 12 }; liveWidgetId: string; patch?: { metadata?: { badge?: string; color?: "red" | "pink" | "fuchsia" | "purple" | "indigo" | "blue" | "cyan" | "teal" | "green" | "amber" | "orange" | "slate"; desc?: string; home?: string; title?: string }; params?: Record<string, unknown> }; widgetId: string; boardId: string }[]
```

### liveWidget.move

*mutation* — Move a Widget placement to another Board while preserving its settings and size. Returns the moved placement (with its new Board ID).

```ts
await client.actions.liveWidget.move(input: { boardId: string; liveWidgetId: string })
// => { dataScope: { type: "board" } | { cardIds: string[]; type: "cards" }; layout: { height: integer ≥ 1 ≤ 100; width: integer ≥ 1 ≤ 12 }; liveWidgetId: string; patch?: { metadata?: { badge?: string; color?: "red" | "pink" | "fuchsia" | "purple" | "indigo" | "blue" | "cyan" | "teal" | "green" | "amber" | "orange" | "slate"; desc?: string; home?: string; title?: string }; params?: Record<string, unknown> }; widgetId: string; boardId: string }
```

- `input.boardId`: Board identifier. Board names are not unique: resolve with board.list first.
- `input.liveWidgetId`: LiveWidget instance identifier, not the Widget definition ID.

### liveWidget.resetMetadata

*mutation* — Reset a LiveWidget's presentation overrides while preserving its parameters. Returns the updated LiveWidget.

```ts
await client.actions.liveWidget.resetMetadata(input: { liveWidgetId: string })
// => { dataScope: { type: "board" } | { cardIds: string[]; type: "cards" }; layout: { height: integer ≥ 1 ≤ 100; width: integer ≥ 1 ≤ 12 }; liveWidgetId: string; patch?: { metadata?: { badge?: string; color?: "red" | "pink" | "fuchsia" | "purple" | "indigo" | "blue" | "cyan" | "teal" | "green" | "amber" | "orange" | "slate"; desc?: string; home?: string; title?: string }; params?: Record<string, unknown> }; widgetId: string; boardId: string }
```

- `input.liveWidgetId`: LiveWidget instance identifier, not the Widget definition ID.

### liveWidget.resetParams

*mutation* — Reset a LiveWidget's parameters while preserving presentation overrides. Returns the updated LiveWidget.

```ts
await client.actions.liveWidget.resetParams(input: { liveWidgetId: string })
// => { dataScope: { type: "board" } | { cardIds: string[]; type: "cards" }; layout: { height: integer ≥ 1 ≤ 100; width: integer ≥ 1 ≤ 12 }; liveWidgetId: string; patch?: { metadata?: { badge?: string; color?: "red" | "pink" | "fuchsia" | "purple" | "indigo" | "blue" | "cyan" | "teal" | "green" | "amber" | "orange" | "slate"; desc?: string; home?: string; title?: string }; params?: Record<string, unknown> }; widgetId: string; boardId: string }
```

- `input.liveWidgetId`: LiveWidget instance identifier, not the Widget definition ID.

### liveWidget.setLayouts

*mutation* — Persist Widget sizes and order for a Board's Next Layer in display order. Returns the placements in display order.

```ts
await client.actions.liveWidget.setLayouts(input: { boardId: string; liveWidgets: { liveWidgetId: string; width: integer ≥ 1 ≤ 12; height: integer ≥ 1 ≤ 100 }[] })
// => { dataScope: { type: "board" } | { cardIds: …[]; type: "cards" }; layout: { height: integer ≥ 1 ≤ 100; width: integer ≥ 1 ≤ 12 }; liveWidgetId: string; patch?: { metadata?: { badge?: string; color?: "red" | "pink" | "fuchsia" | "purple" | "indigo" | "blue" | "cyan" | "teal" | "green" | "amber" | "orange" | "slate"; desc?: string; home?: string; title?: string }; params?: Record<string, unknown> }; widgetId: string; boardId: string }[]
```

- `input.boardId`: Board identifier. Board names are not unique: resolve with board.list first.

### nativeIntegration.getLogs

*query* — Get recent NewsNext CLI service logs.

```ts
await client.actions.nativeIntegration.getLogs()
// => { id: number; timestamp: string; level: "error" | "warn" | "info"; target: string; message: string }[]
```

### nativeIntegration.getStatus

*query* — Get the local NewsNext CLI connection status.

```ts
await client.actions.nativeIntegration.getStatus()
// => { workspaceConflict?: { revision: integer ≥ 0; local: { boards: integer ≥ 0; liveCards: integer ≥ 0; liveWidgets: integer ≥ 0 }; shared: { boards: integer ≥ 0; liveCards: integer ≥ 0; liveWidgets: integer ≥ 0 } }; daemonVersion?: string; capabilities: string[]; offlineWorkers: { id: string; cardIds: string[] }[]; connectionError?: { code?: string; message: string }; state: "disabled" | "connected" | "connecting" | "workspaceConflict" | "daemonOutdated" | "hostNotInstalled" | "protocolIncompatible" | "serviceNotRunning" | "daemonStartFailed" | "workerConflict"; workerId: string; widgetServerOrigin?: string }
```

### nativeIntegration.getWidgets

*query* — List the renderable Widget definitions the daemon last published, including their entry URLs.

```ts
await client.actions.nativeIntegration.getWidgets()
// => { id: string; title: string; color: string; width: integer ≥ 1; height: integer ≥ 1; minWidth: integer ≥ 1; minHeight: integer ≥ 1; url?: string; view: unknown; params: unknown; dataRevision: string; dataFiles: string[]; viewRevision?: string; hasData?: boolean; refreshIntervalMs: number }[]
```

### nativeIntegration.regenerateIdentity

*mutation* — Generate a new Worker identity and reconnect this browser.

```ts
await client.actions.nativeIntegration.regenerateIdentity()
// => { workspaceConflict?: { revision: integer ≥ 0; local: { boards: integer ≥ 0; liveCards: integer ≥ 0; liveWidgets: integer ≥ 0 }; shared: { boards: integer ≥ 0; liveCards: integer ≥ 0; liveWidgets: integer ≥ 0 } }; daemonVersion?: string; capabilities: string[]; offlineWorkers: { id: string; cardIds: string[] }[]; connectionError?: { code?: string; message: string }; state: "disabled" | "connected" | "connecting" | "workspaceConflict" | "daemonOutdated" | "hostNotInstalled" | "protocolIncompatible" | "serviceNotRunning" | "daemonStartFailed" | "workerConflict"; workerId: string; widgetServerOrigin?: string }
```

### nativeIntegration.resolveWorkspace

*mutation* — Resolve local and shared Workspace differences before synchronization. Overwrite replaces shared data, merge keeps shared conflicts, discard uses shared data.

```ts
await client.actions.nativeIntegration.resolveWorkspace(input: { resolution: "overwrite" | "merge" | "discard"; expectedRevision: integer ≥ 0 })
// => { workspaceConflict?: { revision: integer ≥ 0; local: { boards: integer ≥ 0; liveCards: integer ≥ 0; liveWidgets: integer ≥ 0 }; shared: { boards: integer ≥ 0; liveCards: integer ≥ 0; liveWidgets: integer ≥ 0 } }; daemonVersion?: string; capabilities: string[]; offlineWorkers: { id: string; cardIds: string[] }[]; connectionError?: { code?: string; message: string }; state: "disabled" | "connected" | "connecting" | "workspaceConflict" | "daemonOutdated" | "hostNotInstalled" | "protocolIncompatible" | "serviceNotRunning" | "daemonStartFailed" | "workerConflict"; workerId: string; widgetServerOrigin?: string }
```

### nativeIntegration.restart

*mutation* — Restart the local NewsNext CLI service. The connection drops and reconnects automatically.

```ts
await client.actions.nativeIntegration.restart()
// => {}
```

### nativeIntegration.setEnabled

*mutation* — Enable or disable the local NewsNext CLI connection on this device.

```ts
await client.actions.nativeIntegration.setEnabled(input: { enabled: boolean })
// => { workspaceConflict?: { revision: integer ≥ 0; local: { boards: integer ≥ 0; liveCards: integer ≥ 0; liveWidgets: integer ≥ 0 }; shared: { boards: integer ≥ 0; liveCards: integer ≥ 0; liveWidgets: integer ≥ 0 } }; daemonVersion?: string; capabilities: string[]; offlineWorkers: { id: string; cardIds: string[] }[]; connectionError?: { code?: string; message: string }; state: "disabled" | "connected" | "connecting" | "workspaceConflict" | "daemonOutdated" | "hostNotInstalled" | "protocolIncompatible" | "serviceNotRunning" | "daemonStartFailed" | "workerConflict"; workerId: string; widgetServerOrigin?: string }
```

### nativeIntegration.setLogLevel

*mutation* — Set the NewsNext CLI service log level (off disables logging entirely).

```ts
await client.actions.nativeIntegration.setLogLevel(input: { level: "off" | "error" | "warn" | "info" })
// => {}
```

### nativeIntegration.takeOver

*mutation* — Reassign selected LiveCards from an offline Worker to this Worker.

```ts
await client.actions.nativeIntegration.takeOver(input: { cardIds: string[]; workerId: string })
// => { workspaceConflict?: { revision: integer ≥ 0; local: { boards: integer ≥ 0; liveCards: integer ≥ 0; liveWidgets: integer ≥ 0 }; shared: { boards: integer ≥ 0; liveCards: integer ≥ 0; liveWidgets: integer ≥ 0 } }; daemonVersion?: string; capabilities: string[]; offlineWorkers: { id: string; cardIds: string[] }[]; connectionError?: { code?: string; message: string }; state: "disabled" | "connected" | "connecting" | "workspaceConflict" | "daemonOutdated" | "hostNotInstalled" | "protocolIncompatible" | "serviceNotRunning" | "daemonStartFailed" | "workerConflict"; workerId: string; widgetServerOrigin?: string }
```

### nextLayer.setManualOrder

*mutation* — Set the complete manual Widget order for a Board's Next Layer. Returns the ordered widgets so callers can verify without a follow-up query.

```ts
await client.actions.nextLayer.setManualOrder(input: { boardId: string; widgetIds: string[] })
// => { dataScope: { type: "board" } | { cardIds: …[]; type: "cards" }; layout: { height: integer ≥ 1 ≤ 100; width: integer ≥ 1 ≤ 12 }; liveWidgetId: string; patch?: { metadata?: { badge?: string; color?: "red" | "pink" | "fuchsia" | "purple" | "indigo" | "blue" | "cyan" | "teal" | "green" | "amber" | "orange" | "slate"; desc?: string; home?: string; title?: string }; params?: Record<string, unknown> }; widgetId: string; boardId: string }[]
```

- `input.boardId`: Board identifier. Board names are not unique: resolve with board.list first.

### nowLayer.getLiveCards

*query* — List the LiveCards in one Board's Now Layer.

```ts
await client.actions.nowLayer.getLiveCards(input: { boardId: string })
// => { boardId: string; cardId: string; sourceId: string }[]
```

- `input.boardId`: Board identifier. Board names are not unique: resolve with board.list first.

### nowLayer.setManualOrder

*mutation* — Set the complete manual LiveCard order for a Board's Now Layer. Returns the ordered cards so callers can verify without a follow-up query.

```ts
await client.actions.nowLayer.setManualOrder(input: { boardId: string; liveCards: string[] })
// => { boardId: string; cardId: string; sourceId: string }[]
```

- `input.boardId`: Board identifier. Board names are not unique: resolve with board.list first.
- `input.liveCards`: LiveCard identifiers in display order; rewrites the Now Layer order.

### radar.resolveSuggestions

*query* — Resolve Source suggestions for the current browser page.

```ts
await client.actions.radar.resolveSuggestions(input: { tabId: number; title?: string; url: string })
// => unknown[]
```

### source.cancel

*command* — Cancel an active background Source load.

```ts
await client.actions.source.cancel(input: { requestId: string })
// => {}
```

### source.get

*query* — Get one available Source descriptor.

```ts
await client.actions.source.get(input: { sourceId: string })
// => {…}
```

- `input.sourceId`: Qualified Source ID (e.g. "x:list").

### source.list

*query* — List Sources available for creating or resolving LiveCards.

```ts
await client.actions.source.list()
// => unknown[]
```

### source.load

*command* — Load one configured Source through the background runtime.

```ts
await client.actions.source.load(input: { params?: Record<string, unknown>; requestId?: string; sourceId: string })
// => { fetchProtected: boolean; fetchedAt: number; loadedAt: number; params: Record<string, unknown>; result: {…} }
```

## Events

### diagnostics.changed

Background diagnostics changed; re-read the diagnostics snapshot.

```ts
// payload: {}
```

### nativeIntegration.logsChanged

New NewsNext CLI service log entries; append them to the getLogs snapshot, deduping by id.

```ts
// payload: { entries: { id: number; timestamp: string; level: "error" | "warn" | "info"; target: string; message: string }[] }
```

### nativeIntegration.statusChanged

Native worker routing, Widget catalog, or connection state changed; re-read nativeIntegration.getStatus and nativeIntegration.getWidgets.

```ts
// payload: {}
```
