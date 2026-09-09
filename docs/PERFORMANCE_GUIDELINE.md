# Performance Guideline

This document is the canonical reference for React rendering performance in the
NewsNext extension app. Keep it aligned with the implemented component
boundaries, state ownership, and profiling workflow when performance-related
behavior changes.

## Scope

The primary performance target is the extension app at:

`chrome-extension://blkhpdbooolmhamhbpnfinmfghginnbh/app.html`

The app displays many independently updating LiveCards inside an animated and
sortable board. Performance work should keep an update local to the smallest
subtree that owns the changed data. A board-level interaction must not cause
LiveCard content to render unless that content or its visible state changed.

This guideline covers React renders and related component work. Network latency,
source execution, background service performance, and persisted cache policy
remain separate concerns.

### Initial theme path

Resolve the appearance mode and theme color in the shared blocking head script
before mounting React. Every HTML entry that mounts `AppProvider` must run this
bootstrap so the provider stays theme-agnostic and has no module-level DOM or
storage side effects. Keep later theme synchronization idempotent so an unchanged
theme does not rewrite local storage or remove and re-add its document class.
Synchronize the favicon once in the app entry before mounting React. Cache the
canonical SVG source and each generated theme-color data URL, and remember the
applied color so board resolution with the same color does not repeat network
loading, SVG parsing, or serialization.

### Persisted state during route mounting

Route components, the locale provider, the Radar target-board initializer, and
the shared board selector read synchronous persisted atoms with
`useAtomValueRawSync`.
Jotai 3 removed the unconditional post-mount render from `useAtomValue`, so an
`atomWithStorage` hydration update between rendering and subscription can be
missed. This left the index route holding an empty board list while the store
and header already contained the saved boards, preventing initial navigation.
Use the synchronous subscription at these initialization boundaries to recheck
the snapshot after subscribing; keep ordinary card subscriptions concurrent.
Awaiting storage initialization alone is insufficient: `atomWithStorage` captures
its initial value when created and refreshes it on mount. Audit app and popup
mounts separately. Pair synchronous reads with `useSetAtom` for writable settings;
do not use the raw hook for async atoms that need Suspense.

Verify a fresh app load without a hash, switching between populated boards,
persisted locale restoration, and the Radar target-board selection, not just HMR
or type checks. The minute-clock atom also writes on mount, but its consumers
sample `Math.max(lastTickAt, Date.now())` and receive subsequent timer updates;
it does not require synchronous subscriptions for initial clock accuracy.

## Measurement Workflow

Measure before and after a change with the same board, viewport, loaded LiveCard
count, and interaction sequence. React Scan is opt-in through a dynamic import
in `apps/extension/src/entrypoints/app/main.tsx`. Profiling requires the user-run development server to have
`WXT_ENABLE_REACT_SCAN=true`; do not start a second server.

- React Scan must load before the React root mounts.
- React Scan must load only when `WXT_ENABLE_REACT_SCAN` is exactly `true` in a
  development build. Production builds must not contain React Scan code or
  strings.
- Do not pass `enabled` during initialization. React Scan defaults to enabled
  on first use and persists the toolbar power toggle in `react-scan-options`;
  forcing the option during hot reload overrides the stored user preference.
- Keep the toolbar enabled for interactive inspection and track unnecessary
  renders during development.
- Use temporary `onRender` sampling only while auditing. Remove sampling arrays,
  globals, and debug callbacks before completing the change.
- Use the app's existing development server. Do not start a second server.
- Follow the browser-automation policy in `AGENTS.md` for repeatable browser
  interactions and verify the resulting UI state after each interaction.

Use component render events as a diagnostic signal, not an optimization target
by itself. A render is valid when it updates visible data, animation state,
loading state, or an interaction owned by that component. Investigate renders
with unchanged inputs or renders that spread far beyond the state owner.

### Required scenarios

Profile at least the scenarios affected by a change:

- Initial app load with visible and preloaded offscreen LiveCards.
- Board navigation.
- Now/Next layer transitions.
- Root and LiveCard scrolling.
- Search open, input, selection, and close.
- Settings open, tab changes, setting changes, and close.
- LiveCard front/back transitions.
- Metadata and parameter editing, saving, cancelling, and resetting.
- Single LiveCard refresh from request start through completion.
- Global refresh with multiple active LiveCards.
- Minute-boundary relative-time updates.
- Application Actions that update Instances, Boards, membership, or Layer
  settings through the background mutation runtime and its read-only
  frontend Application Data subscription.
- LiveCard reorder, cancelled drag, and a drop that changes order.

Restore any LiveCard metadata, parameters, board membership, or order changed by an
audit. Confirm that no temporary probe values remain in local storage.

## Rendering Rules

### Isolate frequently changing state

Place state below stable application structure whenever possible. A provider
that owns frequently changing state should receive stable `children`; this lets
React update context consumers without rebuilding unrelated siblings.

Separate context values by update frequency:

- Stable refs and actions belong in a stable context value.
- Dynamic state belongs in the context consumed by components that render it.
- Components that only invoke an action must not subscribe to the dynamic value.

The scroll progress contexts follow this rule. Layer activity changes update
`HeaderProgress`, while stable scroll refs and the activity setter are available
to `BoardView` without subscribing the board to header progress state.

### Keep derivation ownership local

`buildLiveCards` is a pure derivation without cross-call caches. Board
membership is selected before projection; the Instance contains no Board
identifier. Search and
refresh call it for their own snapshots. The rendered board uses Jotai's
`splitAtom` with `instanceId` as its stable key so every LiveCard subscribes to its
own `Instance`. `NowLayer` subscribes separately to a lightweight layout
projection containing only Board IDs and sorting fields.

Resolve board-only appearance settings at the `DraggableLiveCard` boundary and pass
their result into the shared LiveCard shell. Do not make the base `LiveCard`
subscribe to board appearance when specialized consumers such as Radar provide
their own dimensions.

Parameter and non-title metadata changes update the affected item atom without
rebuilding the board. Membership, creation time, source identity, and title
changes update the layout projection because they can change visibility or
ordering. Keep dynamically created atom configs referentially stable, and use
`selectAtom` only where an equality function is required to stabilize a
structural projection.

Gate Board rendering on Instance cache restoration only when entering a Board.
Later Instance creation or configuration may restore or invalidate the affected
query, but must keep the mounted Board visible so unrelated LiveCards, scroll
position, and interaction state are preserved.

Do not add module-global identity caches to make `memo` boundaries pass. Such
caches make correctness depend on an implicit immutability contract and can
return stale LiveCards after in-place changes. If Instance updates become a
measured bottleneck, optimize them at the React or Jotai owner that has the
complete input lifecycle.

Next Layer must read CLI/daemon-backed persisted output without observing the
Now Layer TanStack cache, force-mounting LiveCards, or rerunning Agent-owned
refresh and processing in React. Layer presentation must not determine whether
a Source executes.

Mirrored storage must suppress equal-value echoes without suppressing real
cross-document changes. Compare against each adapter's own snapshot, not shared
`localStorage`: otherwise one document's cache write can hide another document's
storage notification. Preserve references for equal normalized values.

Application Data is a read-only frontend mirror. Background Actions serialize
mutations and return compact receipts; storage subscriptions deliver the updated
envelope. Do not add optimistic writes without measured need and a conflict
reconciliation design. Persistence boundaries are defined in
[Application Architecture](APPLICATION_ARCHITECTURE.md#adapter-rules).

Name Instance-keyed projections `instanceIds` and `liveCardsByInstanceId`; reserve
`sourceId` for descriptor identity so selectors expose what actually invalidates.

### Add memo boundaries at independent units

Use `memo` when a component represents an independently updating unit, its props
can remain stable, and React Compiler cannot protect the same boundary. Current
manual boundaries include:

- `DraggableLiveCard`, so board animation and layout work does not enter LiveCard data
  and query subtrees during board renders.

Compiler-generated caches isolate the LiveCard front, LiveCard back, board actions, and
parameter rows. Do not reintroduce manual wrappers around those components
without profiling evidence that the compiled boundary is insufficient.

Do not add `memo` mechanically. Inline objects, elements, and callbacks can make
it ineffective, and a comparator that ignores meaningful props can produce
stale UI. Stabilize the data flow first, then add the narrow boundary.

The extension build uses React Compiler in its default inference mode. Prefer
letting the compiler memoize new components and hooks automatically. Existing
manual `memo`, `useMemo`, and `useCallback` boundaries remain intentional and
must not be removed without profiling because they may preserve identity for
effects, imperative integrations, or third-party components. Compiler
diagnostics are split according to the ESLint React migration preset:
`@eslint-react/eslint-plugin` owns rules with equivalents, while
`eslint-plugin-react-hooks` remains enabled for Compiler-specific rules such as
configuration, gating, incompatible libraries, and preservation of manual
memoization. An unsupported component may be skipped while the rest of the app
is still compiled.

Keep render functions free of ref reads and writes. `DndContext` uses an Effect
Event so its long-lived drag monitor always invokes the latest callbacks without
resubscribing. Ordinary UI callbacks such as `DynamicIsland` open and close
handlers should instead depend directly on the values they use. `LiveCardContainer`
keeps drag state close to the rendered cards, while `useWrappedSortable` snapshots
the card order and layout only when dragging starts.

TanStack Virtual returns functions that React Compiler cannot memoize safely.
Keep `VirtualList` virtualized, and apply the
`react-hooks/incompatible-library` exception only at its `useVirtualizer` call
with an explanatory comment. Do not disable the diagnostic globally or pass
virtualizer functions through separately memoized boundaries.

The scatter transition measures rendered LiveCard bounds and must publish its Motion
variants synchronously in a layout effect before paint. Keep the targeted
`react/set-state-in-effect` exception at that state update; moving it to a passive
effect or timer introduces a visible position flash. Other synchronous Effect
state updates remain actionable warnings. `bun run lint` should complete with
zero warnings outside these documented, line-level exceptions.

### Keep refs and callbacks stable

Callback refs are lifecycle callbacks. Replacing one during render can detach
and reattach the DOM node, which may also recreate observers or drag-and-drop
registrations.

- Wrap composed callback refs in `useCallback`.
- Depend on the specific forwarded ref callback, not an entire props object.
- Keep callbacks passed through memoized boundaries stable with `useCallback`.
- Use a small wrapper component when a list item needs to bind a stable parent
  callback to an item key.

### Own source-wide image analysis above item rows

Semantic mark normalization is source-wide work. LiveCard content finds the
first mark for each Instance, scans at most a 128px image once, and passes the cached, capped scale into item summaries. Keep pixel
analysis effects, promises, and profile state out of virtualized item rows.
Failed image requests must leave the source cache retryable on the next result
update; a confirmed no-padding result may remain cached.

### Localize time subscriptions

The shared minute atom intentionally updates once per minute. Subscribe at the
smallest component that renders time-dependent text.

- `RelativeTime` owns LiveCard header subtitle updates.
- `Timeline` owns grouped item time labels.
- LiveCard front and back surfaces must not subscribe merely to pass a formatted
  string through a large subtree.
- Memoize time-independent news content below a time-labeling row.

An invisible LiveCard side may stay mounted for flip animation, but its entire form
must not render at every minute boundary.

### Separate query state from hidden UI

A LiveCard query may render at request start, when fetching-latest tracking changes,
and when data completes. These renders are expected on the front side because
the loading and content UI changes.

The hidden LiveCard back should render only when one of its own props changes, such
as loader metadata or `updatedAt`. Loading flags that are not LiveCard back props
must not rebuild the editor.

Use stable empty arrays and stable merged metadata objects. Expressions such as
`data?.items ?? []` create a new fallback array on every render and defeat
downstream memoization.

### Keep SDK verification safe for the running dev server

Run `bun run typecheck` for type checking and `bun run test` for tests. Neither
command may trigger a build. Like `@newsnext/ui`, the local SDK's package exports
point directly to `src` TypeScript files. Bun, WXT, TypeScript, and Vitest resolve
those normal workspace exports without SDK-specific aliases, custom conditions,
or runtime flags. The browser root entry selects the Widget client; other
runtimes select the CLI client.

Keep the extension's installation hook limited to `wxt prepare`. Explicit SDK
builds are only for distribution: they emit JavaScript, declarations, and a
compiled package manifest in `dist`, which is the directory to pack or publish.
Local development never imports that output, so SDK packaging cannot invalidate
modules used by the dev server. Do not reintroduce automatic builds into checks.

### Keep animation work above LiveCard content

Board and Motion components may render multiple times while calculating scatter
vectors or layout transitions. Keep that animation work in the board item and
Motion layers. Stable `DraggableLiveCard` props prevent it from entering queries,
virtual lists, and LiveCard editor controls.

Keep the initial entrance and navigation exits in `ScatterCardLayer`, using the
same horizontal offset calculation on inner card wrappers. Claim the entrance
once per document during the first committed mount, retaining that decision
across effect replays. Route remounts and Board/Layer switches must reveal their
content directly. Starting an exit consumes any remaining entrance eligibility,
so cancelling navigation cannot trigger another entrance. Motion and GridStack
own the outer slot geometry; their transforms must not compete with these animations.
Restore the shared root scroll position after the target Layer mounts, then mark
the view ready on the following animation frame without an idle wait. Measure
visible cards against the root scroll viewport and, on initial load, apply
entrance keyframes before revealing the Layer. Widget snapshot queries use view
readiness together with viewport visibility so they start against the restored
viewport.

When an exit interrupts the initial entrance, snapshot current animated styles
before cancelling animations, then measure resting slot geometry and continue
from those captured styles. Cancelling an exit reveals the Layer directly.
Invalidate old completion handlers when replacing animations, cancel finished
entrance animations to release their fill state, and cancel all animations on
unmount. Reset readiness when mounting a new target, including rapid return trips
to the previous Board.

Keep Motion layout projection mounted on sortable Now Layer items, but use a
named stable `layoutDependency` token to suspend its measurements until the
initial entrance finishes, or scroll restoration completes on navigation.
Dynamically mounting projection leaves it without the continuous layout lifecycle
needed for reliable reordering. Once revealed, set `layoutDependency` to the
ordered ID array so drag reordering retains FLIP animation without measuring
unrelated renders.

Do not remove renders that are required to update Motion props, measured scatter
vectors, or drag state. Optimize the content boundary instead.

Use the shared exit-then-reveal sequence for both Layers; its visual contract is
in [Design Guideline](DESIGN_GUIDELINE.md#next-layer-widget-surfaces). Keep
transition work outside card content and never transform or blur the full page.

### Observe against the real scroll container

Intersection observers that preload LiveCard content must use the root app scroll
container, not the browser viewport. An intermediate overflow container clips
the target before a viewport-rooted observer applies its root margin, which
makes the preload margin ineffective and defers the LiveCard's synchronous mount
work until it is already visible.

Use the stable scroll-container ref from the actions context so LiveCards can mount
inside the configured preload margin without subscribing to header progress or
layer activity. Keep the offscreen retention delay to avoid repeated mount work
during short back-and-forth scrolls.

LiveCard previews rendered through a dialog portal are not descendants of the
app scroll container and must opt into eager content mounting. Keep this an
explicit exception for the single active preview; do not disable viewport
deferral for Board LiveCards or every Search result.

### Connect virtualizers to committed scroll elements

Pass the committed scroll DOM element to `VirtualList`, not a mutable ref whose
`current` value changes without rendering. A virtualizer can mount while that
ref is still null, calculate the correct total height from item count, and yet
produce no virtual rows because it never subscribed to the scroll element.

Own the scroll element with a callback ref backed by local state. The commit
then schedules the render that connects TanStack Virtual to the actual element.
When checking a blank list, compare its total spacer height with its rendered
`data-index` rows: a non-zero height with zero rows indicates a virtualizer
attachment or measurement problem rather than missing query data.

Keep LiveCard scroll content out of a shared `preserve-3d` flip container with
permanent `will-change: transform`. Rotate the two faces independently under a
perspective container instead. If blank content recovers on hover, inspect row
bounds and painting before resetting query data or virtualizer measurements.
Changing virtual row positioning from transforms to `top` did not resolve the
reported resize issue and was reverted. On 2026-09-09, the user confirmed that
independent face rotation resolved the blank content with their native window
resize sequence. Automated checks covered scrolling and flipping, but did not
reproduce the original blank state or measure compositor performance.

## 2026-08-03 Audit Results

The audit used a 1080 by 1890 viewport and a Board containing 12 LiveCards,
with eight LiveCard contents mounted by the viewport and preload margin.

| Scenario | Before | After measured | Result |
| --- | ---: | ---: | --- |
| Two Now/Next layer toggles | 1,851 | 61 | Root, header, footer, and LiveCard content cascades removed; 96.7% fewer render events. |
| One minute-boundary update | 1,149 | 266 | Whole LiveCard fronts and backs no longer update; 76.8% fewer render events. A subsequent timeline content boundary further isolates unchanged news content. |
| Single LiveCard refresh | 389 | 252 | Hidden LiveCard back work reduced from three full renders to one data-completion render; 35.2% fewer render events. |

Settings tab changes remained inside the settings subtree. Metadata and
parameter drafts remained inside the edited LiveCard. Search open and close did not
update LiveCard content.

These numbers are comparison baselines, not permanent budgets. Data volume,
viewport size, React, Motion, and component implementation can change the raw
counts. Preserve the isolation properties described in the Result column.

## Regression Checklist

Before completing React performance work:

- Review every changed state owner and context provider.
- Confirm unchanged item atoms and LiveCard boundary props preserve reference
  identity.
- Confirm memoized props do not contain avoidable new arrays, objects,
  callbacks, refs, or React elements.
- Check both visible and hidden sides of a flipped LiveCard.
- Cross a real minute boundary; do not infer timer behavior from static code.
- Let refresh operations reach completion before reading render counts.
- Verify that editing one instance does not render unrelated LiveCard content.
- Test scroll and animation behavior visually after adding memo boundaries.
- Switch repeatedly between boards and confirm every populated LiveCard renders
  virtual rows after its scroll element is committed.
- Remove all temporary profiling globals and callbacks.
- Confirm compiled components show the `Memo ✨` badge in React DevTools or
  verify that production output contains Compiler memo-cache code such as
  `react.memo_cache_sentinel`.
- Run `bun run lint`, `bun run typecheck`, and `bun run test`.
- Build the Chrome MV3 production extension and confirm React Scan is absent.

## Known Limitations

The `splitAtom` LiveCard subscription migration received static checks and an
ego-lite functional smoke test, but React Scan was not enabled on the existing
development server. Re-baseline the single LiveCard metadata edit scenario before
treating its render count as measured.

The 2026-08-03 ego-lite audit could not reliably generate the browser's native
HTML5 drag event chain. LiveCard reordering received code-path review and existing
pure reorder coverage, but did not receive React Scan event sampling for a real
drag. Repeat that scenario manually or with a browser harness that produces
trusted native drag events before treating drag render behavior as measured.

React Scan adds development overhead, especially when unnecessary-render
tracking or per-render callbacks are enabled. Compare relative results under
the same instrumentation and do not interpret instrumented duration as
production duration.

## Development diagnostics subscriptions

The development-only NewsNext Devtool uses one native subscription shared by
open panels. The last close unsubscribes; reconnection restores it. Bootstrap
reads share a single-flight queue, and subsequent activity/storage events reuse
the pushed cache. With no subscribers the daemon skips diagnostic count queries.
Use absolute deadlines instead of polling or countdown timers.

Diagnostics bypass Action dispatch to avoid activity-event feedback loops and
must never trigger Source loads. The protocol and payload boundaries are in
[Source Architecture](SOURCE_ARCHITECTURE.md#stream-collection-diagnostics).

Stream summaries and sorting are pure projections of pushed diagnostics. Overview
and Streams share presentation, sort preference, and selection without additional
native requests. Default sorting uses stable identity fields, so timestamp, count,
and activity updates do not move rows. Attention ordering requires explicit opt-in.
