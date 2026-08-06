# Performance Guideline

This document is the canonical reference for React rendering performance in the
NewsNext extension app. Keep it aligned with the implemented component
boundaries, state ownership, and profiling workflow when performance-related
behavior changes.

## Scope

The primary performance target is the extension app at:

`chrome-extension://cffgbnjiaakknooiegnjkojemhidheke/app.html`

The app displays many independently updating cards inside an animated and
sortable board. Performance work should keep an update local to the smallest
subtree that owns the changed data. A board-level interaction must not cause
card content to render unless that content or its visible state changed.

This guideline covers React renders and related component work. Network latency,
source execution, background service performance, and persisted cache policy
remain separate concerns.

### Initial theme path

Resolve the appearance mode and theme color in the shared blocking head script
before mounting React. Every HTML entry that mounts `AppProvider` must run this
bootstrap so the provider stays theme-agnostic and has no module-level DOM or
storage side effects. Keep later theme synchronization idempotent so an unchanged
theme does not rewrite local storage or remove and re-add its document class.
Synchronize the favicon once in the app entry before mounting React, and remember
the applied color in memory so board resolution with the same color does not
repeat SVG parsing and serialization.

## Measurement Workflow

Measure before and after a change with the same board, viewport, loaded card
count, and interaction sequence. React Scan is opt-in through a dynamic import
in `apps/extension/src/entrypoints/app/main.tsx`. Start the existing development
server with `WXT_ENABLE_REACT_SCAN=true bun run dev` when profiling.

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

- Initial app load with visible and preloaded offscreen cards.
- Board navigation.
- Now/Next layer transitions.
- Root and card scrolling.
- Search open, input, selection, and close.
- Settings open, tab changes, setting changes, and close.
- Card front/back transitions.
- Metadata and parameter editing, saving, cancelling, and resetting.
- Single-card refresh from request start through completion.
- Global refresh with multiple active cards.
- Minute-boundary relative-time updates.
- Card instance changes that update the Jotai storage atoms.
- Card reorder, cancelled drag, and a drop that changes order.

Restore any card metadata, parameters, board membership, or order changed by an
audit. Confirm that no temporary probe values remain in local storage.

## Rendering Rules

### Defer optional integrations

Keep optional, dependency-heavy surfaces outside the main app entrypoint. The
assistant runs in the dedicated Side Panel entrypoint, so assistant-ui and Pi
Agent Core are not loaded when rendering or reading a board. Do not import the
chat panel back into the app route tree; the header should call Chrome's Side
Panel API without loading the chat runtime.

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
to `Desk` without subscribing the board to header progress state.

### Keep derivation ownership local

`buildSourceCards` is a pure derivation without cross-call caches. Search and
refresh call it for their own snapshots. The rendered board uses Jotai's
`splitAtom` with `instanceId` as its stable key so every card subscribes to its
own `SourceInstance`. `NowLayer` subscribes separately to a lightweight layout
projection containing only membership and sorting fields.

Parameter and non-title metadata changes update the affected item atom without
rebuilding the board. Membership, creation time, source identity, and title
changes update the layout projection because they can change visibility or
ordering. Keep dynamically created atom configs referentially stable, and use
`selectAtom` only where an equality function is required to stabilize a
structural projection.

Do not add module-global identity caches to make `memo` boundaries pass. Such
caches make correctness depend on an implicit immutability contract and can
return stale cards after in-place changes. If card-instance updates become a
measured bottleneck, optimize them at the React or Jotai owner that has the
complete input lifecycle.

Board item filters are applied after each source query and before Now or Next
presentation. Both layers must reuse the same pure matcher. With no active
keywords, return the original items array so the Board setting does not defeat
card memoization or virtual-list identity. Saving a changed filter is expected
to update every card on that board because their visible item sets may change;
source queries and cached results remain unchanged.

Background illustration extraction runs only after the user selects an image or
changes the edge-detail control. Debounce detail changes, resize the longest
image dimension to at most 1800 pixels before reading pixel data, and persist
only the selected processed result: a simplified centerline SVG. Run decoding,
pixel reads, edge extraction, path tracing, and encoding in the dedicated
bg-illustration worker rather than the UI thread. Cache one thinned Canny
edge-magnitude result per selected file. Threshold changes reuse that result;
selecting a different file
replaces the cache, and closing the settings surface releases it. App startup
and ordinary renders must only restore the saved result as a CSS mask; they must
not decode the original upload or repeat edge extraction.
Direct SVG uploads bypass raster decoding and edge extraction. Sanitize and
percent-encode them once on selection, then use the resulting SVG data URL as
the draft. Generated SVG uses the same non-base64 data URL representation.
The fixed React illustration layer owns its viewport subscription and derives
its typed inline mask style directly from the three illustration setting atoms.
Opacity changes must persist only the numeric setting and rerender that layer;
they must not rerun image decoding or edge extraction.
Mirrored persistence must ignore its own `browser.storage.local` echo when the
normalized value already matches the synchronous `localStorage` snapshot. An
echo must not replace arrays or objects with equal copies and trigger a second
render after every Board (including sorting), SourceInstance, or Settings update. A real
background change still replaces the affected slice and notifies its atom.

### Add memo boundaries at independent units

Use `memo` when a component represents an independently updating unit, its props
can remain stable, and React Compiler cannot protect the same boundary. Current
manual boundaries include:

- `DraggableCard`, so board animation and layout work does not enter card data
  and query subtrees while `DesktopBoard` remains excluded from compilation.
- Timeline news content, so minute-label updates do not rebuild unchanged item
  titles and inline metadata below the compiler-excluded virtual list.

Compiler-generated caches isolate the card front, card back, board actions, and
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

Compiler diagnostics are warnings during incremental adoption. Ref-driven
components such as `DesktopBoard`, `DndContext`, and `DynamicIsland` are skipped
when they update latest-value refs during render. `VirtualList` and Next Layer's
`VirtualTimeline` are also skipped because TanStack Virtual returns functions
that cannot be memoized safely. Keep these diagnostics visible and fix a
component only alongside focused behavior and performance verification; do not
suppress them or broadly rewrite imperative integrations merely to increase
compiler coverage.

### Keep refs and callbacks stable

Callback refs are lifecycle callbacks. Replacing one during render can detach
and reattach the DOM node, which may also recreate observers or drag-and-drop
registrations.

- Wrap composed callback refs in `useCallback`.
- Depend on the specific forwarded ref callback, not an entire props object.
- Keep callbacks passed through memoized boundaries stable with `useCallback`.
- Use a small wrapper component when a list item needs to bind a stable parent
  callback to an item key.

### Localize time subscriptions

The shared minute atom intentionally updates once per minute. Subscribe at the
smallest component that renders time-dependent text.

- `RelativeTime` owns card header subtitle updates.
- `Timeline` owns grouped item time labels.
- Card front and back surfaces must not subscribe merely to pass a formatted
  string through a large subtree.
- Memoize time-independent news content below a time-labeling row.

An invisible card side may stay mounted for flip animation, but its entire form
must not render at every minute boundary.

### Separate query state from hidden UI

A card query may render at request start, when fetching-latest tracking changes,
and when data completes. These renders are expected on the front side because
the loading and content UI changes.

Now Layer and Next Layer are two presentations of the same Board data. Card
content reports its resolved metadata and already-filtered items through the
Board items provider, and Next Layer consumes that shared result. Do not mount a
second parameter, permission, or query subscription for Next Layer. When Next
Layer opens, force-mount unloaded Board cards so their single existing query
path can populate the shared timeline.

The hidden card back should render only when one of its own props changes, such
as loader metadata or `updatedAt`. Loading flags that are not card-back props
must not rebuild the editor.

Use stable empty arrays and stable merged metadata objects. Expressions such as
`data?.items ?? []` create a new fallback array on every render and defeat
downstream memoization.

### Keep animation work above card content

Board and Motion components may render multiple times while calculating scatter
vectors or layout transitions. Keep that animation work in the board item and
Motion layers. Stable `DraggableCard` props prevent it from entering queries,
virtual lists, and card editor controls.

Do not remove renders that are required to update Motion props, measured scatter
vectors, or drag state. Optimize the content boundary instead.

The Now/Next transition must not animate a transform on the full mixed timeline
or combine that transform with a large backdrop filter while cards scatter.
The card scatter is the transition's primary motion; Next Layer may follow with
a brief, delayed opacity-only reveal. Keep its timeline virtualized against the
committed Next Layer scroll element so only visible waveform SVGs and rows are
mounted during the transition and subsequent scrolling.

### Observe against the real scroll container

Intersection observers that preload card content must use the root app scroll
container, not the browser viewport. An intermediate overflow container clips
the target before a viewport-rooted observer applies its root margin, which
makes the preload margin ineffective and defers the card's synchronous mount
work until it is already visible.

Use the stable scroll-container ref from the actions context so cards can mount
inside the configured preload margin without subscribing to header progress or
layer activity. Keep the offscreen retention delay to avoid repeated mount work
during short back-and-forth scrolls.

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

## 2026-08-03 Audit Results

The audit used a 1080 by 1890 viewport and an All board containing 12 cards,
with eight card contents mounted by the viewport and preload margin.

| Scenario | Before | After measured | Result |
| --- | ---: | ---: | --- |
| Two Now/Next layer toggles | 1,851 | 61 | Root, header, footer, and card content cascades removed; 96.7% fewer render events. |
| One minute-boundary update | 1,149 | 266 | Whole card fronts and backs no longer update; 76.8% fewer render events. A subsequent timeline content boundary further isolates unchanged news content. |
| Single-card refresh | 389 | 252 | Hidden card-back work reduced from three full renders to one data-completion render; 35.2% fewer render events. |

Settings tab changes remained inside the settings subtree. Metadata and
parameter drafts remained inside the edited card. Search open and close did not
update card content.

These numbers are comparison baselines, not permanent budgets. Data volume,
viewport size, React, Motion, and component implementation can change the raw
counts. Preserve the isolation properties described in the Result column.

## Regression Checklist

Before completing React performance work:

- Review every changed state owner and context provider.
- Confirm unchanged item atoms and card boundary props preserve reference
  identity.
- Confirm memoized props do not contain avoidable new arrays, objects,
  callbacks, refs, or React elements.
- Check both visible and hidden sides of a flipped card.
- Cross a real minute boundary; do not infer timer behavior from static code.
- Let refresh operations reach completion before reading render counts.
- Verify that editing one instance does not render unrelated card content.
- Test scroll and animation behavior visually after adding memo boundaries.
- Switch repeatedly between boards and confirm every populated card renders
  virtual rows after its scroll element is committed.
- Remove all temporary profiling globals and callbacks.
- Confirm compiled components show the `Memo ✨` badge in React DevTools or
  verify that production output contains Compiler memo-cache code such as
  `react.memo_cache_sentinel`.
- Run `bun run lint`, `bun run typecheck`, and `bun run test`.
- Build the Chrome MV3 production extension and confirm React Scan is absent.

## Known Limitations

The `splitAtom` card-subscription migration received static checks and an
ego-lite functional smoke test, but React Scan was not enabled on the existing
development server. Re-baseline the single-card metadata edit scenario before
treating its render count as measured.

The 2026-08-03 ego-lite audit could not reliably generate the browser's native
HTML5 drag event chain. Card reordering received code-path review and existing
pure reorder coverage, but did not receive React Scan event sampling for a real
drag. Repeat that scenario manually or with a browser harness that produces
trusted native drag events before treating drag render behavior as measured.

The 2026-08-04 Next Layer transition optimization received static verification,
type checking, and production-build coverage, but no React Scan capture. Re-run
the Now/Next transition scenario with the same populated board before treating
its frame-time improvement as measured.

React Scan adds development overhead, especially when unnecessary-render
tracking or per-render callbacks are enabled. Compare relative results under
the same instrumentation and do not interpret instrumented duration as
production duration.
