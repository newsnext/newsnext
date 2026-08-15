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
- In light mode, use `neutral-700` for the shared foreground and
  `neutral-600` for muted foreground text. Let weight and semantic color create
  emphasis instead of placing near-black text across the pastel surfaces.
- Use the active `theme-400` color for shared light-mode focus borders and
  rings instead of a neutral ring that reads as a black outline.
- Render the header's shared island controls on `bg-background/60` in light
  mode so they inherit the page wash without becoming muddy gray. Retain the
  deeper `bg-black/10` treatment in dark mode.
- Build depth with layered translucent surfaces instead of opaque panels and
  heavy borders.
- Do not add static hairline rings to card surfaces, modal shells, or nested
  modal surfaces; their color and layered backgrounds provide the boundary.
- Do not render dedicated close buttons on modal or popup surfaces. Preserve
  Escape and backdrop dismissal for non-blocking dialogs, and keep explicit
  semantic actions such as Cancel where the user must confirm or abandon a
  consequential operation.
- Prefer squircles for major containers and nested surfaces.
- Keep supporting decoration quiet. Controls and content should remain the
  visual focus.
- Use Phosphor Bold icons throughout the interface so compact controls remain
  legible. Preserve Phosphor Duotone icons in card header actions, where their
  softer treatment belongs to the established card language.
- Reuse existing component treatments and tokens before introducing another
  surface style.
- Keep 24px of breathing room at both the top and bottom of the main app page.
- Name transition properties explicitly when a component animates one or two
  properties. Use `transition-all` when more than two properties animate to
  keep utility declarations concise.

### App background

Use the top-weighted `zenith-theme-400` wash for the main app background and
related interface surfaces. Derive the wash from the active board theme color
so it reinforces the current context without introducing another palette.

Resolve the persisted light, dark, or system appearance mode and theme color in
a blocking head script before loading the application entry. Apply the resolved
mode and color class to the document element, and keep both `html` and `body` on
`var(--background)` so the browser's initial frame matches the user's preference
instead of exposing its default canvas color or default theme wash.
Synchronize the themed favicon in the app entry before mounting React. Keep this
separate from the head bootstrap and provider composition so favicon work does
not delay the initial background or depend on board effects.

The Appearance settings may let the user choose a local raster image and extract
its edges into background illustration, or use a local SVG directly. Keep processing
in the browser, sanitize direct SVG illustration, resize large raster inputs before
pixel work, and show the result before it is applied.
The preview is also the primary drop target and pointer-based file picker trigger;
give it a visible drag-over state. Keep the preview canvas on its
own background and outside the padded settings card that contains its controls.
Show file validation errors and processing progress inside the bottom-left of
the preview so feedback stays attached to the affected content.
Make the preview a scaled representation of the app background by reusing its
base background color, theme wash, fading grid texture, illustration color mix, and
current illustration opacity. Preserve the current app viewport's aspect ratio, and
scale the grid spacing and illustration insets by the same ratio. Cap the preview at
16rem high and reduce its width proportionally when the viewport is tall.
Use the same illustration placement in the preview and the app. When illustration is
present, let the user drag it to reposition, scale it proportionally from corner
handles, and rotate it from a dedicated handle. Size the transform target to
the illustration's actual contained bounds rather than the larger mask positioning
region, and use the same bounds for the applied background. Provide themed snap
guides for the preview center lines and quarter-turn rotations. Do not duplicate the direct
manipulation handles with alignment buttons or scale and rotation sliders.
Offer the reset action as a single icon button in the preview's upper-right
corner. Keep the transform control box synchronized when reset or another
programmatic adjustment changes the target. Keep transform edits in the draft until
`Apply background` saves the illustration and its transform together. Persist the
illustration center as horizontal and vertical percentages of the viewport rather
than persisting an offset from the responsive default layout. Resolve the
required translation from that center after recalculating the contained illustration
bounds, so placement remains stable when the window size changes.
Use bottom alignment with horizontal centering as the default placement and
preserve that responsive anchor until the user directly transforms the illustration.
Reset must restore this bottom-center anchor, 100% scale, and 0° rotation.
Provide one edge-detail control whose explanation makes the threshold direction
clear. Applying and removing illustration are explicit actions; selecting or
dropping a file, or changing the detail preview, must not overwrite the saved
background. Raster sources always produce SVG line art. Direct SVG uploads
bypass edge extraction and use the sanitized vector as the draft. Store both
generated and uploaded illustration as percent-encoded `data:image/svg+xml` URLs,
without base64 encoding.

Render saved SVG illustration as a transparent mask mixed from the foreground
and active theme colors so it adapts to light, dark, and board themes. Keep it
in a fixed, non-interactive React layer portaled to `body`, above the grid
texture but below app content. Pass its mask, bounds, color, opacity, and
transform through typed inline style rather than global CSS custom properties.
Use a user-adjustable opacity
from 1% to 20%, defaulting to 7%; cards and controls must remain visually
dominant. Use a fixed 1% grid-line opacity across themes and surfaces, regardless
of whether illustration is active or which illustration opacity is selected. Allow the two
transparent layers to blend naturally without adding a backing color beneath
illustration pixels. Scope the illustration to the main app entry point rather than popup
or component-preview surfaces. Process and store the image locally; do not
upload it or retain the original input file.
Bridge only short gaps whose endpoint directions align so faint strokes remain
continuous without joining unrelated nearby contours. Remove small isolated
edge components, then crop the generated SVG view box to the cleaned line-art
bounds with a small safety margin. The illustration's intrinsic size and transform
target must therefore follow the visible strokes rather than the source image
canvas.

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
- Use the semantic `primary` color for the current app-level accent instead of
  writing `theme-500` directly. Reserve explicit `theme-*` shades for locally
  scoped palettes, such as provider-colored cards, theme choices, and tonal
  gradients.
- Keep standard `Card` and `Alert` surfaces on the shared semantic `background`
  and `foreground` colors. Do not introduce a separate card color pair; create
  hierarchy with the established translucent or theme-mixed surface treatments.
- Build semantic surface colors from Tailwind palette variables when an exact
  palette value exists; avoid duplicating those colors as raw OKLCH or hex
  literals.
- Keep the standard `muted` surface aligned with the cards' translucent
  `neutral-400/10` treatment. Use explicit Tailwind shades only where a card
  state cannot preserve its established light and dark colors through an
  existing semantic token.
- Keep the selectable theme palette intentionally distinct: red, pink, fuchsia,
  purple, indigo, blue, cyan, teal, green, amber, orange, and slate.
- Use `10px` (`p-2.5`) between the outer shell and nested content where the card
  shell must remain visible.
- Let users choose a desktop source-card height in Appearance settings:
  `Compact` (`480px`), `Balanced` (`500px`), or `Tall` (`576px`). Default to
  `Balanced`. Allow specialized responsive surfaces such as Radar to provide
  their own card dimensions.
- Present card-height choices with equal-width silhouettes rendered at their
  actual heights. Order them from compact to tall, with the default balanced
  height in the middle. Keep option backgrounds transparent and confine the
  selected theme accent to the silhouette outline and shape label.
- Place identity and surface actions in the exposed outer shell. Place editable
  fields and primary content in the quieter inner panel.
- Keep compact card action icons content-sized and background-free. Use the
  shared `CardHeaderActionButton`; hover may raise icon opacity but must not add
  a filled hover surface or enlarge the action target spacing.
- Fade and pulse card content during an explicit latest-data refresh, or while
  an automatic query is fetching without current or placeholder data. Keep
  renderable previous data visually stable during automatic background refreshes.
- Keep explicit refresh feedback visible for at least 500ms, including when the
  one-minute request guard reuses the preceding result immediately.
- The default Button uses the app-level primary theme. Set its `tone` to
  `theme` for both filled and outline actions inside provider-colored cards so
  their highlight follows the card's scoped `theme-*` palette. Do not encode
  color context into new compound variant names. Keep theme outline actions
  transparent at rest and reveal their tinted surface on hover or focus so
  secondary actions do not compete with the filled primary action.
- The header Dynamic Island expands to a 280px by 160px appearance panel. Keep
  the shared theme selector's six-column palette as the primary control and place
  the same segmented theme-mode control used in Appearance settings below it.
  Present its Dark, Light, and System options as moon, sun, and monitor icons in
  both locations, with accessible labels and tooltips. Keep the default 40px
  control height in Settings and use the compact 32px height in the island so it
  matches the palette icons. Icon-only segmented items must be square with equal
  padding on every side: 32px items in Settings and 28px items in the island.
  On the island's opaque black surface, give the control a translucent white shell
  and fine white inset edge so its boundary remains visible. Reserve an 80px fixed
  region for the palette and 16px between the mode control and palette so their
  internal and outer spacing remain stable. The All board permits theme color
  changes here while keeping its other behavior fixed.

The reference implementation is `CardSurface` in
`apps/extension/src/components/card/card-surface.tsx`.

### Next Layer mixed timeline

Next Layer recomposes the current board's card items into one continuous feed.
It is a reading view of the same source data, not another board or a second card
design. Do not expose Next Layer on the All board; it is available only for
configurable boards. Combine all source items into a newest-first timeline. Use
`publishedAt`, falling back to `updatedAt`, and use the source update time when
an item has neither, matching the existing card timeline semantics. Break equal
times by original rank and then card order so tied items remain predictably
mixed. Keep source identity and effective timeline
placement legible through the grouped time labels, but do not display ranking
numbers in the mixed timeline.

When a news item row has a hover surface, make the entire surfaced row its link
target and provide an equivalent visible keyboard-focus state. Do not place a
smaller link inside a larger hover-only container.

Render the mixed feed as a visible timeline, using the shared waveform rail and
grouped relative-time labels from card timelines. Let each rail segment inherit
its source color so source changes are legible without creating separate card
surfaces. The timeline rail and time groups own the sequence; avoid adding a
second visible order indicator inside the item row.

Use the shared `NewsItemSummary` treatment for mixed timeline content. Its
three-line clamp bounds long items while preserving semantic icons, marks, and
the composed item details; let the virtualizer measure the resulting row
instead of assigning separate fixed mobile and desktop heights. Render item
icons and marks at the same 16px height with intrinsic width, object-contain,
and standard-rounded treatment; sources do not control image scale or corner
radius.
Render shared item stats after the authored inline details as compact
icon-and-count pairs. Use one stable icon for each shared stat, compact number
formatting, tabular numerals, and a text alternative or tooltip with the full
meaning. Source templates must not repeat stats as prose; keeping author and
source-specific attributes textual makes the two kinds of metadata easy to
scan without adding badges or another surface.
Before rendering marks from a source, scan the first mark for meaningful
symmetrical vertical padding and derive one scale for the remaining items. Aim
for a 14px visible-content height inside the 16px image box; this reproduces the
established `1.5` scale for the Weibo mark without treating `1.5` as a universal
cap. Apply the result as a centered CSS transform rather than changing layout
height or clipping the image. Preserve intrinsic horizontal proportions and do
not redraw each image. Keep icons on their original image path to avoid
pixel-analysis work across avatar-heavy feeds.
Time-group labels remain outside the measured content row.

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

### Keyboard shortcut settings

Keep user-editable keyboard shortcuts in a dedicated Settings tab. Present each
command as a compact row with its purpose, platform-aware binding, and reset
action. Start recording from the binding itself, preserve the current binding,
and indicate capture with a theme-colored ring. Keep cancellation and clearing
instructions visible in the section description. Store portable bindings so the
same setting can render native modifier labels on each platform. A cleared
binding disables the command without removing it from the editor. Outside
text-entry controls, single-action commands own their configured key regardless
of focused buttons. Single-key commands defer to text entry, while modified
global commands such as Search can remain active there. Users can change or
clear a binding when they prefer the key's native control behavior.
Size shortcut rows from their settings-panel container rather than the viewport:
stack command details above controls in narrow panels, keep every binding button
the same width with its label centered, and keep reset as a compact labeled icon
action. Give the binding and reset controls the same `40px` height, with reset
using a `40px` square hit area. Apply the shared `island-pill` surface treatment
to both controls. Render bindings as quiet `kbd` text rather than monospace
labels.
Read every visible shortcut hint from the saved binding instead of duplicating
defaults in feature UI. Hide a hint when its command binding is cleared.
Previous and next board commands wrap across the ordered board list. Keep their
default arrow bindings active from the page and focused board tabs, while
preserving directional-key behavior inside other interactive controls.

### Card reordering

- Keep the All board in its fixed newest-first order and omit drag handles there;
  reordering is a configurable-board interaction.
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
`ModalTitle` and `ModalDescription` own their shared visual
treatments. Centered surfaces use a `3xl` outer squircle, the shared 60%
background / 40% theme shell color, and a `10px` shell inset where a nested surface is
present. Nested content uses a `2xl` shape with `bg-background/70` and
`zenith-theme-400`.

Primitive-specific components compose `ModalOverlay`, `ModalPopup`,
`ModalTitle` and `ModalDescription` from
`@newsnext/ui/components/modal`. Keep the shared styling encapsulated directly
in these components instead of introducing parallel CSS utilities.

For centered task modals with a visible title, keep a compact header in the
exposed top shell, then place all descriptions, fields, primary content, and
actions in a nested neutral surface below it. The title must never move into
the nested surface. `DialogContent` provides the shell; callers compose
`DialogHeader` followed by a `modal-inner` `SquircleBox`. Compact command
dialogs such as Search may omit the visible header and begin directly with the
nested interactive surface, while retaining an accessible hidden title and
description.

`AlertDialogContent` follows the same structure with `AlertDialogHeader` and
`AlertDialogBody`. When an alert uses an icon, place it in a compact standard
rounded surface in the top header instead of applying squircle clipping to such
a small element or using a large circular badge.

Keep content-specific layouts distinct when needed, but keep overlay opacity,
shell color, primary radii, and motion consistent. Popover menus and anchored
transient controls do not use a modal overlay.

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
  60% `var(--background)` and 40% `var(--color-theme-400)`. Its structure follows
  cards, but its restrained color balance follows Settings.
- `10px` (`p-2.5`) of outer padding on every side, leaving a visible theme-colored
  shell around the nested content.
- A compact top shell area containing the dialog title for task-oriented forms.
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
- Disable the relevant controls while an asynchronous Application Action is
  pending. Close an editor or commit its local draft only after success, and
  keep an inline `role="alert"` message attached to the affected form when the
  Action fails.
- No generic descriptive copy between the title and the first field when the
  form labels already make the task clear.

The unified Board dialog is the canonical example. Create and edit modes use
the same name, theme color, card order, default view, and item filter fields;
only edit mode exposes board deletion, while the title and primary action
reflect the current mode. Default view uses a compact segmented `Now` / `Next`
control and determines which Board view opens by default. The item filter uses
one segmented `Show matches` / `Hide matches` mode
and one comma-separated keyword field. Keep the short matching-scope note
because it explains that titles and structured item details are both searched. In
particular, do not add the following descriptions back to this dialog:

- `Personalize this board and choose how its cards are arranged.`
- `Group cards around a topic, project, or reading routine.`

### Card Collection membership

The Card back edits Collection membership with a checkbox menu, not a
single-choice Board select. An Instance may belong to zero, one, or several
Collections. The compact trigger shows `No boards`, the sole Board name, or the
membership count; the menu lists every custom Board with independent checked
state. Toggling one row must not remove other memberships. The aggregate All
Board is a system View and never appears as a membership option.
Disable only the membership row whose Action is pending so other memberships
remain readable and independently controllable.

### Multi-column settings dialog

The Settings dialog may use a perimeter frame because its navigation rail and
content panel create a clear multi-column relationship. Place the `Settings`
title above the navigation rail instead of reserving a shared header row, so
the active content panel reaches the top of the dialog without an outer gap.
Do not show the active tab as a subtitle above the panel. Keep the navigation
in the outer tinted surface and retain the active settings content's internal
padding inside its nested neutral squircle. Do not copy this multi-column frame
directly into a single-column dialog.

Keep settings controls compact and visually consistent. Use a 6px slider track
with a clearly visible themed range and a 14px thumb filled with a light theme
shade; the track and thumb must remain legible against nested tinted surfaces.
Use 32px buttons for ordinary settings
actions, keep adjacent actions the same height and text size, and use `ghost`
rather than the icon-oriented card action composition for text-only tertiary actions.
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

The Search dialog is a compact, single-column card locator. Do not show a
visible title, header, or shortcut hint; open directly into the search field
and results inside one nested `2xl` neutral squircle. Retain a screen-reader-only
title and description for dialog semantics. Group results by board in the saved
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
results while card content loads. Do not add decorative illustration or generic
helper copy.

## Copy

- Use English sentence case for user-facing text.
- Prefer labels and action names that state exactly what users control.
- Remove helper text that repeats information already conveyed by the title,
  field labels, or visible controls.
- Keep validation and consequence text when it helps users recover or make an
  informed destructive decision.

## Component previews

Organize Cosmos as a component catalog with three clear levels: `Basics` for
reusable UI primitives, `Patterns` for NewsNext-specific compositions, and
`Cards` for complete source-card states. Business dialogs and full source
cards must not appear in Basics when only one of their underlying controls is
being documented.

Use the shared Cosmos specimen layout for Basics pages: a category label,
component title, one-sentence usage description, and quiet bordered specimen
sections. Use monospace state labels only when comparing meaningful states
such as hierarchy, size, invalid, or disabled. Keep the catalog canvas neutral
and let the rendered component carry the visual emphasis.

Keep a Typography fixture in Basics that covers the actual NewsNext hierarchy:
display and section headings, feed titles, reading text, metadata, links, labels,
tabular numbers, and code identifiers. Use representative product content so
the specimen validates reading rhythm rather than isolated font sizes.

Keep a single Colors fixture in Basics as the palette reference. Group all
semantic surface and foreground pairs, supporting control colors, and every
provider theme scale there. Component fixtures may still demonstrate their
color-dependent states, but must not become competing palette references.

Give Buttons and Badges separate Basics fixtures. The Buttons reference covers
every public variant and size once, then demonstrates supported states, icon
placement, provider theme tone, and render-prop composition without expanding
them into a redundant matrix of every possible combination. Keep the actual
card button families together in a provider-scoped specimen: header icon
controls, compact edit actions, parameter choices, and source-state actions.
Show those controls without moving a complete source card into Basics. Preserve
their intrinsic content width in the catalog and cap them at the specimen width;
grid-based fixture containers must not stretch buttons into full-width actions.

Keep shared Button variants limited to reusable visual hierarchy. Contextual
treatments are compositions: card header icons use `CardHeaderActionButton`,
and top-level translucent controls apply `island-pill` to a transparent Button.
Do not add `quiet`, `island`, or other business-context names back to the shared
variant API.

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
- When the collapsed header island shows scroll progress, tint the completed
  outline with the active theme color and give that path a restrained matching
  glow outside the opaque surface. Render that glow on the unclipped shell so
  it can extend beyond the island edge, and keep it tied to the progress path
  and its visibility instead of illuminating the entire island at rest.
- Animate the surface as one continuous shape. Remounted content enters with a
  brief scale, opacity, and blur transition inside the clipped surface.
- Keep expanded content to one task and close it on outside click or scroll.
- Preserve a visible keyboard focus treatment and honor reduced-motion
  preferences.

## Desktop Tray Menu

Keep the desktop tray menu task-first and compact. Open NewsNext is the first
action, connection status is non-interactive supporting information, and Quit
NewsNext remains the final action separated from status. Disable Open NewsNext
when no extension is connected. With one connection, keep it as a direct menu
item; with multiple connections, turn it into a submenu whose children name
the detected browser and a short stable instance identifier. Sort those children
so the menu does not reorder as connections report status.

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
