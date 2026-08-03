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

## Measurement Workflow

Measure before and after a change with the same board, viewport, loaded card
count, and interaction sequence. Development mode includes React Scan through a
dynamic import in `apps/extension/src/entrypoints/app/main.tsx`.

- React Scan must load before the React root mounts.
- React Scan must remain development-only. Production builds must not contain
  React Scan code or strings.
- Do not pass `enabled` during initialization. React Scan defaults to enabled
  on first use and persists the toolbar power toggle in `react-scan-options`;
  forcing the option during hot reload overrides the stored user preference.
- Keep the toolbar enabled for interactive inspection and track unnecessary
  renders during development.
- Use temporary `onRender` sampling only while auditing. Remove sampling arrays,
  globals, and debug callbacks before completing the change.
- Use the app's existing development server. Do not start a second server.
- Use ego-lite for repeatable browser interactions and verify the resulting UI
  state after each interaction.

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

### Preserve domain object identity

Memoization only works when unchanged objects retain their references. Derived
board cards must reuse a `BoardSource` while both its `SourceDescriptor` and
`SourceInstance` objects are unchanged.

`buildSourceCards` uses weak caches keyed by the source instance and descriptor.
Jotai update atoms already preserve unchanged instance objects when mapping an
instances array. Together, these guarantees allow a single card edit to change
the edited card's source prop without invalidating every other card.

Do not mutate cached `BoardSource` objects. A source or instance change must
produce a new input object and therefore a new derived card object. Keep a unit
test that verifies changed cards receive a new reference while unchanged cards
retain their previous reference.

### Add memo boundaries at independent units

Use `memo` when a component represents an independently updating unit and its
props can remain stable. Current useful boundaries include:

- `DraggableCard`, so board animation and layout work does not enter card data
  and query subtrees.
- `CardBack`, so front-side query loading state does not rebuild the hidden
  editor.
- Board selection, deletion, and parameter fields inside the card editor, so
  typing in one metadata field does not rebuild unrelated controls.
- Timeline news content, so minute-label updates do not rebuild unchanged item
  titles and inline metadata.

Do not add `memo` mechanically. Inline objects, elements, and callbacks can make
it ineffective, and a comparator that ignores meaningful props can produce
stale UI. Stabilize the data flow first, then add the narrow boundary.

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

## 2026-08-03 Audit Results

The audit used a 1080 by 1890 viewport and an All board containing 12 cards,
with eight card contents mounted by the viewport and preload margin.

| Scenario | Before | After measured | Result |
| --- | ---: | ---: | --- |
| Two Now/Next layer toggles | 1,851 | 61 | Root, header, footer, and card content cascades removed; 96.7% fewer render events. |
| One minute-boundary update | 1,149 | 266 | Whole card fronts and backs no longer update; 76.8% fewer render events. A subsequent timeline content boundary further isolates unchanged news content. |
| Single-card refresh | 389 | 252 | Hidden card-back work reduced from three full renders to one data-completion render; 35.2% fewer render events. |
| Single-card metadata save | All visible card source props changed | One `DraggableCard` and one `Card` changed | The other 11 card content components retained their inputs and did not render. |

Settings tab changes remained inside the settings subtree. Metadata and
parameter drafts remained inside the edited card. Search open and close did not
update card content.

These numbers are comparison baselines, not permanent budgets. Data volume,
viewport size, React, Motion, and component implementation can change the raw
counts. Preserve the isolation properties described in the Result column.

## Regression Checklist

Before completing React performance work:

- Review every changed state owner and context provider.
- Confirm unchanged card and item objects preserve reference identity.
- Confirm memoized props do not contain avoidable new arrays, objects,
  callbacks, refs, or React elements.
- Check both visible and hidden sides of a flipped card.
- Cross a real minute boundary; do not infer timer behavior from static code.
- Let refresh operations reach completion before reading render counts.
- Verify that editing one instance does not render unrelated card content.
- Test scroll and animation behavior visually after adding memo boundaries.
- Remove all temporary profiling globals and callbacks.
- Run `bun run lint`, `bun run typecheck`, and `bun run test`.
- Build the Chrome MV3 production extension and confirm React Scan is absent.

## Known Limitations

The 2026-08-03 ego-lite audit could not reliably generate the browser's native
HTML5 drag event chain. Card reordering received code-path review and existing
pure reorder coverage, but did not receive React Scan event sampling for a real
drag. Repeat that scenario manually or with a browser harness that produces
trusted native drag events before treating drag render behavior as measured.

React Scan adds development overhead, especially when unnecessary-render
tracking or per-render callbacks are enabled. Compare relative results under
the same instrumentation and do not interpret instrumented duration as
production duration.
