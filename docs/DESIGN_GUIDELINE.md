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

### App background

The main app background defaults to the `ambient-theme-400` wash. Appearance
settings offer eight theme-aware placements and shapes: diagonal `Ambient`,
top-weighted `Sunrise`, bottom-weighted `Horizon`, side-weighted `Orbit`,
concentric `Halo`, crossing `Ribbon`, clouded `Nebula`, and layered `Tide`. Show
each choice as a live color preview, apply it immediately, and persist the
selection. Apply background choices through the app-only `app-background` body
class and its `data-app-background` value; other entrypoints and interface
surfaces keep their existing `sunrise-*` treatments. Keep every background
derived from the active board theme color so choosing a shape does not introduce
an unrelated palette.

## Card Surface Language

Cards define the primary NewsNext surface treatment.

- The outer `3xl` squircle mixes `var(--background)` with the relevant theme
  color at 55%.
- The content panel uses a nested `2xl` squircle with `bg-background/70` and the
  matching `sunrise-*-400` treatment.
- Use `10px` (`p-2.5`) between the outer shell and nested content where the card
  shell must remain visible.
- Place identity and surface actions in the exposed outer shell. Place editable
  fields and primary content in the quieter inner panel.
- Keep compact card action icons content-sized and background-free. Use the
  shared Button `quiet` variant with `icon-fit`; hover may raise icon opacity but
  must not add a filled hover surface or enlarge the action target spacing.

The reference implementation is `CardSurface` in
`apps/extension/src/components/card/card-surface.tsx`.

### Card reordering

- Keep the drag handle visible and give it an accessible name that identifies
  the card being moved.
- Reorder cards according to the closest edge of the card under the pointer so
  the preview distinguishes insertion before and after a card.
- Preserve the original order when a drag is cancelled or ends outside the
  board. Gaps inside the board may retain the most recent valid placement.
- Keep the source card in the layout while dragging and reduce its opacity so
  the original position remains understandable.

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
`sunrise-theme-400`.

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
  `sunrise-theme-400`.
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
the same name, theme color, and card order fields; only edit mode exposes board
deletion, while the title and primary action reflect the current mode. In
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
the provider color token; result rows must not carry provider `sunrise-*` theme
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
