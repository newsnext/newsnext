# Performance Guideline

Canonical reference for React rendering performance in the extension app.
Per-component ownership and memo notes live as comments at the component;
this file keeps only the measurement workflow and cross-cutting render
invariants. See `AGENTS.md` (Performance Documentation, Jotai State
Subscriptions) for documentation policy.

## Scope

Primary target: the extension app (`app.html`) showing many independently
updating LiveCards inside an animated, sortable board.

Cross-cutting invariants:

- Keep an update local to the smallest subtree owning the changed data.
- A board-level interaction must not render LiveCard content unless that
  content or its visible state changed.

Network latency, source execution, background service performance, and
persisted cache policy are separate concerns.

## Measurement Workflow

Measure before and after a change with the same board, viewport, loaded
LiveCard count, and interaction sequence.

- React Scan is opt-in via dynamic import; see
  `apps/extension/src/entrypoints/app/main.tsx`.
- Profiling requires the user-run dev server with
  `WXT_ENABLE_REACT_SCAN=true`; do not start a second server.
- Keep the toolbar enabled; use temporary `onRender` sampling only while
  auditing and remove probes before completing the change.
- Use render events as a diagnostic signal: valid when updating visible
  data, animation, loading, or component-owned interaction; investigate
  unchanged-input or far-spreading renders.

Profile at least the scenarios affected by a change: initial load, board
navigation, Now/Next transitions, scrolling, search, settings, card
front/back flips, metadata/parameter editing, single and global refresh,
minute-boundary updates, Application Actions, and reorder/drop.
Restore any data mutated by an audit.

## Cross-Cutting Render Invariants

- Isolate frequently changing state below stable structure; split context
  values by update frequency so action callers never subscribe to dynamic
  values. See `ScrollProgressProvider` and `use-header-progress.ts`.
- Each LiveCard subscribes to its own item atom; see `store/board.ts`
  (`splitAtom` keyed by `cardId`). Board-only appearance resolves at the
  `DraggableLiveCard` boundary; see
  `components/live-card/draggable-live-card.tsx`.
- `DraggableLiveCard` is the manual board/item memo boundary; other
  components rely on React Compiler inference. See the component file.
- Subscribe to the shared minute clock only in leaf text components
  (`RelativeTime`, `Timeline`); see `hooks/useRelativeTime.ts`.
- Pass the committed scroll element (not a bare ref) to `VirtualList`;
  observe against the real scroll container with the preload margin. See
  `packages/ui/src/components/virtual-list.tsx`.
- Keep overlay-scrollbar detection independent of the library and cleanup
  safe on unmount; see
  `packages/ui/src/hooks/use-overlay-scrollbars.ts`.
- Keep animation, drag preview, and scroll-restoration work above LiveCard
  content; optimize the content boundary instead of removing renders that
  update Motion props or measured vectors.
- Keep the frontend Application Data mirror read-only with no optimistic
  writes; suppress mirrored-storage echoes against each adapter's own
  snapshot only. See `lib/application` storage subscription.
- Do not add module-global identity caches to make `memo` pass; Next Layer
  must not observe the Now Layer cache or trigger Source execution.

## Initialization Boundary

Use `useAtomValueRawSync` for synchronous persisted state that determines
initial navigation, provider configuration, or selection defaults (e.g.
`pages/__root.tsx`, `pages/index.tsx`, `components/common/board-select.tsx`,
`components/i18n-provider.tsx`); keep `useAtomValue` for ordinary
concurrent subscriptions. Jotai 3 details are in `AGENTS.md`.

## Regression Checklist

Before completing React performance work:

- Review changed state owners and providers; confirm unchanged atoms and
  memo-boundary props preserve reference identity.
- Check both sides of a flipped LiveCard; cross a real minute boundary;
  let refreshes complete; confirm editing one card skips unrelated cards.
- Remove all temporary profiling globals and callbacks.
- Run `bun run lint`, `bun run typecheck`, and `bun run test`.
- Build the Chrome MV3 production extension and confirm React Scan is absent.

## Known Limitations

- `splitAtom` migration and reorder paths received static checks but no
  React Scan sampling on a real drag; re-baseline before treating counts
  as measured.
- React Scan adds dev overhead; compare relative results under the same
  instrumentation, never as production durations.
