# Action catalog

Generated from `packages/sdk/src/action/*.ts`. Regenerate with
`bun packages/sdk/scripts/generate-actions-reference.ts` from the web
checkout after changing an action contract. Call actions as
`client.actions.<domain>.<method>(input, options)` inside `newsnext eval`;
the evaluated script receives a preconfigured `client` global.
This catalog covers `client.actions.*` and background events; `status`,
`history.*`, `liveCards.data`, `liveWidgets.data`, `run`, and `fetch` are
documented in sdk.md.
`{…}` marks a TypeScript-only result shape: see the matching type in
`@newsnext/sdk` models.

### application.replace

*mutation* — Replace all durable Application data after validating its integrity.

```ts
await client.actions.application.replace(input: { boards: unknown[]; liveCards: unknown[]; version: number })
// => { boards: unknown[]; liveCards: unknown[]; version: number }
```

### board.create

*mutation* — Create a Board and optional configured LiveCards.

```ts
await client.actions.board.create(input: { color?: "red" | "pink" | "fuchsia" | "purple" | "indigo" | "blue" | "cyan" | "teal" | "green" | "amber" | "orange" | "slate"; defaultLayer?: "now" | "next"; sortMode?: "addedAt" | "provider" | "manual"; liveCards?: { patch: { metadata?: Record<string, …>; params?: Record<string, …> }; sourceId: string }[]; name: string })
// => { boardId: string }
```

### board.delete

*mutation* — Delete a Board and either delete or transfer its LiveCards.

```ts
await client.actions.board.delete(input: { boardId: string; deleteLiveCards: boolean } | { boardId: string; targetBoardId: string })
// => {}
```

### board.get

*query* — Get a Board with ordered entries and resolved LiveCards.

```ts
await client.actions.board.get(input: { boardId: string })
// => {…}
```

### board.getConfiguration

*query* — Get the durable Board configuration for a Board.

```ts
await client.actions.board.getConfiguration(input: { boardId: string })
// => {…}
```

### board.getContext

*query* — Get one Board's presentation context and underlying identity.

```ts
await client.actions.board.getContext(input: { boardId: string })
// => {…}
```

### board.list

*query* — List Boards.

```ts
await client.actions.board.list()
// => unknown[]
```

### board.listLiveCards

*query* — List the LiveCards in a Board in membership order.

```ts
await client.actions.board.listLiveCards(input: { boardId: string })
// => unknown[]
```

### board.update

*mutation* — Atomically update a Board.

```ts
await client.actions.board.update(input: { color?: "red" | "pink" | "fuchsia" | "purple" | "indigo" | "blue" | "cyan" | "teal" | "green" | "amber" | "orange" | "slate"; defaultLayer?: "now" | "next"; sortMode?: "addedAt" | "provider" | "manual"; boardId: string; name?: string })
// => {}
```

### developer.fetch

*command* — Fetch an HTTP(S) URL through the connected browser for Source development.

```ts
await client.actions.developer.fetch(input: { body?: string; headers: unknown[][]; method: string; timeoutMs: number; url: string })
// => { body: string; headers: unknown[][]; status: number; statusText: string }
```

### developer.runSource

*command* — Run a registered or supplied Source for development and debugging.

```ts
await client.actions.developer.runSource(input: { debug: boolean; params?: Record<string, unknown>; sourceId: string } | { debug: boolean; params?: Record<string, unknown>; provider: Record<string, unknown>; providerId: string; sourceId: string; useProviderSecrets?: boolean })
// => { data: unknown[]; execution: { durationMs: number; loadedAt: number; params: Record<string, unknown>; providerId: string; sourceId: string; sourceVersion: number }; fetches?: unknown[] }
```

### liveCard.configure

*mutation* — Merge configuration and presentation overrides into a LiveCard.

```ts
await client.actions.liveCard.configure(input: { cardId: string; patch: { metadata?: Record<string, unknown>; params?: Record<string, unknown> } })
// => {}
```

### liveCard.create

*mutation* — Create a configured LiveCard in one Board.

```ts
await client.actions.liveCard.create(input: { boardId: string; patch: { metadata?: Record<string, unknown>; params?: Record<string, unknown> }; sourceId: string })
// => { cardId: string }
```

### liveCard.delete

*mutation* — Delete a LiveCard from its Board.

```ts
await client.actions.liveCard.delete(input: { cardId: string })
// => {}
```

### liveCard.get

*query* — Get one configured LiveCard.

```ts
await client.actions.liveCard.get(input: { cardId: string })
// => {…}
```

### liveCard.list

*query* — List configured LiveCards.

```ts
await client.actions.liveCard.list()
// => unknown[]
```

### liveCard.load

*query* — Load a LiveCard through the Workspace router.

```ts
await client.actions.liveCard.load(input: { cardId: string })
// => { fetchProtected: boolean; fetchedAt: number; loadedAt: number; params: Record<string, unknown>; result: {…} }
```

### liveCard.move

*mutation* — Move an existing LiveCard to a Board.

```ts
await client.actions.liveCard.move(input: { boardId: string; cardId: string })
// => {}
```

### liveCard.readSnapshot

*query* — Read a LiveCard's Source snapshot through the Workspace router.

```ts
await client.actions.liveCard.readSnapshot(input: { cardId: string })
// => { fetchProtected: boolean; fetchedAt: number; loadedAt: number; params: Record<string, unknown>; result: {…} } | unknown
```

### liveCard.resetMetadata

*mutation* — Reset a LiveCard's presentation overrides while preserving its parameters.

```ts
await client.actions.liveCard.resetMetadata(input: { cardId: string })
// => {}
```

### liveCard.resetParams

*mutation* — Reset a LiveCard's parameters while preserving presentation overrides.

```ts
await client.actions.liveCard.resetParams(input: { cardId: string })
// => {}
```

### loader.loadLiveCard

*query* — Load one routed Workspace LiveCard in its bound browser Loader.

```ts
await client.actions.loader.loadLiveCard(input: { card: { createdAt: number; cardId: string; workerId: string; patch: {…}; sourceId: string } })
// => { fetchProtected: boolean; fetchedAt: number; loadedAt: number; params: Record<string, unknown>; result: {…} }
```

### loader.readLiveCardSnapshot

*query* — Read one routed Workspace LiveCard's Source snapshot without executing its Source.

```ts
await client.actions.loader.readLiveCardSnapshot(input: { card: { createdAt: number; cardId: string; workerId: string; patch: {…}; sourceId: string } })
// => { fetchProtected: boolean; fetchedAt: number; loadedAt: number; params: Record<string, unknown>; result: {…} } | unknown
```

### nativeIntegration.getLogs

*query* — Get recent NewsNext App service logs.

```ts
await client.actions.nativeIntegration.getLogs()
// => { id: number; timestamp: string; level: "error" | "warn" | "info"; target: string; message: string }[]
```

### nativeIntegration.setLogLevel

*mutation* — Set the NewsNext App service log level (off disables logging entirely).

```ts
await client.actions.nativeIntegration.setLogLevel(input: { level: "off" | "error" | "warn" | "info" })
// => {}
```

### nativeIntegration.getStatus

*query* — Get the local NewsNext App connection status.

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

### nativeIntegration.resolveWorkspace

*mutation* — Resolve local and shared Workspace differences before synchronization. Overwrite replaces shared data, merge keeps shared conflicts, discard uses shared data.

```ts
await client.actions.nativeIntegration.resolveWorkspace(input: { resolution: "overwrite" | "merge" | "discard"; expectedRevision: integer ≥ 0 })
// => { workspaceConflict?: { revision: integer ≥ 0; local: { boards: integer ≥ 0; liveCards: integer ≥ 0; liveWidgets: integer ≥ 0 }; shared: { boards: integer ≥ 0; liveCards: integer ≥ 0; liveWidgets: integer ≥ 0 } }; daemonVersion?: string; capabilities: string[]; offlineWorkers: { id: string; cardIds: string[] }[]; connectionError?: { code?: string; message: string }; state: "disabled" | "connected" | "connecting" | "workspaceConflict" | "daemonOutdated" | "hostNotInstalled" | "protocolIncompatible" | "serviceNotRunning" | "daemonStartFailed" | "workerConflict"; workerId: string; widgetServerOrigin?: string }
```

### nativeIntegration.setEnabled

*mutation* — Enable or disable the local NewsNext App connection on this device.

```ts
await client.actions.nativeIntegration.setEnabled(input: { enabled: boolean })
// => { workspaceConflict?: { revision: integer ≥ 0; local: { boards: integer ≥ 0; liveCards: integer ≥ 0; liveWidgets: integer ≥ 0 }; shared: { boards: integer ≥ 0; liveCards: integer ≥ 0; liveWidgets: integer ≥ 0 } }; daemonVersion?: string; capabilities: string[]; offlineWorkers: { id: string; cardIds: string[] }[]; connectionError?: { code?: string; message: string }; state: "disabled" | "connected" | "connecting" | "workspaceConflict" | "daemonOutdated" | "hostNotInstalled" | "protocolIncompatible" | "serviceNotRunning" | "daemonStartFailed" | "workerConflict"; workerId: string; widgetServerOrigin?: string }
```

### nextLayer.configureLiveWidget

*mutation* — Merge sparse params and metadata overrides. Null resets a section to widget.json defaults.

```ts
await client.actions.nextLayer.configureLiveWidget(input: { boardId: string; liveWidgetId: string; patch: { params?: unknown | Record<string, unknown>; metadata?: unknown | { title?: string; badge?: string; desc?: string; home?: string; color?: "red" | "pink" | "fuchsia" | "purple" | "indigo" | "blue" | "cyan" | "teal" | "green" | "amber" | "orange" | "slate" } } })
// => {}
```

### nextLayer.installLiveWidget

*mutation* — Create an independent instance of a local Widget in a Board's Next Layer. The placement appends after existing Widgets; omitted size fields default to 2.

```ts
await client.actions.nextLayer.installLiveWidget(input: { boardId: string; dataScope: { type: "board" } | { cardIds: string[]; type: "cards" }; size: { height?: integer ≥ 1 ≤ 100; width?: integer ≥ 1 ≤ 12 }; widgetId: string })
// => { liveWidgetId: string }
```

### nextLayer.listLiveWidgets

*query* — List the Widget placements in a Board's Next Layer in installation order.

```ts
await client.actions.nextLayer.listLiveWidgets(input: { boardId: string })
// => unknown[]
```

### nextLayer.moveLiveWidget

*mutation* — Move a Widget placement to another Board while preserving its settings and size.

```ts
await client.actions.nextLayer.moveLiveWidget(input: { boardId: string; targetBoardId: string; liveWidgetId: string })
// => {}
```

### nextLayer.removeLiveWidget

*mutation* — Remove a local Widget from a Board's Next Layer.

```ts
await client.actions.nextLayer.removeLiveWidget(input: { boardId: string; liveWidgetId: string })
// => {}
```

### nextLayer.setLiveWidgetDataScope

*mutation* — Set the Board-scoped LiveCard access granted to a Next Layer Widget.

```ts
await client.actions.nextLayer.setLiveWidgetDataScope(input: { boardId: string; dataScope: { type: "board" } | { cardIds: string[]; type: "cards" }; liveWidgetId: string })
// => {}
```

### nextLayer.setLiveWidgetLayouts

*mutation* — Persist Widget sizes and order for a Board's Next Layer in display order.

```ts
await client.actions.nextLayer.setLiveWidgetLayouts(input: { boardId: string; liveWidgets: { liveWidgetId: string; width: integer ≥ 1 ≤ 12; height: integer ≥ 1 ≤ 100 }[] })
// => {}
```

### nextLayer.setLiveWidgetMetadata

*mutation* — Replace a Board Widget's display metadata overrides; an empty object restores its definition.

```ts
await client.actions.nextLayer.setLiveWidgetMetadata(input: { boardId: string; liveWidgetId: string; metadata: { title?: string; badge?: string; desc?: string; home?: string; color?: "red" | "pink" | "fuchsia" | "purple" | "indigo" | "blue" | "cyan" | "teal" | "green" | "amber" | "orange" | "slate" } })
// => {}
```

### nextLayer.setLiveWidgetParams

*mutation* — Replace a Board Widget's parameter overrides; pass an empty object to reset defaults.

```ts
await client.actions.nextLayer.setLiveWidgetParams(input: { boardId: string; liveWidgetId: string; params: Record<string, unknown> })
// => {}
```

### nowLayer.getLiveCards

*query* — List the LiveCards in one Board's Now Layer.

```ts
await client.actions.nowLayer.getLiveCards(input: { boardId: string })
// => unknown[]
```

### nowLayer.setManualOrder

*mutation* — Set the complete manual LiveCard order for a Board's Now Layer.

```ts
await client.actions.nowLayer.setManualOrder(input: { boardId: string; cardIds: string[] })
// => {}
```

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

### worker.regenerateIdentity

*mutation* — Generate a new Worker identity and reconnect this browser.

```ts
await client.actions.worker.regenerateIdentity()
// => { workspaceConflict?: { revision: integer ≥ 0; local: { boards: integer ≥ 0; liveCards: integer ≥ 0; liveWidgets: integer ≥ 0 }; shared: { boards: integer ≥ 0; liveCards: integer ≥ 0; liveWidgets: integer ≥ 0 } }; daemonVersion?: string; capabilities: string[]; offlineWorkers: { id: string; cardIds: string[] }[]; connectionError?: { code?: string; message: string }; state: "disabled" | "connected" | "connecting" | "workspaceConflict" | "daemonOutdated" | "hostNotInstalled" | "protocolIncompatible" | "serviceNotRunning" | "daemonStartFailed" | "workerConflict"; workerId: string; widgetServerOrigin?: string }
```

### worker.takeOver

*mutation* — Reassign selected LiveCards from an offline Worker to this Worker.

```ts
await client.actions.worker.takeOver(input: { cardIds: string[]; workerId: string })
// => { workspaceConflict?: { revision: integer ≥ 0; local: { boards: integer ≥ 0; liveCards: integer ≥ 0; liveWidgets: integer ≥ 0 }; shared: { boards: integer ≥ 0; liveCards: integer ≥ 0; liveWidgets: integer ≥ 0 } }; daemonVersion?: string; capabilities: string[]; offlineWorkers: { id: string; cardIds: string[] }[]; connectionError?: { code?: string; message: string }; state: "disabled" | "connected" | "connecting" | "workspaceConflict" | "daemonOutdated" | "hostNotInstalled" | "protocolIncompatible" | "serviceNotRunning" | "daemonStartFailed" | "workerConflict"; workerId: string; widgetServerOrigin?: string }
```

## Events

### diagnostics.changed

Background diagnostics changed; re-read the diagnostics snapshot.

```ts
// payload: {}
```

### nativeIntegration.statusChanged

Native worker routing, Widget catalog, or connection state changed; re-read nativeIntegration.getStatus and nativeIntegration.getWidgets.

```ts
// payload: {}
```

### nativeIntegration.logsChanged

New NewsNext App service log entries; append them to the getLogs snapshot, deduping by id.

```ts
// payload: { entries: { id: number; timestamp: string; level: "error" | "warn" | "info"; target: string; message: string }[] }
```
