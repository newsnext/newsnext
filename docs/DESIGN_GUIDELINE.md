# Design Guideline

This document is the canonical reference for NewsNext interface styling and
interaction-level visual decisions. Keep it aligned with the implemented React
components and Tailwind utilities whenever a UI change establishes or revises a
reusable design rule.

## Visual Direction

NewsNext should feel like a collection of live, tactile LiveCards rather
than a conventional dashboard. Reuse the LiveCard visual language across related
surfaces so dialogs and controls feel native to the board instead of looking
like generic overlays.

### Landing page

The public landing page presents NewsNext as one product made from the browser
extension and the separately distributed desktop App. Explain their boundary
and connection directly: the extension owns live Source execution, browser
sessions, and the human Board surface; the App owns local History, durable data,
CLI and agent access, and desktop integration.

Use the public landing page as the expressive side of the NewsNext identity,
not as a simulation of the product UI. Until real product imagery is ready,
avoid mock browser windows, desktop windows, LiveCards, menus, and terminal output.
Build the story from large typography and a continuous "thread" motif using the
brand red and cream plus the product's blue, purple, green, and amber theme
families. Treat those secondary colors as distinct live signals that converge
into the red NewsNext horizon, rather than as a generic grid of decorative
blocks. Let the composition explain that live browser signals flow into a local
desktop foundation without pretending the abstract marks are controls.
Use `apps/extension/public/icon/icon.svg` as the shared product icon. Keep the
browser manifest raster sizes in `apps/extension/public/icon/`, but render
themed interface icons as inline SVG and derive every colored layer from
`currentColor`; do not maintain separate theme-specific raster variants. The
extension does not use a separate dark icon. Keep the shared SVG compatible with
standalone image renderers: use an sRGB fallback color and basic opacity layers
instead of CSS custom properties, `oklch()`, or `color-mix()` inside the asset.
Keep copy factual about public and separately distributed components. Treat
motion as one restrained entry sequence and respect reduced-motion preferences.

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

Place background illustration controls in the Board configuration modal when editing
an existing Board. Do not expose them in global Appearance settings or during Board
creation, before a Board identity exists. Give all content-heavy modals, including
Create Board, Edit Board, Settings, and Search, the shared `2xl` maximum width and
the shared height of the smaller of 70% of the viewport and 640px. Preserve 16px
of horizontal viewport space on each side below the `sm` breakpoint. Scroll their
inner content vertically without scrolling the outer dialog or its header. Keep
compact confirmation dialogs sized naturally to their content.
The user may choose a local raster image and extract its edges into background
illustration, or use a local SVG directly.
Keep processing in the browser, sanitize direct SVG illustration, resize large raster
inputs before pixel work, and show the result before it is applied.
The preview is also the primary drop target and pointer-based file picker trigger;
give it a visible drag-over state. Keep the preview canvas on its
own background and outside the padded settings card that contains its controls.
Place the clipped canvas inside a transparent editor gutter, and render direct-
manipulation controls in an aligned overlay outside the canvas clipping boundary.
Use the same compact gutter on every side. Keep the full selection inside the
canvas by limiting its scale from the
transformed bounds and constraining its center after every transform update; only
the manipulation handles may extend into the gutter. Treat the gutter as the outer
clipping boundary, and correct an existing out-of-bounds transform when the editor
opens so the controls remain recoverable.
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
the Board dialog's `Save changes` action saves the illustration and its transform
together with the other Board fields. Persist the
illustration center as horizontal and vertical percentages of the viewport rather
than persisting an offset from the responsive default layout. Resolve the
required translation from that center after recalculating the contained illustration
bounds, so placement remains stable when the window size changes.
Use bottom alignment with horizontal centering as the default placement and
preserve that responsive anchor until the user directly transforms the illustration.
Reset must restore this bottom-center anchor, 100% scale, and 0° rotation.
Provide one edge-detail control whose explanation makes the threshold direction
clear. Selecting, transforming, or removing an illustration only updates the Board
form draft; none of these controls may overwrite the saved background before
`Save changes`. Closing the dialog discards the draft. Raster sources always produce
SVG line art. Direct SVG uploads
bypass edge extraction and use the sanitized vector as the draft. Keep drafts as
percent-encoded `data:image/svg+xml` URLs without base64 encoding. Persist the applied
SVG as UTF-8 binary data in IndexedDB. Each Board owns an illustration reference plus
its opacity and transform, so Boards can use different backgrounds. Synchronize the
referenced binary separately through App integration rather than embedding it in
Settings, Application Data, Workspace patches, imports, or exports.

Render saved SVG illustration as a transparent mask mixed from the foreground
and active theme colors so it adapts to light, dark, and board themes. Keep it
in a fixed, non-interactive React layer portaled to `body`, above the grid
texture but below app content. Pass its mask, bounds, color, opacity, and
transform through typed inline style rather than global CSS custom properties.
Use a user-adjustable opacity
from 1% to 20%, defaulting to 7%; LiveCards and controls must remain visually
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
- Let users choose a desktop LiveCard height in Appearance settings:
  `Compact` (`480px`), `Balanced` (`500px`), or `Tall` (`576px`). Default to
  `Balanced`. Allow specialized responsive surfaces such as Radar to provide
  their own LiveCard dimensions.
- Present LiveCard height choices with equal-width silhouettes rendered at their
  actual heights. Order them from compact to tall, with the default balanced
  height in the middle. Keep option backgrounds transparent and confine the
  selected theme accent to the silhouette outline and shape label.
- Place identity and surface actions in the exposed outer shell. Place editable
  fields and primary content in the quieter inner panel.
- Keep compact LiveCard action icons content-sized and background-free. Use the
  shared `LiveCardHeaderActionButton`; hover may raise icon opacity but must not add
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
- While one or more LiveCards are being dragged, temporarily replace the header
  Dynamic Island with an enlarged red trash target. Strengthen its tint and icon
  motion when the pointer enters the island, delete the complete dragged selection
  on drop, and restore the normal title state when the drag ends. Dropping anywhere
  else must preserve the existing Board reordering behavior.

Treat each expanded Title Island state as a composable feature. A feature owns its
content, expanded dimensions, surface treatment, dismissal behavior, interaction
blocking policy, and priority; the shared shell owns only collapsed title progress,
shape transitions, and active-feature resolution. Resolve direct-manipulation
interactions above notifications, and notifications above user-opened panels.
Add new states through the `TitleIslandFeature` contract instead of adding another
business-specific branch to the shell.

The reference implementation is `LiveCardSurface` in
`apps/extension/src/components/live-card/card-surface.tsx`.

LiveCard item markers communicate ordering semantics. Timelines use the shared
rail and grouped relative-time labels. Rankings use numbered circular markers
and may briefly show movement after a refresh. Unordered lists use a quiet dot
in the same marker column, show available item times as muted inline metadata,
and never show rank movement. Keep the marker column width stable across these
presentations so item summaries do not shift when a Source changes its
effective presentation.

### Next Layer Widget surfaces

Next Layer uses a responsive GridStack presentation adapter for movable and
resizable local Widgets. Persist each Widget's position and dimensions in its
Board rather than treating GridStack as the durable layout model. Resize from
the lower and right edges without adding dedicated visible drag or resize
controls.

Keep the trusted Widget shell outside the iframe and reuse the LiveCard surface
language directly: `LiveCardSurface`, `p-2.5`, a `text-base font-bold` title, and
`LiveCardHeaderActionButton`. The shell follows the Board theme because an
aggregating Widget has no single Source provider palette. The host owns the
title, refresh state and button, drag behavior, nested `2xl` content surface,
and error or connection treatment.

Keep the iframe and its document background transparent so the host's nested
surface remains visible. iframe content must not repeat the title, refresh
control, outer padding, rounded shell, or background. It may render links as
normal new-tab links; the host sandbox permits popups while retaining script,
DOM, storage, and same-origin isolation. Widget content should use NewsNext
semantic typography, foreground, muted, divider, hover, spacing, and motion
tokens instead of copying raw colors or defining an unrelated visual system.

Preserve Now Layer's intrinsic centered LiveCard layout inside the same maximum
content width as Next Layer. Limit both Layers to the equivalent width of a
four-column LiveCard row. The shared Board container owns both Layers'
responsive content insets and fills the space naturally allocated below the
responsive Header. Now Layer and Next Layer must share the application root
viewport and must not define their own scrolling, page padding, or content-width
rules. This keeps their visible region, Header progress, and scroll restoration
consistent when switching Layers.
Record scroll positions by Board and Layer, but restore them only after the
target Board and Layer have replaced the outgoing transition content. Route
completion alone is too early because the outgoing view remains mounted during
its card scatter animation. Board-only, Layer-only, and combined Board/Layer
changes must use the same post-mount restoration path.

Treat Now Layer and Next Layer as peers during transitions. Reveal the incoming
Layer only after the departing Layer's visible cards exit horizontally and fade.
Keep exactly one Layer mounted at a time: finish the current Layer's exit,
unmount it, and only then mount the target Layer. Apply the same exit animation
to LiveCards and Widgets: send cards on the left toward the left edge and cards
on the right toward the right edge while preserving their vertical positions.
Never reverse these paths to make either Layer converge back into place, and
respect reduced-motion preferences by switching Layers immediately. Do not
scale or blur the full page during this transition.
Play Now Layer's staggered LiveCard entrance on its first mount, after changing
Boards, and whenever returning from Next Layer. Treat it as a fresh reveal from
below with opacity, not as a reversal of the departing scatter paths.
Apply the same entrance duration, vertical offset, and stagger to Next Layer
Widgets whenever Next Layer mounts. Board View owns one entrance lifecycle for
both Layers: mount the incoming Layer hidden, restore its root scroll position,
allow visible content and layout work to settle, and then start the entrance.
Run the same Web Animations keyframes on the Now Layer LiveCard wrapper and Next
Layer GridStack content wrapper so the entrance does not interfere with
GridStack positioning. Animate only visible items, derive stagger from visible
order rather than full-list indexes, and release the animations after the
sequence finishes so offscreen items do not replay it when scrolled into view.
Keep Motion layout projection mounted on sortable Now Layer items, but suspend
its measurements with a stable `layoutDependency` until their entrance finishes.
Then use the ordered ID array as the dependency for drag reordering. The entrance
must begin from the restored scroll position without a competing layout
transition.

Snapshot both the rendered Board and Layer for the duration of an exit. Never
replace an outgoing Now Layer with the target Board's LiveCards before the exit
finishes. Keep one exit in flight when the pending Board or Layer changes, and
mount only the latest target when that exit finishes instead of restarting the
outgoing animation. Board changes within Now Layer use the same exit-then-enter sequence;
Board changes within Next Layer use the same sequence and mount a distinct
Widget grid for the target Board. Never share a Next Layer instance or layout
between Boards.

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
Represent the active Board layer in the route and preserve scroll positions by
Board and layer. Now and Next use separate scroll containers; restore either
position without scroll animation, and synchronize the Dynamic Island progress
outline with the active container immediately afterward.
Treat a Board's default layer as its persisted active layer. The layer shortcut
and Board settings update the same preference; Router history state only mirrors
it so Now and Next can use separate scroll restoration keys.

### LiveCard reordering

- Every Board supports the same ordering modes and manual dragging from the
  full LiveCard header. Do not render a separate drag button. Keep nested header
  controls clickable, and give the draggable header an accessible name that
  identifies the LiveCard being moved.
- Start marquee selection only from empty space between LiveCards so card
  controls and content scrolling keep their normal pointer behavior. Extend a
  transparent marquee hit area across the full viewport so visually empty
  perimeter space can reliably start a selection without changing the layout
  or drop boundary. Use a translucent
  theme-colored selection rectangle, then enclose the selected cards in one
  continuous group outline instead of framing every card separately. Render
  both selection states with the same `SquircleBox` `3xl` geometry as a
  LiveCard, plus the same border width, border color, and translucent fill.
  Dragging any selected card moves the full selection. Preserve the cards'
  Board order even when the marquee selected them in a different sequence, and
  clear the selection as soon as the drag ends.
- Keep the LiveCard layout fixed while dragging and show a theme-colored
  insertion indicator at the resolved slot. Apply the new order only on drop so
  cards do not move away while the pointer is still choosing a destination.
  Register the list itself as the drop target so a valid release dismisses the
  native preview instead of animating it back to the source position.
  Snapshot the wrapped LiveCard slots when dragging starts, then resolve the
  pointer against the nearest row and the horizontal midpoint of its slots.
- Auto-scroll the root Now Layer scroll container vertically when a dragged
  LiveCard approaches its viewport edges. Use the fast PDD scroll profile so
  movement remains perceptible beside full-height LiveCards, and keep horizontal
  auto-scroll disabled.
- Preserve the original order when a drag is cancelled or ends outside the
  board. Require an active list drop target as well as an in-bounds pointer
  before committing the order so Escape never acts like a drop. Gaps inside the
  board may retain the most recent valid placement.
- Keep every dragged LiveCard in the layout and reduce all of their opacity
  equally so the complete group's original position remains understandable.
- Keep the drag preview inside the source provider's theme-color scope. Native
  drag previews are mounted outside the LiveCard tree, so inherited theme tokens
  used by cloned content must remain available to each preview surface. Render
  each preview as a compact clone of the LiveCard header, arrange grouped
  previews vertically without overlap, and add a count badge when the selection
  contains more than one LiveCard. Keep that list in Board order and offset the
  native preview so the pointer stays on the preview whose handle started the
  drag. Pre-compose every translucent theme surface over the opaque app
  background before the browser applies its native drag-image treatment.

## Dialog Patterns

Choose the dialog structure from its information architecture rather than
applying one frame treatment to every modal.

Search, Settings, and single-column task dialogs are not exceptions to a default
dialog layout. They are distinct compositions for different tasks and content
relationships, while sharing the same surface language, theme treatment,
hierarchy, motion, and interaction principles. Structural consistency means
applying that common foundation coherently, not forcing every dialog into the
same arrangement.

### Shared modal foundation

All modal-style UI, including task dialogs and command dialogs, must reuse the
shared modal components instead of defining local backdrop values or motion.
`ModalOverlay` uses `bg-black/75` without backdrop blur and applies a
`150ms` opacity fade. `ModalPopup` owns the centered modal motion, while
`ModalTitle` and `ModalDescription` own their shared visual
treatments. Centered surfaces use a `3xl` outer squircle with an opaque
`bg-background` base beneath a `bg-theme-400/45` overlay, and a `10px` shell
inset where a nested surface is present. Nested content uses a `2xl` shape with
`bg-background/70` and `zenith-theme-400`.

Primitive-specific components compose `ModalOverlay`, `ModalPopup`,
`ModalTitle` and `ModalDescription` from
`@newsnext/ui/components/modal`. Keep the shared styling encapsulated directly
in these components instead of introducing parallel CSS utilities.

For centered task modals with a visible title, keep a compact header in the
exposed top shell, then place descriptions, fields, and primary content in a
nested neutral surface below it. The title must never move into the nested
surface. Board create and edit place their primary submit action in the header's
upper-right while keeping the title centered; destructive edit actions remain
in the nested surface. `DialogContent` provides the shell; callers compose
`DialogHeader` followed by a `modal-inner` `SquircleBox`. Compact command
dialogs such as Search may omit the visible header and begin directly with the
nested interactive surface, while retaining an accessible hidden title and
description.

Keep content-specific layouts distinct when needed, but keep overlay opacity,
shell color, primary radii, and motion consistent. Popover menus and anchored
transient controls do not use a modal overlay.

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

Single-column dialogs related to boards should use the LiveCard surface language.
They must have:

- A theme-colored outer `3xl` squircle with an opaque `bg-background` base and
  a `bg-theme-400/45` overlay. Its structure follows LiveCards, but its
  restrained theme opacity follows Settings.
- `10px` (`p-2.5`) of outer padding on every side, leaving a visible theme-colored
  shell around the nested content.
- A compact top shell area containing the dialog title for task-oriented forms.
- A nested `2xl` content squircle using `bg-background/70` and
  `zenith-theme-400`.
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
LiveCards owned only by that Board. `Transfer and Delete` requires a target
Board and merges the deleted Board's LiveCards into it. Default layer uses a
compact segmented `Now` / `Next` control and determines which Board view opens
by default. In particular, do not
add the following descriptions back to this dialog:

- `Personalize this board and choose how its LiveCards are arranged.`
- `Group LiveCards around a topic, project, or reading routine.`

### LiveCard Board membership

The LiveCard back edits Board membership with a checkbox menu, not a
single-choice Board select. An Instance belongs to one or several Boards.
The compact trigger shows the sole Board name or the
membership count; the menu lists every Board with independent checked state.
Toggling one row must not remove other memberships.
Disable the final checked membership and any row whose Action is pending so
every LiveCard remains on at least one Board.

### Settings dialog

Use a stacked layout for Settings: omit a visible dialog title, place the
horizontal tab list in the exposed top shell, then place the active panel in the
nested neutral squircle below. Keep an accessible hidden dialog title. Keep the
tabs on one row at narrow widths. Constrain the tab list to the available width
and let its items shrink and truncate instead of placing it inside a
horizontal scroller. Render Settings navigation as a transparent text tab list
with no pill background, shadow, blur, rounded active surface, or sliding pill.
Align it with the nested content surface and distribute the tabs evenly. Do not
add a baseline, active underline, dot, or other selection ornament. Distinguish
the active tab through neutral foreground contrast and semibold weight alone.
Reduce tab text to `text-xs` below the `sm` breakpoint so all labels retain
useful width without a scroller. Do not show the active tab as a subtitle above
the panel.
Retain the active settings content's internal padding inside its nested surface.

Keep settings controls compact and visually consistent. Use a 6px slider track
with a clearly visible themed range and a 14px thumb filled with a light theme
shade; the track and thumb must remain legible against nested tinted surfaces.
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
and spacing; only their HTML semantics differ. Its standard surface defaults to
the subtle `2xl` LiveCard background and compact `10px` content inset used by
Settings controls. Disable it only for nested fields or specialized list and
preview layouts that already provide their own surface.
Reset the shared settings content scroller to the top when the active tab
changes; do not remount tab content or discard unsaved control state to do so.

### Search dialog

The Search dialog is a compact, single-column LiveCard locator. Do not show a
visible title or header; open directly into the search field and results inside
one nested `2xl` neutral squircle. Retain a screen-reader-only title and
description for dialog semantics. Keep the saved Search binding plus navigation,
open, and close keyboard hints in one quiet footer below and outside the nested
result surface instead of repeating the action inside the selected row. Hide
the Search hint when its binding is cleared. Render shortcuts as soft filled
keycaps without borders, shadows, or separators. Group results by Board in the
saved Board order and omit empty groups. Within each group, show the LiveCard
title and provider;
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
selection changes. Use the active `theme-400` color at 18% opacity for every
active result row so selection consistently follows the current board theme.
Result rows must not carry provider `zenith-*` theme classes. Keep dividers and
selection treatments quiet.
Selected result color must update immediately without a color transition so
keyboard navigation never feels behind the current selection.
Activating a result closes the dialog, opens the LiveCard's assigned Board, and
scrolls the real LiveCard into view. Do not embed a LiveCard preview in Search: a full LiveCard turns the
locator into a second board, duplicates surface insets, and delays useful
results while LiveCard content loads. Do not add decorative illustration or generic
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

## Copy

- Use English sentence case for the canonical message catalog. Render
  user-facing product copy through the typed i18n catalog so English,
  Simplified Chinese, and Traditional Chinese stay aligned. Brand names,
  provider content, user data, and technical identifiers remain untranslated.
- Language selection follows the system by default. An explicit selection is
  device-local, applies immediately, and must update the document language so
  assistive technology receives the correct locale.
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

Organize Cosmos as a component catalog with three clear levels: `Basics` for
reusable UI primitives, `Patterns` for NewsNext-specific compositions, and
`LiveCards` for complete LiveCard states. Business dialogs and full LiveCards
must not appear in Basics when only one of their underlying controls is
being documented.

Keep the catalog navigation task-oriented and shallow. Group Basics by
foundation, actions, forms, feedback, surfaces, navigation, overlays, and
shapes. Group Patterns by theme, Dynamic Island, notifications, and dialogs.
Do not register the same fixture in multiple catalog locations, and remove
generic implementation demos when an existing component or LiveCard specimen
already demonstrates the behavior in its real product context.

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
LiveCard button families together in a provider-scoped specimen: header icon
controls, compact edit actions, parameter choices, and source-state actions.
Show those controls without moving a complete LiveCard into Basics. Preserve
their intrinsic content width in the catalog and cap them at the specimen width;
grid-based fixture containers must not stretch buttons into full-width actions.

Keep shared Button variants limited to reusable visual hierarchy. Contextual
treatments are compositions: LiveCard header icons use `LiveCardHeaderActionButton`,
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
In light mode, keep the surface tint restrained and carry more of the Board
color in the collapsed state's ambient
shadow. In dark mode, reduce the tint further and use a neutral deep shadow. Keep
the surface and its content tied to the actual light or dark appearance instead
of forcing dark-mode colors. Build restrained material depth with a subtle
vertical top light, asymmetric inner edge lighting, and separate contact and
ambient shadows. Do not use a uniform border, visible noise texture, directional
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

## Desktop Tray Menu

Keep the desktop tray menu task-first and compact. Settings is the first action
and opens the NewsNext App settings window. Connection status is non-interactive
supporting information, and Quit NewsNext remains the final action separated
from status. Browser integration is managed from the App settings window rather
than the tray menu.

Expose Open at Login as the same checked setting in the App settings window
and tray menu. Either control updates the system login item and immediately
synchronizes the other control. When enabled, launch the App at login as a
silent menu bar service without showing the settings window or Dock icon.
Showing Settings adds the App to the Dock while the window is open; closing the
window hides it and removes the Dock icon without stopping the menu bar service
or daemon.

## Implementation Checklist

When changing interface styling:

1. Check whether an existing LiveCard, dialog, control, or surface already provides
   the intended treatment.
2. Keep theme variables and shared Tailwind utilities intact instead of using
   isolated literal colors.
3. Verify hierarchy, squircle clipping, padding, close-button alignment, focus
   states, and both light and dark themes.
4. Use ego-lite to inspect extension UI changes at
   `chrome-extension://blkhpdbooolmhamhbpnfinmfghginnbh/app.html`.
5. Update this document when the change creates, removes, or revises a durable
   design rule.
