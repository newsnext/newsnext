# Widget Guideline

Widgets span two sides: the trusted host shell (extension) and untrusted
content (`data.mjs` producers, custom `index.html` views). This file keeps
only that cross-cutting contract. Field semantics live as TSDoc on the
types; visual rules live in the Design Guideline.

- Manifest/view/data types:
  `apps/extension/src/components/nextlayer/widget-manifest.ts`,
  `packages/sdk/src/models/widget-view.ts`,
  `packages/sdk/src/models/board.ts` (`LiveWidget*`, `WidgetPatch`),
  `packages/sdk/src/types.ts` (`LiveWidgetDataQuery/Result`).
- Host/content protocol:
  `apps/extension/src/lib/widget-host.ts`,
  `apps/extension/src/components/nextlayer/live-widget-grid.tsx` (`postData`).
- Reference custom view: `examples/widgets/demo-custom-html/index.html`.

## Definition vs instance

`widgetId` names the definition (its directory); `liveWidgetId` names one
installed placement. All edits, moves, and removal target `liveWidgetId`.
`client.liveWidgets.data` addresses the definition. Identical definition
inputs share the daemon result cache. Repeated `liveWidget.create` calls may
reuse one definition in one Board; each returns an independent `liveWidgetId`.

## Host owns the shell

The host owns title, refresh state/button, drag behavior, nested content
surface, error/connection treatment, and the details back (same flip,
header, and editors as LiveCards). Content must not repeat title, refresh
control, padding, shell, or background; iframe background stays transparent.
The shell derives loading/empty/malformed/error status and renders it once
in a single bottom layer; renderers stay free of loading and status text.

## Content protocol

- Custom views answer `newsnext.widget.ready` once their listener is
  installed. The host sends `newsnext.widget.data`
  (`status`, `stale`, `queries`, `params`, `layout`, `widgetId`,
  `liveWidgetId`) and re-sends the latest payload after each load/refresh.
- Views report empty/malformed data via `newsnext.widget.status`
  (`message: null` clears); the host renders it in the shared status layer.
- Views keep natural content height and report it via
  `newsnext.widget.size`. Documents must not scroll (`overflow: hidden`
  root, no viewport heights or inner scroll); the content panel owns scroll.
- Custom views may bundle `@newsnext/sdk/widget` for Actions/history
  (`sdk` host capability required). Manifest snapshot scope does not
  restrict SDK calls.

## Data pipeline

`data.mjs` default-exports an async loader returning named query results;
or declare `data.queries` in the manifest; or omit both for data-free
(no refresh button). JS receives materialized snapshots and its return
replaces them. Runs are bounded (60s, 16 MiB JSON); entry paths stay inside
the Widget directory; stdout carries JSON, diagnostics go to stderr.
Only initial load, manual refresh, and visible
polling (`refreshIntervalMs`) execute the pipeline; there is no background
schedule. Placement metadata/params overrides apply via
`liveWidget.configure`; `{}` restores definition defaults.

## Linked rules (not copied here)

- Next Layer grid, shell, header, back, palette, motion, and preset
  presentation rules: [Design Guideline](DESIGN_GUIDELINE.md). Widget sizes
  are half-LiveCard grid units; layout clamping lives in `widget-layout.ts`.
- Source-style `params` schema, loaders, templates, and query semantics:
  [Source Authoring Guide](SOURCE_GUIDELINE.md) and
  `@newsnext/source-kit` / `packages/sdk` TSDoc.
- Host lifecycle and layering:
  [Application Architecture](APPLICATION_ARCHITECTURE.md#layers-and-widgets).

## Scaffold and verify

Scaffold with `newsnext widget create <widget-id>`, validate with
`newsnext widget validate --run <widget-id>`, install via
`liveWidget.create` on an explicitly chosen Board. Runnable examples live
in `examples/widgets`; preview presets in Cosmos **Patterns → Widgets**.
