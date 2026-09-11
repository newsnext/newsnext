# Design Guideline

This document is the canonical reference for NewsNext interface styling and
interaction-level visual decisions. Keep it aligned with the implemented React
components and Tailwind utilities whenever a UI change establishes or revises a
reusable design rule.

## Shared foundations

`@newsnext/shared` owns the theme palette and foundational data types and must
not depend on the SDK or CLI. UI components consume these shared definitions
directly. The SDK also imports and re-exports these definitions from shared;
keep each definition in `packages/shared/src` without generated copies.

## Visual Direction

NewsNext should feel like a collection of live, tactile LiveCards rather
than a conventional dashboard. Reuse the LiveCard visual language across related
surfaces so dialogs and controls feel native to the board instead of looking
like generic overlays.

### Landing page

Use Tailwind utilities in the landing app's React components for layout,
typography, spacing, responsive behavior, and interaction states. Keep the global
stylesheet limited to theme tokens, shared background imports, and base rules.
Use mobile-first styles and default Tailwind breakpoints for responsive layouts.
Use the standard container widths, spacing, typography, and shadow scales rather
than carrying over arbitrary pixel values from older CSS. Keep semantic theme
colors and SVG geometry separate from those layout scales.
Reuse the page shell and the intro outcome component for repeated structure.

Keep the landing page to one centered product introduction with an Apple-inspired
emphasis on the app icon, confident typography, and generous whitespace. Stack a
`w-24 sm:w-32` app icon and `w-32` shared wordmark with `gap-5`, followed by the
product introduction after `mt-8`. Keep the introduction within `max-w-lg` and
the centered main area within `max-w-3xl`.
Use "Your personal dashboard" as the page heading, with medium-weight neutral
`text-2xl sm:text-3xl` typography and `tracking-tight`. Place "Live updates",
"Track changes", and "Spot trends" in three equal columns with `mt-5` and
`gap-2 sm:gap-5`. Use muted, medium-weight `text-xs sm:text-sm` text and small
static accent-colored symbols for live signals, change, and trend. Keep all three
columns in one row; symbols sit above their phrases by default and beside them
from `sm` upward. Keep symbols decorative and hidden from assistive technology.
Place the GitHub action after `mt-7`, using `min-h-12 px-6 py-3`. Use a simple
solid neutral GitHub pill, without glass layers or decorative highlights.
Preserve the icon's soft silhouette shadow with the named `drop-shadow-brand`
theme token: `0 8px 12px rgb(0 0 0 / 8%)`, with `dark:drop-shadow-black/20`.
This brand treatment is an intentional exception to the standard shadow scale.
Use optical centering with more space below the introduction, and let short
viewports scroll naturally. Center the footer in two compact rows with `gap-1`:
the project attribution in a `max-w-sm` balanced paragraph, followed by Privacy
and Support separated by a decorative middle dot. Keep the attribution softer,
underline its repository link, and give navigation links `min-h-8 px-2` targets.
Omit a separate brand header and footer divider.
Adapt text, buttons, and shadows to dark mode and honor reduced motion.
Use the extension's current gradient SVG icon, generous whitespace, and the same
light/dark neutral background and foreground tokens. Reuse `zenith-theme-400/60`
for the soft red light from above and `page-background.css` for the faint masked
grid below. Keep this background fixed to the viewport on long supporting pages.
Keep the footer quiet and
allow the content to scroll on short screens. Omit decorative illustrations,
animation, feature sections, and repeated calls to action. The 404 page shares
the same layout and action treatment.

Keep Privacy and Support links in the shared landing footer. Supporting pages
use a `max-w-2xl` reading column, plain section headings, a home link, and the same
appearance tokens. Give each page its own title, description, and canonical URL.

Reuse `apps/extension/public/icon/icon.svg`. Interface SVG layers use
`currentColor`; manifest raster sizes stay in `public/icon/`. Keep the shared SVG
compatible with standalone renderers through an sRGB fallback and basic opacity,
without CSS variables, `oklch()`, or `color-mix()` inside the asset. Do not maintain
a separate dark icon or themed raster variants.

### Shared tokens and surfaces

- Use theme color to communicate context and ownership, not as decoration.
- Use `#F7F7F7` for the shared light-mode
  `background` token. Keep the zenith gradient separate from this base color.
- Use `neutral-700` at 20% opacity for the shared light-mode `border` token
  so dividers remain visible on pale surfaces, including `border-border/60`
  and `divide-border/50`. Retain white at 10% opacity in dark mode.
- In light mode, use `neutral-700` for the shared foreground and
  `neutral-600` for muted foreground text. Let weight and semantic color create
  emphasis instead of placing near-black text across the pastel surfaces.
- Use the active `theme-400` color for shared light-mode focus borders and
  rings instead of a neutral ring that reads as a black outline.
- The central Dynamic Island is the header's raised focal point; supporting
  navigation, search, refresh, time, and user controls recede into the page.
  In light mode, render shared `island-pill` controls on `bg-background/50` with a
  shallow surface gradient: 1% black at the top fading over 9px, and 18% white
  at the bottom fading over 12px. This shading suggests depth without an inset
  shadow or a flat gray fill. In dark mode, keep `bg-black/10` and no surface
  gradient. Explicit control gradients override the shared shading. Keep
  `shadow-sm` at rest with `shadow-theme-400/15` in light mode and
  `shadow-theme-400/5` in dark mode so the theme tint remains visible against
  each background. Keep backdrop blur and `shadow-sm shadow-theme-400/30`
  hover feedback in both modes. Ease hover changes in and out over 200ms, and
  disable these transitions when reduced motion is requested.
  On Buttons, set both `background-clip` and `background-origin` to `border-box`
  so the fill and gradient cover the transparent border. Keep these aligned to
  avoid a bright gap beside the shadow or repeated gradient seams at the edges.
- Build depth with layered translucent surfaces instead of opaque panels and
  heavy borders.
- Do not add static hairline rings to LiveCard surfaces, modal shells, or nested
  modal surfaces; their color and layered backgrounds provide the boundary.
- Do not render dedicated close buttons on modal or popup surfaces. Preserve
  Escape and backdrop dismissal for non-blocking dialogs, and keep explicit
  semantic actions such as Cancel where the user must confirm or abandon a
  consequential operation.
- Prefer squircles for major containers and nested surfaces.
- Keep supporting decoration quiet. Controls and content should remain the
  visual focus.
- Use Phosphor Bold icons throughout the interface so compact controls remain
  legible. Preserve Phosphor Duotone icons in LiveCard header actions, where their
  softer treatment belongs to the established LiveCard language.
- Reuse existing component treatments and tokens before introducing another
  surface style.
- Keep 24px of breathing room at both the top and bottom of the main app page.
- Treat `xs` as a 30rem viewport breakpoint. Keep 24px between LiveCards and
  around the Board at `xs` and above; below `xs`, reduce both to 8px.
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
Synchronize the themed SVG favicon in the app entry before mounting React by
applying the resolved `theme-500` value to the canonical SVG. Reuse the same SVG
geometry with `currentColor` in the shared theme selector. Keep this separate from
the head bootstrap and provider composition so favicon work does not delay the
initial background or depend on board effects.

## LiveCard Surface Language

LiveCards define the primary NewsNext surface treatment.

- The outer `3xl` squircle uses the relevant theme color at 45% opacity through
  `bg-theme-400/45`.
- The content panel uses a nested `2xl` squircle with `bg-background/70` and the
  matching `zenith-theme-400` treatment.
- Scope the provider's existing color class at the LiveCard boundary, then consume
  its inherited `--color-theme-*` properties through static `theme-*` Tailwind
  utilities instead of constructing palette class names at runtime.
- Keep Tailwind shades 100–900 available through provider-scoped `theme-*`
  colors so shared components can add states without changing the theme
  contract.
- Use the semantic `primary` color for the current app-level accent instead of
  writing `theme-500` directly. Reserve explicit `theme-*` shades for locally
  scoped palettes, such as provider-colored LiveCards, theme choices, and tonal
  gradients.
- Keep standard `Card` and `Alert` surfaces on the shared semantic `background`
  and `foreground` colors. Do not introduce a separate LiveCard color pair; create
  hierarchy with the established translucent or theme-mixed surface treatments.
- Build semantic surface colors from Tailwind palette variables when an exact
  palette value exists; avoid duplicating those colors as raw OKLCH or hex
  literals.
- Keep the standard `muted` surface aligned with the LiveCards' translucent
  `neutral-400/10` treatment. Use explicit Tailwind shades only where a LiveCard
  state cannot preserve its established light and dark colors through an
  existing semantic token.
- Keep the selectable theme palette intentionally distinct: red, pink, fuchsia,
  purple, indigo, blue, cyan, teal, green, amber, orange, and slate.
- Use `10px` (`p-2.5`) between the outer shell and nested content where the LiveCard
  shell must remain visible.
- Use a fixed desktop LiveCard height of `500px` (`h-125`). Allow specialized
  responsive surfaces such as Radar to provide their own LiveCard dimensions.
- Place identity and surface actions in the exposed outer shell. Place editable
  fields and primary content in the quieter inner panel.
- Render source identity through the shared `SourceIcon` with a consistently
  circular shape across LiveCards, search, settings, and status surfaces. Vary
  its size by context without introducing local corner-radius overrides. Treat
  the resolved provider icon and optional source badge as one visual identity;
  pass both whenever source metadata is available. Missing or failed icons use a
  locally generated Boring Avatars `bauhaus` avatar through `SourceIcon`, using
  abstract geometric shapes without facial or human features. Render inline SVG
  with inherited `--color-theme-*` shades so the avatar follows the card palette,
  including unsaved Color previews. The seed fixes geometry and palette assignment; theme changes update the shades. Seed Widget avatars with the
  stable Widget ID so rename, palette edits, refresh, Board moves, and flips keep
  the same identity. Keep the avatar circular and retain any Badge overlay.
- Keep LiveCard headers to a single title line beside the source icon and actions,
  with an 8px gap before the inner panel on both faces. Do not show refresh times
  or a subtitle; indicate refreshing through the refresh action animation.
- Keep compact LiveCard action icons content-sized and background-free. Use the
  shared `CardHeaderActionButton`; hover may raise icon opacity but must not add
  a filled hover surface or enlarge the action target spacing.
- Fade and pulse LiveCard content during an explicit latest-data refresh, or while
  an automatic query is fetching without current or placeholder data. Keep
  renderable previous data visually stable during automatic background refreshes.
- Keep explicit refresh feedback visible for at least 500ms, including when the
  one-minute request guard reuses the preceding result immediately.
- The default Button uses the app-level primary theme. Set its `tone` to
  `theme` for both filled and outline actions inside provider-colored LiveCards so
  their highlight follows the LiveCard's scoped `theme-*` palette. Do not encode
  color context into new compound variant names. Keep theme outline actions
  transparent at rest and reveal their tinted surface on hover or focus so
  secondary actions do not compete with the filled primary action.
- The header Dynamic Island expands to a 270px by 110px Board color panel. Keep
  the shared theme selector's six-column palette as its only control and center
  its 232px by 72px option grid so the visible clearance is 19px on every side.
  In its collapsed title state, show the active Board's canonical SVG icon
  colored through `currentColor`; do not substitute the legacy vector logo.
  Theme mode belongs in Appearance settings rather than the title island.
  Changing the active Board color here updates the same persisted Board
  preference used by its editor.
- While a LiveCard or Widget is being dragged, temporarily replace the header
  Dynamic Island with an enlarged red trash target. Strengthen its tint and icon
  motion when the pointer enters the island. A valid drop deletes the LiveCard
  LiveCard or removes the Widget placement from its originating Board. Restore
  the normal title state when the drag ends. Cancel the sorting preview without
  saving a new order when dropping on trash or outside the list.

Treat each expanded Title Island state as a composable feature. A feature owns its
content, expanded dimensions, surface treatment, dismissal behavior, interaction
blocking policy, and priority; the shared shell owns only collapsed title progress,
shape transitions, and active-feature resolution. Resolve direct-manipulation
interactions above notifications, and notifications above user-opened panels.
Add new states through the `TitleIslandFeature` contract instead of adding another
business-specific branch to the shell.

The reference implementation is `CardSurface` in
`apps/extension/src/components/live-card/card-surface.tsx`.

LiveCard item markers communicate ordering semantics. Timelines use the shared
rail and grouped relative-time labels. Rankings use numbered circular markers
and may briefly show movement after a refresh. Unordered lists use a quiet dot
in the same marker column, show available item times as muted inline metadata,
and never show rank movement. Keep the marker column width stable across these
presentations so item summaries do not shift when a Source changes its
effective presentation.

Give every news item an anchored preview popover after a 300ms hover delay,
including items without extended content. Limit the hover trigger to the item's
left half so the pointer can move toward the left-positioned preview without
crossing a competing trigger area. Keep the complete item as the link target,
do not open the preview on press, and render text, sanitized HTML, pictures, and
iframes in the shared preview composition. Combine multiple pictures into one
stable carousel rather than stacking them, provide wrapping previous and next
controls, and preserve the active picture when opening the full-size modal
viewer. Treat both the picture and the text as entry points to that viewer, and
use the title when no directly actionable preview content exists. In the
expanded surface, pair media and article text side by side on wide viewports,
stack them on narrow viewports, and give the media region a neutral backdrop:
`bg-neutral-200/50` in light mode and `bg-neutral-800/25` over the dialog's
`neutral-900` base in dark mode, producing approximately `#1B1B1B`. Apply it to
the entire media region, including image letterboxing and iframe gutters.
Keep the text region on `bg-background`, and let text-only items use the full
surface without reserving an empty media
column. Anchor footer actions to the surface's right edge so item navigation
never shifts those controls when the content layout changes. Keep the detail
column and item title visible for media previews even when no article body is
available. Keep expanded media flush with its region. When the title needs
extra space for overlay controls, apply that inset symmetrically without
changing the surrounding detail column.

Text-only previews use a centered reading column; footer controls stay anchored
to the surface edge. Use justified multi-line titles/body with natural final
lines, 18px/500 titles, and 16px/400 body text. Give the footer's left inline text
a small optical inset without moving its right-side controls.

The detail column has a fixed identity header, independently scrolling title/body,
and fixed footer with complete inline presentation and the original link. Show
an `author` icon with the author name, a shared `beam` avatar seeded by author
name when the icon is missing or fails,
or the shared Source icon/badge and LiveCard name otherwise. Wide layouts use
approximately 60/40 media-to-detail proportions. Carry the card color through
the identity context so generated avatars retain its palette inside the dialog portal.

Keep shared inline metadata vertically centered in both news items and preview
footers. Use a fixed 14px alignment box for the compact 12px presentation and a
fixed 20px alignment box for the expanded 14px presentation; size statistic
icons to the same box as their adjacent text instead of aligning either side to
the baseline or container edge.

When the preview belongs to a multi-item list, place previous-item and
next-item controls immediately before the original-link control in the footer.
Disable the control at its corresponding list boundary, and reset the media
carousel to its first picture after item navigation.

Do not repeat the popover's outer radius on its inset media: the standard 16px
popover padding already consumes the `rounded-2xl` radius, leaving a square
inner corner. Likewise, do not add a second inner radius to expanded media; let
the full-screen surface provide the only outer clipping shape.

Keep text in compact news-item rows non-selectable so drag and click gestures
remain predictable. Allow text selection in both the anchored preview and the
expanded preview, and do not treat the click produced after a selection drag as
a request to open the expanded surface.
Support the same wrapping controls and Left/Right Arrow navigation in both
surfaces.

### Shared Card behavior

Card and Widget share one interaction model. The only Widget variations are
resizable dimensions, content renderers, and data adapters. Identity headers,
metadata fields, parameter controls, Board switching, removal confirmation,
flip/focus behavior, and refresh feedback must use the same components.
`CardMetadataSettings` renders Title, Description, Home, Badge, and Color for both.
Provider identity remains unchanged by display overrides. Source-specific
permissions and Widget-specific data diagnostics belong to data-adapter content.

### Next Layer Widget surfaces

Next Layer uses the shared Pragmatic Drag and Drop infrastructure and one pure
ordered packing function for initial layout, live drag previews, resize previews,
and responsive reflow. Persist user order and dimensions, never screen coordinates.
The existing wire layout stores `x: 0`, `y: orderIndex`; read older placements in
`y`, then `x` order. Keep Widget drag data separate from LiveCard drag data so a
Widget cannot trigger LiveCard moves in the Board or Header. The shared header
trash target dispatches by drag kind and requires the originating Board and Widget
IDs before accepting Widget removal.

Widget width and height use half-LiveCard units in manifests, persisted layouts,
and resize steps: `2 × 2` matches a 400px × 500px LiveCard.
Widths range from half through two cards. With the shared 24px gutter, visible widths are 188px, 400px, 612px, and 824px. Keep that
gutter and those widths at every viewport size. Center complete card columns,
up to four LiveCards; allow horizontal scrolling when the widest Widget cannot
fit. Horizontal cells are 212px and vertical cells are 262px, each including the
gutter. A `1 × 1` Widget is 188px × 238px after reserving the gutter.
Do not backfill an earlier gap with a later Widget.

Snapshot order and the pointer's grab offset at drag start. Precompute the packed
result of each possible insertion, retaining every other Widget's relative order.
As the pointer moves, choose the nearest dragged-card position in pixels and move
all slots to that preview layout. Switch only when another candidate is more than
12px closer than the current candidate. Equal landing positions retain the current
preview; without one, prefer the smallest change from the original order. Leaving
the grid, including entering the header trash, restores the original order
immediately without saving. Re-entering resolves a fresh preview.
The dragged slot remains visible as a subdued
placeholder. On a valid drop, commit that exact preview; dropping outside cancels.
Window resizing reflows order without saving. Resize from the right, bottom, or
lower-right edges with pointer capture; arrow keys on a focused handle resize by
one cell. Animate snapped width and height changes with the same 180ms ease
transition as slot movement, including during pointer resizing. Disable these
transitions only for navigation or reduced motion. Resize changes dimensions
without changing order. Escape or pointer
cancellation restores the previous sizes. Honor manifest minimum dimensions.

Keep iframes mounted in stable React slots while changing outer geometry. Disable
iframe pointer events during dragging or resizing and restore them when the
gesture ends. Keep navigation scatter animations on the inner
`data-widget-transition` wrapper, separate from animated slot geometry. Preserve
its shared 420ms entrance, 80ms delay, and 10ms stagger. Stagger by visual row and
column, not installation DOM order. Disable slot transitions while the shared
scatter layer is pending, entering, or exiting; initial width measurement must
settle without competing motion. Keep Widget container overflow visible during
navigation and enable horizontal scrolling afterward only when content overflows.

Treat LiveCard as a built-in Widget UI, independent of the data producer.
Widgets selecting `view: { type: "live-card", query: "feed" }` render through the shared `LiveCardItems` presentation layer
in the extension; do not recreate item rows, time formatting, previews, or
statistics in local HTML. Only custom UIs need an iframe. Preserve the same
shell, details back, palette, and controls for either renderer. Empty item
results are an ordinary empty state; malformed data must show an error.

Keep the trusted Widget shell outside the iframe. LiveCards and Widgets share
`CardShell`, `CardHeader`, `CardBackContent`, and `CardHeaderActionButton`;
Source identity is a leading slot in the common header. Keep surface, spacing,
back scrolling, and action placement in these shared components. Match the compact LiveCard header on both Widget
faces: a single title line in a 32px row and an 8px gap before the content panel.
LiveCards and Widgets share `CardRefreshButton` and the content refresh
background/opacity treatment. Disable the refresh button while fetching, spin its
indicator, and apply content dimming/pulsing only for initial loading and explicit
refreshes. Keep automatic background refreshes visually stable when data exists.
Explicit feedback lasts at least 500ms through the shared minimum-duration helper.
A failed background refresh retains the last successful items. First-load errors
reuse the LiveCard retry action; error details remain available in the shell.

Set each Widget's `color` property in `widget.json`
using the same named palette as LiveCards (for example, `blue` or `teal`). It
defaults to `slate` when omitted. Apply this palette to the shell so the outer
surface, nested `zenith-theme-400` wash, and header controls use the Widget's
scoped `theme-*` tokens independently of the Board color. The host owns the
title, refresh state and button, drag behavior, nested `2xl` content surface,
and error or connection treatment. Widgets also have a host-owned details back,
opened with the same information icon as LiveCards and closed with a back arrow.
Reuse `FlipAnimate` for the Y-axis transition and the same shell on both faces.
Keep slot content overflow `visible` so the perspective animation
can extend beyond the cell. Keep clipping inside each face's nested content panel,
and raise hovered or focused grid items above their neighbors.
Keep the iframe mounted during flips and make the hidden face inert so keyboard
focus cannot enter it. `FlipAnimate` owns `inert` and `aria-hidden` for both kinds
of card. Register only the visible face's header as the drag handle, and build the
drag preview from that header. Both faces remain draggable. The back's removal
action shares `DeleteCardButton` and its two-step confirmation with LiveCards;
removing a Widget deletes its Board placement. The back shows snapshot status, the number of scoped LiveCards, and the last
update time. Place the common metadata editor in a section first, separate
from business parameters. Use the LiveCard metadata editing pattern and shared
`ThemeSelector` palette. Save applies Board placement overrides to both faces;
Cancel discards the draft and Reset restores the `widget.json` defaults.
Preview the draft identity in the back header and theme without persisting it or
changing data inputs. Use `CardSettingsSection` for both metadata and parameter
editors: share Edit/Cancel/Save/Reset controls, validation gates, pending-state
field disabling, and inline errors. Keep failed saves editable and clear errors
when cancelling or starting a new edit. Allow settings action rows and the shared
color palette to wrap within narrow Widget widths; do not force a six-column
palette or fixed height when the available width is smaller.
When `widget.json` declares parameters, place their settings above
the status details. Reuse the LiveCard `ParameterSettings` section and fields,
including read-only values, Edit, Cancel, Reset, Save, and inline validation.
Keep drafts local until Save; Reset clears placement overrides to manifest
defaults. Hide the parameter section when none are declared.

Keep the iframe and its document background transparent so the host's nested
surface remains visible. iframe content must not repeat the title, refresh
control, outer padding, rounded shell, or background. It may render links as
normal new-tab links; the host sandbox permits popups while retaining script,
DOM, storage, and same-origin isolation. Widget content should use NewsNext
semantic typography, foreground, muted, divider, hover, spacing, and motion
tokens instead of defining an unrelated visual system.

Preserve Now Layer's intrinsic centered LiveCard layout inside the same maximum
content width as Next Layer. Limit both Layers to the equivalent width of a
four-column LiveCard row. The shared Board container owns both Layers'
responsive content insets and fills the space naturally allocated below the
responsive Header. Now Layer and Next Layer must share the application root
viewport and must not define their own vertical scrolling or page padding.
Next Layer may scroll horizontally when a fixed-width Widget cannot fit. This keeps their visible region, Header progress, and scroll restoration
consistent when switching Layers.
Record scroll positions by Board and Layer, but restore them only after the
target Board and Layer have replaced the outgoing transition content. Route
completion alone is too early because the outgoing view remains mounted during
its card scatter animation. Board-only, Layer-only, and combined Board/Layer
changes must use the same post-mount restoration path.
When navigation changes both Board and Layer, transition directly between the
two complete views. Keep the departing view while the destination route resolves;
do not briefly switch the departing Board to the destination's Layer.

Treat Now Layer and Next Layer as peers during transitions. Overlap the incoming
Layer's entrance with the departing Layer's exit. Keep at most one outgoing view
alongside the active view; a rapid switch replaces the older outgoing view only
when the current view is ready. Skipping a view before scroll restoration settles
keeps the existing exit running instead of clearing the screen.
Pin the outgoing view at its viewport position before restoring the incoming
view's scroll, and make it inert until it unmounts after its exit. Keep incoming
content inert until scroll restoration settles as well.
Apply the same horizontal motion to LiveCards and Widgets: cards on the left
travel past the left edge and cards on the right past the right edge, with an
`80px` margin and no vertical displacement. Use a `320ms` exit with accelerating
easing (`cubic-bezier(0.4, 0, 1, 1)`) and a `10ms` stagger per visible card.
Respect reduced-motion preferences by switching immediately. Do not scale or blur the full page.

LiveCard detail flips rotate the front and back faces independently, with the
same `600ms` duration and `cubic-bezier(0.4, 0, 0.2, 1)` easing, with a gentle
start and finish. Keep the inactive face
non-interactive, and hide each face when its back is facing the viewer. Avoid a
shared rotating 3D container around the card's scrollable content. Apply a
centered `1200px` perspective to the stationary flip container for restrained
depth and less apparent shrinking. As each face
rotates, translate it away from the viewer by half its extent along the rotating
dimension multiplied by the absolute sine of its angle. This keeps its nearest
edge at or behind the original plane, so the entire face stays within the card's
bounds without clipping. Use container-relative dimensions so this also holds
when cards resize, and switch immediately when reduced motion is requested.

Play the horizontal entrance on page load and whenever a Board or Layer mounts,
including Tab switches and return visits. Cards converge from the same offscreen
side used by the exit and fade in over `420ms` with
`cubic-bezier(0.22, 1, 0.36, 1)` easing. Start after `80ms`, with a visible-order
stagger of `10ms` per visible card, matching the exit stagger. Do not cap the
stagger after the first few cards: later rows should retain their cascading
rhythm while incoming and outgoing cards overlap. Interrupted entrances exit
immediately from their current positions without adding another stagger.

Board View waits for the incoming content to mount before restoring its root
scroll position, then starts its entrance on the following frame without an idle
wait. Next Layer must finish loading its Widget manifest list and mount the grid
before signaling readiness; empty and error states also complete readiness. Apply the
entrance starting positions before revealing content and resume sortable layout
measurements when the animation finishes. If navigation interrupts an entrance,
start the exit from the current animated styles.
Implementation constraints belong to the
[Performance Guideline](PERFORMANCE_GUIDELINE.md#keep-animation-work-above-livecard-content).

Snapshot both Board and Layer for each departing view. Never replace its cards
with the target Board's content during the exit. Mount a distinct Widget grid for
each view and use a unique visit key, including rapid returns to the same Board.
Never share a Next Layer card or layout between Boards.

Blank page space is part of the reading surface and must not switch back to Now
Layer when clicked. Now Layer and Next Layer are peer views, so switch between
them only through the shared Layer control or its configured keyboard shortcut;
do not treat Escape as a way to leave Next Layer.

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
Keep the Board ID in the route and read the active Layer from that Board's
persisted `defaultLayer`. Now and Next share the root scroll container with
separate session scroll positions keyed by Board and Layer.
Restore after the incoming view mounts, without scroll animation, and update
the Dynamic Island progress outline from that container.
Treat a Board's default layer as its persisted active layer. The layer shortcut
and Board settings update the same preference without creating navigation history
entries. Opening a Board, including through Back or Forward, uses its latest
persisted Layer rather than a Layer snapshot from navigation history.

### LiveCard reordering

- Every Board supports the same ordering modes and manual dragging from the
  full LiveCard header. Do not render a separate drag button. Keep nested header
  controls clickable, and give the draggable header an accessible name that
  identifies the LiveCard being moved. Both Layers share the header exclusion
  rules for interactive controls and the `card-drag-placeholder` treatment.
- Preview the LiveCard order in real time, animating neighboring cards into
  their new slots using native 180ms ease translation animations on the outer
  list items. Keep navigation animation on the nested card wrapper, and disable
  sorting animation for reduced motion. Commit that preview only on a valid drop.
  Register the list itself as the drop target so a valid release dismisses the
  native preview instead of animating it back to the source position.
  Snapshot the wrapped LiveCard slots when dragging starts, then resolve the
  pointer against the nearest row and the horizontal midpoint of its slots.
  Always derive previews from this original order and geometry, so animated cards
  cannot shift the destination calculation.
- Auto-scroll the root Now Layer scroll container vertically when a dragged
  LiveCard approaches its viewport edges. Use the fast PDD scroll profile so
  movement remains perceptible beside full-height LiveCards, and keep horizontal
  auto-scroll disabled.
- Immediately restore the original order when a drag leaves the list or enters
  the header trash, without saving. Clear the preview destination so re-entering
  the list resolves a fresh preview from the original drag snapshot. Preserve
  the original order on cancellation. Require an active list drop target as well
  as an in-bounds pointer
  before committing the order so Escape never acts like a drop. Gaps inside the
  board may retain the most recent valid placement.
- Keep the dragged LiveCard in the layout and reduce its opacity so its original
  preview position remains understandable.
- Keep the drag preview inside the source provider's theme-color scope. Native
  drag previews are mounted outside the LiveCard tree, so inherited theme tokens
  used by cloned content must remain available to the preview surface. Render
  the preview as a compact clone of the LiveCard header and offset the native
  preview so the pointer stays at the corresponding position on the clone.
  Pre-compose every translucent theme surface over the opaque app
  background before the browser applies its native drag-image treatment.

## Dialog Patterns

Choose Search, Settings, or single-column composition to fit the task. All
share the modal foundation below.

### Shared modal foundation

Create Board, Edit Board, and Settings use `min(70vh, 640px)` height; Search
uses `516px`. Maximum widths are `520px` for Board dialogs, `2xl` for Settings,
and `816px` for Search. Preserve 16px horizontal viewport margins below `sm`.
Scroll inner content, keeping the shell and header fixed. Confirmations fit
content naturally.

All modal-style UI, including task dialogs and command dialogs, must reuse the
shared modal components instead of defining local backdrop values or motion.
`ModalOverlay` uses `bg-black/75` without backdrop blur and applies a
`150ms` opacity fade. `ModalPopup` owns the centered modal motion, while
`ModalTitle` and `ModalDescription` own their shared visual
treatments. Centered surfaces use a `3xl` outer squircle with an opaque
`bg-background` base matching the news item preview dialog, and a `10px` shell
inset around the content. Keep content containers and scrollers transparent in
both appearances, matching Settings: use one dialog background, with section
Card surfaces directly on it where needed. Apply the shared
`zenith-theme-400/60` top-weighted gradient directly to the modal shell's
background, matching the main app's wash. Do not add another background layer
or repeat the gradient on the content scroller or section surfaces. Keep
stronger theme accents on controls, selection, and focus states.

Primitive-specific components compose `ModalOverlay`, `ModalPopup`,
`ModalTitle` and `ModalDescription` from
`@newsnext/ui/components/modal`. Keep the shared styling encapsulated directly
in these components instead of introducing parallel CSS utilities.

For centered task modals with a visible title, keep a compact header in the
exposed top shell, then place descriptions, fields, and primary content in a
nested content area below it. The title must never move into the nested
content area. Board create and edit place their primary submit action in the header's
upper-right while keeping the title centered; destructive edit actions remain
in the content area. `DialogContent` provides the shell; callers compose
`DialogHeader` followed by a transparent `SquircleBox` scroller. Its sections
use the shared subtle Card surface. Compact command
dialogs such as Search may omit the visible header and begin directly with the
transparent interactive content, while retaining an accessible hidden title and
description.

Keep content-specific layouts distinct when needed, but keep overlay opacity,
shell color, primary radii, and motion consistent. Popover menus and anchored
transient controls do not use a modal overlay.

Dropdown menus and select popups use a compact translucent background surface
with backdrop blur, a faint neutral outline, and a restrained shadow. Keep 6px
between the trigger and popup, use 32px rows with regular-weight labels, and
show selection with an uncontained theme-colored checkmark. Focused rows use
only a subtle neutral wash. Size menus to their content; avoid wide empty
surfaces for short action lists.

Use the shared inline two-step confirmation for destructive actions instead of
opening another modal. Never apply the `destructive` variant, destructive text,
or destructive background color to the idle action. Destructive color is
reserved exclusively for the armed second-confirmation state. NewsNext uses red
as its default theme, so showing destructive red at rest would compete with
ordinary theme-accented actions and make danger indistinguishable from product
emphasis. Keep the initial action neutral, then switch to a destructive-colored
outline with a restrained destructive background and a concise confirmation
label after the first activation. Change
its icon to a confirmation icon so the state is not conveyed by text or color
alone. The second activation performs the operation, while moving focus away
cancels it.
In a space-constrained LiveCard header, keep the idle action icon-only, expand
it into a compact labeled button when armed, use a restrained 150ms reveal, and
reset it after three seconds without confirmation.

### Single-column dialogs

Board forms use the shared modal shell and a transparent `2xl` content scroller.
Use subtle section Cards directly on that scroller, plus:

- Content padding of `24px` (`p-6`).
- A consistent vertical rhythm: `24px` between form sections and `8px`
  between a section title or field label and its control. Use `ConfigSection`
  for section, single-field, and grouped-field layouts instead of recreating
  the spacing at each call site.
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
the same name, theme color, LiveCard order, and default layer fields;
only edit mode exposes board deletion, while the title and primary action
reflect the current mode. Keep `Create board` and `Save changes` in the
upper-right of the shared header. Disable deletion when it would remove the last Board;
NewsNext must always retain at least one. `Delete with LiveCards` removes
LiveCards owned by that Board. `Transfer and Delete` requires a target
Board and merges the deleted Board's LiveCards into it. Default layer uses a
compact segmented `Now` / `Next` control and determines which Board view opens
by default.

### LiveCard Board ownership

The LiveCard back moves the LiveCard between Boards with a single-choice radio
menu. A LiveCard belongs to exactly one Board. The compact trigger shows that
Board's name; selecting another Board performs one atomic move. Disable rows
while the move Action is pending.

### Settings dialog

Use a two-column layout for Settings: omit a visible dialog title, place the
vertical tab list in the exposed left shell, and place the active panel in the
content area on the right. Use one continuous `bg-background` surface with the
shared `zenith-theme-400/60` wash across
both columns; do not add a nested panel background. Keep a subtle neutral
background around each settings section. Separate sections with headings and spacing, and use
quiet dividers for repeated rows. Keep an accessible hidden dialog title.
Use vertical tab semantics with Up/Down focus navigation and Enter or Space to
activate a tab. Forward `orientation` to the Base UI root and match its
`data-orientation` value in layout selectors; it does not emit `data-vertical`
or `data-horizontal` flags. Keep the sidebar
at `w-24` below `sm` and `w-32` at larger widths, with an `8px` gap before the
flexible content panel. Separate the columns with a `1px` `border-border/60`
left border on the content scroller, spanning the entire dialog height. Remove
the shell's vertical padding for Settings and move that `10px` inset into each
column's internal padding so the divider reaches both dialog edges. Retain the left
sidebar at narrow widths and truncate
long tab labels. Allow the sidebar and content panel to scroll independently
when height is constrained. Use the shared `sidebar` tab variant on a transparent
list. Align labels to the left in `40px` rows with `4px` gaps and `rounded-xl`
corners. Give the active tab a `bg-foreground/10` neutral fill, full foreground
contrast, and semibold weight in both appearances. Inactive tabs use muted text
and a subtle `bg-muted` hover fill. Keep the selected fill visible on hover.
Do not add a theme-colored fill, underline, shadow, or sliding selection pill.
Reduce tab text to `text-xs` below the `sm` breakpoint. Do not show the active tab as a subtitle above
the panel.
Use `px-4 py-6.5 sm:px-6 sm:py-8.5` on the settings content scroller and
`py-4.5` on the sidebar to preserve their content insets. Background fills belong
to settings sections, selected navigation, interactive controls, and individual records where they
help distinguish items, rather than successive wrapping containers.

Open Settings on General by default. Place language first and theme mode second
in General; do not provide a separate Appearance tab.

Keep settings controls compact and visually consistent. Use a 6px slider track
with a clearly visible themed range and a 14px thumb filled with a light theme
shade; the track and thumb must remain legible against the neutral dialog surface.
Use 32px buttons for ordinary settings
actions, keep adjacent actions the same height and text size, and use `ghost`
rather than the icon-oriented LiveCard action composition for text-only tertiary actions.
Keep removal actions inside the same button group and neutral until the user
arms their second confirmation; only that armed state uses the destructive
outline treatment. Do not present removal actions as detached text. Theme-colored
buttons use white text in both light and dark modes.
Group closely related controls in columns when the available width permits it,
while keeping labels, values, and necessary recovery guidance adjacent to their
control. Omit helper text when the label and visible control already explain the
setting.
Use `ConfigSection` for Settings panel headings and vertical form fields so
both retain the shared 8px title-to-content rhythm. Choose its semantic variant
for a section heading, a single labeled control, or a grouped control. These
variants share the same title weight, horizontal inset, description placement,
and spacing; only their HTML semantics differ. Keep the default subtle `2xl`
Card surface and its content inset for Settings sections. Use `surface={false}`
for nested fields or specialized lists that already provide their own surface,
so section backgrounds are not stacked inside one another.
Use `bg-white/60` for the shared subtle Card in light mode so sections sit
lightly above the neutral dialog background. Avoid dark gray washes on these
light-mode section surfaces. Retain `bg-foreground/3` in dark mode.
Reset the shared settings content scroller to the top when the active tab
changes; do not remount tab content or discard unsaved control state to do so.

The native integration switch reflects the persisted user preference. Show daemon
connection health separately; missing status, connection errors, and pending
Worker operations must not disable the switch. Only a pending toggle operation
temporarily disables it.

Registry management belongs in its own Settings tab. Keep the URL field empty
by default and show the bundled Registry as the explicit empty state. Present
each configured Registry as an ordered status card with its origin, complete
URL, health, Source count, last successful update, and any actionable error.
Use numbered order and adjacent move controls to make later-entry merge
precedence understandable, require confirmation before removal, and provide one
visible manual refresh action for the collection.

Follow Registry management with a searchable Source browser rather than a raw
ID list. Show summary counts for Sources, Providers, and effective Registries;
support filtering by bundled or configured Registry provenance; and render each
Source with its title, canonical ID, Provider, category, description, and
effective origin. Show the resolved Provider icon at the start of the header,
place the canonical ID at the top right, and do not display a presentation-type
badge. Keep Source cards compact and use natural,
content-driven heights with the shared nested translucent settings surfaces.
Group filtered Sources by Provider category with a localized heading and Source
count, and omit the repeated category label from individual card footers.
Show actual parameter titles and network targets in a visually separate
definition block. Omit each absent row, and omit the block when it would be
empty. Show a non-zero LiveCard count as a compact usage badge beside the
Provider in the footer, deriving it from application data by Source ID. Do not
truncate descriptions or detail values; wrap long network targets safely.
Use an equal-width two-column grid where space permits and collapse to one
column on narrow viewports. Let each card keep its natural height, align cards
to the start of each row, and ensure no content can change the column widths.

### Search dialog

The Search dialog is a two-pane LiveCard locator: keep search and results on the
left, and show the currently selected LiveCard on the right. Do not show a
visible title or header; place both panes inside one nested `2xl` neutral
squircle that sits flush with the modal shell without additional outer inset
padding. Separate the panes with one quiet divider. Keep the preview at its
normal `400px` by `500px` (`w-100 h-125`) size inside `8px` padding, and keep the
left pane at the same `400px` width as the card. Retain a screen-reader-only
title and description for dialog semantics. Keep the saved Search binding behavior, but
do not show keyboard shortcut hints inside the dialog. Group results by Board
in the saved Board order and omit empty groups. Within each group, show the
LiveCard title and provider;
the group heading supplies the board context without repeating it on every row.
Use `12px` horizontal and `10px` vertical padding for search result rows so the
single-line identity remains compact without feeling cramped. Keep the title
and provider on one row; truncate the title first and omit the provider label
when it duplicates the resolved LiveCard title.

Treat the Search input as the top row of the nested content panel, not as a
separate pill-shaped control. It has no independent radius or filled surface;
use a quiet bottom divider that strengthens on focus without an outer focus
ring. The input remains auto-focused and keeps a visible search icon.

The modal shell inherits the current board theme and must remain stable while
selection changes. Use the shared neutral muted background for active result
rows rather than the current Board or provider theme. Result rows must not carry
provider `zenith-*` theme classes. Keep dividers and selection treatments quiet.
Selected result color must update immediately without a color transition so
keyboard navigation never feels behind the current selection. Keyboard
selection must update the right-hand LiveCard immediately. Pointer hover alone
must not change selection or the preview; show only the shared neutral muted
background on hover and require a click to commit pointer selection. Render the
actual LiveCard LiveCard so the preview shares
its normal presentation, cached data, loading states, and interactions instead
of maintaining a search-only card approximation. Clicking a result only selects it for the right-hand
preview; it must not close the dialog, change Boards, or scroll the Board's
LiveCard into view. Make the preview draggable from the same header surface as a
Board LiveCard and reuse the shared drag preview. While dragging, clear the
modal surface and backdrop's visual and pointer obstruction so the underlying
Board and header trash target are available. Dropping on the trash deletes the LiveCard,
matching Board behavior. Dropping on the current Board atomically transfers the
selected result from its listed source Board to the current Board; show a quiet
dashed Board-wide drop indicator. Do not add decorative illustration or generic
helper copy.

### Radar dialog

The App-level Radar dialog is a focused LiveCard review, not a form wrapped
around a preview. Omit its visible title, outer themed shell, and nested content
surface so the LiveCard stands alone. Place the destination and create controls
in a separate neutral floating action capsule below it. Provider color belongs
to the LiveCard and its primary action; never wrap the card in another large
block of the same color. Align a solid `background` surface behind the LiveCard
for separation; do not use a gradient, offset, or diffuse shadow.
Fade the modal overlay as soon as the creation celebration begins so confetti
lands directly over the Board. Close the Radar after the celebration without
moving or scaling the LiveCard.
Hide previous and next controls when only one
suggestion is available; navigation appears only when it can change the active
suggestion. Keep the accessible dialog title and description screen-reader-only.
The standalone Radar popup declares red as its document theme before first
paint, regardless of the current or destination Board color. Provider color
remains scoped to each LiveCard and its primary action.

## Copy

- Use English sentence case for the canonical message catalog. Render
  user-facing product copy through the typed i18n catalog so English,
  Simplified Chinese, and Traditional Chinese stay aligned. Brand names,
  provider content, user data, and technical identifiers remain untranslated.
- Language selection follows the system by default. An explicit selection is
  part of synchronized Settings, applies immediately, and must update the
  document language so assistive technology receives the correct locale.
- Keep manifest and browser-owned copy in `src/locales/` through the WXT i18n
  module. Keep manually switchable React copy in the typed i18next resources
  and render it through react-i18next; browser-owned copy always follows the
  browser locale and cannot follow an in-app override.
- Prefer labels and action names that state exactly what users control.
- Remove helper text that repeats information already conveyed by the title,
  field labels, or visible controls.
- Keep validation and consequence text when it helps users recover or make an
  informed destructive decision.

## Component previews

Cosmos has three shallow catalog levels: `Basics` for primitives, `Patterns` for
product compositions, and `LiveCards` for complete states. Group Basics by
foundation, actions, forms, feedback, surfaces, navigation, overlays, and shapes;
Patterns by theme, Dynamic Island, notifications, and dialogs. Register each
fixture once and prefer real product examples over redundant implementation demos.

Basics specimens use a category label, title, one-sentence usage description,
neutral canvas, and quiet bordered sections. Monospace state labels compare only
meaningful states. Keep one Typography fixture for the actual reading hierarchy
and one Colors fixture for semantic pairs and provider scales.

Buttons and Badges have separate fixtures. Show each public variant/size once,
then meaningful states, icon placement, provider tone, and render-prop composition.
Keep LiveCard header, edit, parameter, and state actions together in a provider-
scoped specimen without moving a full card into Basics. Buttons retain intrinsic
width, capped by the specimen; grids must not stretch them.

Keep shared Button variants limited to reusable visual hierarchy. Contextual
treatments are compositions: LiveCard header icons use `CardHeaderActionButton`,
and top-level translucent controls apply `island-pill` to a transparent Button.
Do not add `quiet`, `island`, or other business-context names back to the shared
variant API.
Disabled Buttons retain the unmuted colors of their variant, show a not-allowed
cursor, and suppress hover and active feedback instead of reducing opacity.

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
a single focused interaction. The shared component owns a translucent semantic
background layer with a restrained `theme-400` wash, plus the subtle top light,
appearance-aware shadow, clipping, and spring-based size and radius transition.
In light mode, raise the collapsed island above the recessed supporting controls
with an 88% white surface, a 3% theme wash, and a neutral contact shadow.
Use a 76% semantic background and 4% theme wash
when expanded, preserving its translucent material and broader elevation.
Strengthen the collapsed contact shadow with theme color on hover.
Let CSS own the shell's shadow with a 200ms ease-out transition for hover and
state changes; keep size and radius animation in Motion. Disable the shadow
transition when reduced motion is requested.
In dark mode, retain the existing 5% collapsed
and 7% expanded wash with a neutral deep resting shadow. Keep
the surface and its content tied to the actual light or dark appearance instead
of forcing dark-mode colors. Build restrained material depth with a subtle
vertical top light and separate contact and ambient shadows. Keep the inner
surface free of inset shadows, which create a border-like rim in both states
and appearances. Do not use a uniform border, visible noise texture, directional
theme refraction, or animated specular highlight. Treat the expanded state as
the same material at a calmer scale: let the translucent background reveal the
surrounding environment through blur, retain only faint active-theme identity,
and keep the broad vertical top light. Keep a neutral ambient shadow and do not allow
caller-provided background washes. Its collapsed outline remains a standard
round pill, while
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

Native integration settings distinguish connection attempts, an unavailable service,
and daemon startup failure. Show the concrete connection error inline with alert
semantics and wrapping for long paths. Retain the latest error during automatic
retries; clear it after a successful connection or when integration is disabled.

Use the header Dynamic Island for non-blocking notifications that report an
outcome and require no decision, such as an OPML import failure. The
notification temporarily takes priority over the island's usual content and
expands the existing surface automatically; do not open a dialog or render a
separate toast surface for the same event. Keep the page interactive, do not
move focus, and announce failures with alert semantics. Do not add a dedicated
dismiss control; reuse the Dynamic Island's outside-click and scroll dismissal,
and dismiss the notification automatically after eight seconds. If the
Board color panel was already expanded, restore it when the notification ends;
otherwise return the island to its collapsed state.

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

## Implementation Checklist

When changing interface styling:

1. Check whether an existing LiveCard, dialog, control, or surface already provides
   the intended treatment.
2. Keep theme variables and shared Tailwind utilities intact instead of using
   isolated literal colors.
3. Verify hierarchy, squircle clipping, padding, dismissal behavior, focus
   states, and both light and dark themes.
4. Follow the browser inspection policy in `../AGENTS.md`; use ego-lite only
   when explicitly requested.
5. Update this document when the change creates, removes, or revises a durable
   design rule.

## Stream diagnostics

Use **Streams** for continuously collected data, **Collection interval** and
**Next collection** for scheduling, and **Observations** for retained fetch
snapshots. Use **Automatic collection** in LiveCard details.

Lead Overview with data accumulation and collection problems. Stream rows open
their details directly and emphasize observation count. Show latest collection,
activity, and interval on one line. Keep errors visible; do not infer failure from
quiet content or present model estimates as measured freshness. Incomplete totals
are lower bounds and disclose missing counts.

Disambiguate LiveCards and Streams with Source identity, LiveCard names, and
explicit `key=value` parameter overrides. Show every sharing LiveCard's overrides,
the owning Worker, and a short Stream ID. Parameter summaries wrap and remain
visible in details; distinguish missing information from default parameters.

Default to stable identity order. The toolbar's **Stream order** selector explicitly
opts into **Attention first**. Avoid persistent list header/footer explanations for
sorting, interval bounds, or snapshot update times. Show restoration and storage
problems only when applicable.

Details prioritize retained observations, collection results, content changes,
waiting reasons, and the next collection or retry. Collapse model diagnostics,
full identifiers, sharing metadata, and raw configuration behind native disclosures.

LiveCard and LiveWidget use the shared `components/card-shell` frame, header,
refresh primitives, and drag preview. Product-specific content and settings stay
in their adapters; the shell does not branch on the entity type or fetch data.


Preset visualizations use ECharts with restrained axes, compact labels, scoped
palette colors, transparent backgrounds and no toolbar, zoom controls or export
buttons. Series legends identify data but do not toggle it. Disable chart
animation so polling and card flips remain stable. Word clouds keep words
horizontal. Resolve CSS theme colors to RGB before passing them to Canvas.
Metric and table presets use semantic HTML; charts also expose their observations
in a screen-reader table. Keep view controls in a separate View section on the
back using the shared card settings and parameter fields. Cancel discards drafts,
Save updates the placement patch, and Reset removes only view overrides.

Advanced Widget presets keep controls on the card back. Trend metrics combine a
value and explicit period delta with a compact ECharts sparkline. Status rows show
a written state beside their colored dot; timelines include local display times
and machine-readable timestamps. Bullet charts separate actual bars, reference
bands, and target markers. Missing comparison baselines display explicit text.
