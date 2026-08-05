# Design Guideline

This document is the canonical reference for NewsNext interface styling and
interaction-level visual decisions. Keep it aligned with the implemented React
components and Tailwind utilities whenever a UI change establishes or revises a
reusable design rule.

## Visual Direction

NewsNext should feel like a collection of live, tactile information cards rather
than a conventional dashboard. Reuse the card visual language across related
surfaces so dialogs and controls feel native to the board instead of looking
like generic overlays.

- Use theme color to communicate context and ownership, not as decoration.
- Build depth with layered translucent surfaces instead of opaque panels and
  heavy borders.
- Do not add static hairline rings to card surfaces, modal shells, or nested
  modal surfaces; their color and layered backgrounds provide the boundary.
- Prefer squircles for major containers and nested surfaces.
- Keep supporting decoration quiet. Controls and content should remain the
  visual focus.
- Reuse existing component treatments and tokens before introducing another
  surface style.
- Name transition properties explicitly when a component animates one or two
  properties. Use `transition-all` when more than two properties animate to
  keep utility declarations concise.

### App background

Use the top-weighted `zenith-theme-400` wash for the main app background and
related interface surfaces. Derive the wash from the active board theme color
so it reinforces the current context without introducing another palette.

The Appearance settings may let the user choose a local image and extract its
edges into background artwork. Keep processing in the browser, resize large
inputs before pixel work, and show the extracted result before it is applied.
The preview is also the primary drop target and file picker trigger; give it
keyboard access and a visible drag-over state. Provide one edge-detail control
whose explanation makes the threshold direction clear. Applying and removing
artwork are explicit actions; selecting or dropping a file, or changing the
detail preview, must not overwrite the saved background. While the source image
is still available, offer SVG and WebP as a segmented choice in the preview's
lower-left corner and regenerate only the draft when it changes. Hide the
format control after the source leaves memory, and prevent it from triggering
the preview's file picker.

Render saved SVG or WebP artwork as a transparent mask mixed from the foreground
and active theme colors so it adapts to light, dark, and board themes. Keep it
non-interactive, above the grid texture but below app content, anchored to the
bottom-right, partially outside the viewport, and use a user-adjustable opacity
from 1% to 20%, defaulting to 7%; cards and controls must remain visually
dominant. Use a fixed 1% grid-line opacity across themes and surfaces, regardless
of whether artwork is active or which artwork opacity is selected. Allow the two
transparent layers to blend naturally without adding a backing color beneath
artwork pixels. Scope the artwork to the main app entry point rather than popup
or component-preview surfaces. Process and store the image locally; do not
upload it or retain the original input file.
Bridge only short gaps whose endpoint directions align so faint strokes remain
continuous without joining unrelated nearby contours. Apply this connection
step only to SVG. WebP must use the original graded Sobel raster extraction
without sharpening, Canny thinning, or SVG path work.

## Card Surface Language

Cards define the primary NewsNext surface treatment.

- The outer `3xl` squircle mixes `var(--background)` with the relevant theme
  color at 55%.
- The content panel uses a nested `2xl` squircle with `bg-background/70` and the
  matching `zenith-theme-400` treatment.
- Scope the provider's existing color class at the card boundary, then consume
  its inherited `--color-theme-*` properties through static `theme-*` Tailwind
  utilities instead of constructing palette class names at runtime.
- Keep Tailwind shades 100–900 available through provider-scoped `theme-*`
  colors so shared components can add states without changing the theme
  contract.
- Keep the selectable theme palette intentionally distinct: red, pink, fuchsia,
  purple, indigo, blue, cyan, teal, green, amber, orange, and slate.
- Use `10px` (`p-2.5`) between the outer shell and nested content where the card
  shell must remain visible.
- Place identity and surface actions in the exposed outer shell. Place editable
  fields and primary content in the quieter inner panel.
- Keep compact card action icons content-sized and background-free. Use the
  shared Button `quiet` variant with `icon-fit`; hover may raise icon opacity but
  must not add a filled hover surface or enlarge the action target spacing.
- Fade and pulse card content during an explicit latest-data refresh, or while
  an automatic query is fetching without current or placeholder data. Keep
  renderable previous data visually stable during automatic background refreshes.
- Keep explicit refresh feedback visible for at least 500ms, including when the
  one-minute request guard reuses the preceding result immediately.
- The default Button already uses the current primary theme. Set its `tone` to
  `theme` only when adapting another visual hierarchy, such as `outline`, to
  the current card or provider color. Do not encode color context into new
  compound variant names.
- The header Dynamic Island expands to a 280px by 120px panel, which fits the
  shared theme selector's six-column palette with compact shell padding.

The reference implementation is `CardSurface` in
`apps/extension/src/components/card/card-surface.tsx`.

### Next Layer mixed timeline

Next Layer recomposes the current board's card items into one continuous feed.
It is a reading view of the same source data, not another board or a second card
design. Combine all source items into a newest-first timeline. Use the source
update time when an item has no timestamp, matching the existing card timeline
semantics. Break equal timestamps by original rank and then card order so tied
items remain predictably mixed. Keep source identity and effective timeline
placement legible through the grouped time labels, but do not display ranking
numbers in the mixed timeline.

Render the mixed feed as a visible timeline, using the shared waveform rail and
grouped relative-time labels from card timelines. Let each rail segment inherit
its source color so source changes are legible without creating separate card
surfaces. The timeline rail and time groups own the sequence; avoid adding a
second visible order indicator inside the item row.

Use the shared `NewsItemSummary` treatment for mixed timeline content. Its
three-line clamp bounds long items while preserving inline icons and metadata;
let the virtualizer measure the resulting row instead of assigning separate
fixed mobile and desktop heights. Time-group labels remain outside the measured
content row.

Reveal Next Layer with one brief, slightly delayed opacity fade so it follows
the card scatter without competing with it. Do not scale or blur the full
timeline during this transition.

Treat the entire Next Layer page as the expanded card. Do not add another card
shell, nested content squircle, panel shadow, or per-item card inside it. Place
the compact Timeline title and source/item counts directly in the page flow,
then continue into the timeline without a surface boundary. Provider theme
colors stay local to the timeline rail, source identity, and hover state while
the page inherits the active board theme. Do not place filter controls in Next
Layer; configure the shared Now/Next item filter in the Board dialog.

### Card reordering

- Keep the drag handle visible and give it an accessible name that identifies
  the card being moved.
- Reorder cards according to the closest edge of the card under the pointer so
  the preview distinguishes insertion before and after a card.
- Preserve the original order when a drag is cancelled or ends outside the
  board. Gaps inside the board may retain the most recent valid placement.
- Keep the source card in the layout while dragging and reduce its opacity so
  the original position remains understandable.
- Keep the drag preview inside the source provider's theme-color scope. Native
  drag previews are mounted outside the card tree, so inherited theme tokens
  used by cloned content must be copied to the preview container.

## Dialog Patterns

Choose the dialog structure from its information architecture rather than
applying one frame treatment to every modal.

### Shared modal foundation

All modal-style UI, including dialogs, alert dialogs, and command dialogs, must
reuse the shared modal components instead of defining local backdrop values or
motion. `ModalOverlay` uses `bg-black/75` without backdrop blur and applies a
`150ms` opacity fade. `ModalPopup` owns the centered modal motion, while
`ModalTitle`, `ModalDescription`, and `ModalCloseButton` own their shared visual
treatments. Centered surfaces use a `3xl` outer squircle, the shared 60% popover
/ 40% theme shell color, and a `10px` shell inset where a nested surface is
present. Nested content uses a `2xl` shape with `bg-background/70` and
`zenith-theme-400`.

Primitive-specific components compose `ModalOverlay`, `ModalPopup`,
`ModalCloseButton`, `ModalTitle`, and `ModalDescription` from
`@newsnext/ui/components/modal`. Keep the shared styling encapsulated directly
in these components instead of introducing parallel CSS utilities.

The Foundation modal structure is mandatory for every centered modal: keep a
compact header in the exposed top shell, then place all descriptions, fields,
primary content, and actions in a nested neutral surface below it. The title
must never move into the nested surface. `DialogContent` provides the shell;
callers compose `DialogHeader` followed by a `modal-inner` `SquircleBox`.
`AlertDialogContent` follows the same structure with `AlertDialogHeader` and
`AlertDialogBody`. When an alert uses an icon, place it in a compact standard
rounded surface in the top header instead of applying squircle clipping to such
a small element or using a large circular badge.

Keep content-specific layouts distinct when needed, but keep overlay opacity,
shell color, primary radii, close-button treatment when present, and motion
consistent. Popover menus and anchored transient controls do not use a modal
overlay.

When a destructive action already lives inside a modal, prefer an inline
two-step confirmation over opening another modal on top. The first activation
arms the existing destructive button and changes its label to an explicit
confirmation action. Its icon must also change from the original action icon to
a warning or confirmation icon so the state change is not communicated by text
alone. The second activation performs the operation. Moving focus away must
cancel the armed state.

### Single-column dialogs

Single-column dialogs related to boards should use the card surface language.
They must have:

- A theme-colored outer `3xl` squircle using the Settings dialog color ratio:
  60% `var(--popover)` and 40% `var(--color-theme-400)`. Its structure follows
  cards, but its restrained color balance follows Settings.
- `10px` (`p-2.5`) of outer padding on every side, leaving a visible theme-colored
  shell around the nested content.
- A compact top shell area containing the dialog title and close button.
- A nested `2xl` content squircle using `bg-background/70` and
  `zenith-theme-400`.
- Content padding of `24px` (`p-6`).
- A consistent vertical rhythm: `24px` between form sections and `8px`
  between a section title or field label and its control.
- Theme color choices arranged as a centered grid with an equal `8px` gap on
  both axes. Do not stretch the columns to fill a wide dialog.
- Theme color edits remain draft state until the user saves. Changing the
  selected option must not alter the existing board theme or the dialog shell
  before `Save changes` is activated.
- No generic descriptive copy between the title and the first field when the
  form labels already make the task clear.

The unified Board dialog is the canonical example. Create and edit modes use
the same name, theme color, card order, and item filter fields; only edit mode
exposes board deletion, while the title and primary action reflect the current
mode. The item filter uses one segmented `Show matches` / `Hide matches` mode
and one comma-separated keyword field. Keep the short matching-scope note
because it explains that titles and inline text are both searched. In
particular, do not add the following descriptions back to this dialog:

- `Personalize this board and choose how its cards are arranged.`
- `Group cards around a topic, project, or reading routine.`

### Multi-column settings dialog

The Settings dialog may use a perimeter frame because its navigation rail and
content panel create a clear multi-column relationship. Reserve a shared top
shell area for the `Settings` title, active tab subtitle, and close button. Show
the title and subtitle as one compact hierarchy, such as `Settings / General`:
the dialog title is primary, while the active tab is smaller and muted. Do not
split them into competing column headings or repeat the active tab subtitle
inside the nested panel. Keep the navigation in the outer tinted surface and
the active settings content in a nested neutral squircle. Do not copy this
multi-column frame directly into a single-column dialog.

Keep settings controls compact and visually consistent. Use a 6px slider track
with a clearly visible themed range and a 14px thumb filled with a light theme
shade; the track and thumb must remain legible against nested tinted surfaces.
Use 32px buttons for ordinary settings
actions, keep adjacent actions the same height and text size, and use `ghost`
rather than the icon-oriented `quiet` variant for text-only tertiary actions.
Keep destructive removal actions inside the same button group and use the
`destructive` treatment instead of presenting them as detached text. Theme-
colored buttons use white text in both light and dark modes.
Group closely related controls in columns when the available width permits it,
while keeping labels, values, and necessary recovery guidance adjacent to their
control. Omit helper text when the label and visible control already explain the
setting.
Reset the shared settings content scroller to the top when the active tab
changes; do not remount tab content or discard unsaved control state to do so.

### Search dialog

The Search dialog is a compact, single-column card locator. Keep its title and
shortcut hint in the exposed top shell, and place the search field and results
inside one nested `2xl` neutral squircle. Group results by board in the saved
board order, omit empty groups, and place unassigned or orphaned cards in a
final `No board` group. Within each group, show the card title and provider;
the group heading supplies the board context without repeating it on every row.
Use `12px` horizontal and `10px` vertical padding for search result rows so the
single-line identity remains compact without feeling cramped. Keep the title,
provider, and selected keyboard action on one row; truncate the title first and
omit the provider label when it duplicates the resolved card title.

Treat the Search input as the top row of the nested content panel, not as a
separate pill-shaped control. It has no independent radius or filled surface;
use a quiet bottom divider that strengthens on focus without an outer focus
ring. The input remains auto-focused and keeps a visible search icon.

The modal shell inherits the current board theme and must remain stable while
selection changes. Use the selected result's provider color only for its active
row treatment. This keeps card identity local to the result instead of allowing
it to recolor the whole dialog. Apply that selected background directly from
the provider color token; result rows must not carry provider `zenith-*` theme
classes. Keep dividers and selection treatments quiet.
Selected result color must update immediately without a color transition so
keyboard navigation never feels behind the current selection.
Activating a result closes the dialog, opens the card's assigned board, and
scrolls the real card into view. Cards in the final `No board` group open on the
All board. Do not embed a live card preview in Search: a full card turns the
locator into a second board, duplicates surface insets, and delays useful
results while card content loads. Do not add decorative artwork or generic
helper copy.

## Copy

- Use English sentence case for user-facing text.
- Prefer labels and action names that state exactly what users control.
- Remove helper text that repeats information already conveyed by the title,
  field labels, or visible controls.
- Keep validation and consequence text when it helps users recover or make an
  informed destructive decision.

## Segmented Controls

Segmented radio groups use the same interaction language as the board
navigation pill: `4px` gaps inside the shared island surface, muted inactive
labels that only increase contrast on hover, and a theme-colored active pill.
Do not scale or add a filled background on hover. Use the theme-colored focus
ring and a subtle pressed offset for keyboard and pointer feedback. Move the
active pill between options with the same shared-layout spring as Board Nav;
each group must use an isolated layout identity so simultaneous controls do not
share animation state. The shared `PillGroup`, `pillGroupItemClassName`, and
`PillGroupIndicator` primitives own the common container, item styling, and
active background. Navigation and form-control semantics remain in their
owning components.

The theme selector is a separate palette control, not a RadioGroup visual
variant. It owns its color grid, logo-shaped choices, hover scaling, and moving
selection marker while using Base UI radio primitives for accessible selection
semantics.

## Dynamic Islands

Dynamic islands are compact, centered controls that expand in place to reveal
a single focused interaction. The shared component owns the opaque black
surface, fine inner highlight, shadow, clipping, and spring-based size and
radius transition. Its collapsed outline remains a standard round pill, while
the expanded outline uses the shared progressive squircle capability layer:
native
`corner-shape: squircle` first, generated `clip-path: shape()` geometry second,
and a standard `border-radius` fallback. Keep the animated island's shadow on
an unclipped Motion shell and apply the squircle treatment to its inner surface
so fallback clipping does not cut off elevation. Static surfaces should use
`SquircleBox`, which consumes the same capability layer directly. Callers
provide layout and theme-aware content, but must not layer `island-pill`,
another background, a competing radius, or independent width and height
transitions onto the island surface.

By default, follow the full progressive chain through `clip-path` before using
standard rounded corners. Set `fallback="border-radius"` only when the fallback
browser should skip clipping, such as surfaces with their own outset shadows,
filters, or complex compositing. Native `corner-shape` remains the first choice
when available.

- Keep the collapsed state short, fully pill-shaped, and visually denser than
  surrounding translucent header controls.
- Animate the surface as one continuous shape. Remounted content enters with a
  brief scale, opacity, and blur transition inside the clipped surface.
- Keep expanded content to one task and close it on outside click or scroll.
- Preserve a visible keyboard focus treatment and honor reduced-motion
  preferences.

## Implementation Checklist

When changing interface styling:

1. Check whether an existing card, dialog, control, or surface already provides
   the intended treatment.
2. Keep theme variables and shared Tailwind utilities intact instead of using
   isolated literal colors.
3. Verify hierarchy, squircle clipping, padding, close-button alignment, focus
   states, and both light and dark themes.
4. Use ego-lite to inspect extension UI changes at
   `chrome-extension://cffgbnjiaakknooiegnjkojemhidheke/app.html`.
5. Update this document when the change creates, removes, or revises a durable
   design rule.
