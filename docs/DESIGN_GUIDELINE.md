# Design Guideline

Canonical design spec. Keep aligned with implemented React components and
Tailwind utilities. Values here are normative; code comments point back here.

## Shared foundations

- `@newsnext/shared` owns theme palette and base types, never depends on SDK
  or CLI. SDK re-exports from shared; no generated copies.
- NewsNext feels like tactile LiveCards, not a dashboard. Dialogs and controls
  reuse the LiveCard language, never generic overlays.

### Landing page

- Layout in component Tailwind utilities; global stylesheet holds only theme
  tokens, background imports, base rules. Mobile-first, default breakpoints,
  standard scales (no legacy arbitrary pixels).
- One centered intro, no illustrations/animation/feature sections/repeated
  CTAs. Icon `w-24 sm:w-32` + wordmark `w-32`, `gap-5`, intro after `mt-8`,
  intro `max-w-lg`, main `max-w-3xl`.
- Heading "Your personal dashboard", medium neutral `text-2xl sm:text-3xl`
  `tracking-tight`. Three columns (`mt-5`, `gap-2 sm:gap-5`) for "Live
  updates" / "Track changes" / "Spot trends": muted medium `text-xs sm:text-sm`,
  small static accent symbols (decorative, `aria-hidden`), above phrases by
  default, beside from `sm` up, always one row.
- GitHub action after `mt-7`, `min-h-12 px-6 py-3`, solid neutral pill, no
  glass. Icon shadow uses `drop-shadow-brand` (`0 8px 12px rgb(0 0 0 / 8%)`,
  `dark:drop-shadow-black/20`) — intentional exception to the shadow scale.
- Optical centering (more space below intro); short viewports scroll. Footer:
  two compact rows, `gap-1`, `max-w-sm` balanced attribution (softer,
  underlined repo link) + Privacy/Support separated by middle dot, links
  `min-h-8 px-2`, no brand header, no footer divider.
- Dark mode + reduced motion throughout. Background: extension gradient SVG
  icon, shared light/dark tokens, `zenith-theme-400/60` wash from above,
  `page-background.css` masked grid below, fixed to viewport on long pages.
- Supporting pages: `max-w-2xl` column, plain headings, home link, own
  title/description/canonical URL. Shared landing footer holds Privacy +
  Support. 404 shares layout and action treatment.
- Icon: reuse `apps/extension/public/icon/icon.svg`; interface layers use
  `currentColor`, rasters stay in `public/icon/`. sRGB fallback + basic
  opacity for standalone renderers; no CSS vars / `oklch()` / `color-mix()`
  in the asset; no dark or themed variants.

### Shared tokens and surfaces

- Theme color signals context/ownership, never decoration.
- Light `background` `#F7F7F7` (zenith gradient separate). Light `border`:
  `neutral-700` at 20% (`border-border/60`, `divide-border/50`); dark: white 10%.
- Light foreground `neutral-700`, muted `neutral-600`; emphasis via weight and
  semantic color, never near-black on pastel. Focus borders/rings use active
  `theme-400`, never neutral.
- Header Dynamic Island is the raised focal point; nav/search/refresh/time/user
  recede. `island-pill`: light `bg-background/50` with top 1%-black-over-9px
  and bottom 18%-white-over-12px shading; dark `bg-black/10`, no gradient.
  Rest `shadow-sm` + `shadow-theme-400/15` (light) / `/5` (dark); hover adds
  blur + `shadow-theme-400/30` both modes, 200ms ease, disabled on reduced
  motion. Buttons: `background-clip` + `background-origin` = `border-box`.
- Depth via layered translucency, never opaque panels/heavy borders. No
  hairline rings on LiveCards/modals/nested modal surfaces. No close buttons
  (Escape + backdrop; explicit Cancel only for consequential confirms).
- Squircles for major/nested containers. Quiet decoration. Phosphor Bold
  everywhere; LiveCard header actions keep Duotone.
- Page breathing room 24px top/bottom. `xs` = 30rem; 24px card/board gutter
  at/above `xs`, 8px below. Name 1–2 animated properties; `transition-all`
  only for 3+.

### Scrollbars

- Native when both axes overlay; else shared `overlayScrollbarsRef` (or
  `useOverlayScrollbars` over an existing ref). Never touch native scrollbar
  CSS. See `PERFORMANCE_GUIDELINE.md` for init rules.
- Custom: overlay (no layout), 8px track / 6px thumb / 1px inset, transparent
  track, rounded `foreground` thumbs 24% rest / 40% hover / 56% pressed.
  Reveal on scroll/pointer, hide after 800ms idle; stay visible during
  interaction and viewport keyboard focus. Reduced motion + forced-colors
  (`ButtonText`/`Highlight`) respected.
- Board viewport, board nav, Widget grid, both LiveCard faces, and embedded
  Widget docs use `scrollbar-hidden` — never custom instances there. Keep
  keyboard scroll, scroll refs, virtual lists. Widget docs never scroll; host
  panel owns scrolling (`WIDGET_GUIDELINE.md`, `cli/docs/widget-design.md`).
- Tracks sit on the surface's outer edge. Settings/Board dialogs: move shell's
  10px right padding into the scroller so text keeps inset, scrollbar reaches
  edge.

### App background

- `zenith-theme-400` wash from active board theme on main + related surfaces.
- Blocking head script resolves light/dark/system + theme color before entry;
  mode + color classes on `<html>`, `html`/`body` on `var(--background)`.
- App entry syncs themed SVG favicon (`theme-500`) before React mount, reusing
  geometry with `currentColor` (shared with theme selector). Independent of
  head bootstrap and provider composition.

## LiveCard Surface Language

LiveCards are the primary surface.

- Outer `3xl` squircle `bg-theme-400/45`; content panel nested `2xl`
  `bg-background/70` + matching `zenith-theme-400`. Scope provider color class
  at card boundary; consume inherited `--color-theme-*` via static `theme-*`
  utilities, never runtime-built palette classes. Shades 100–900 available.
- `primary` = app accent (never raw `theme-500`); explicit `theme-*` only for
  local palettes (provider cards, theme choices, tonal gradients).
- `Card`/`Alert` stay on semantic background/foreground — no LiveCard color
  pair; hierarchy via translucent/theme-mixed treatments. Semantic surfaces
  from Tailwind palette vars, never raw OKLCH/hex copies. `muted` =
  LiveCard `neutral-400/10`; explicit shades only where tokens can't preserve
  card light/dark states.
- Theme palette (12, intentional): red, pink, fuchsia, purple, indigo, blue,
  cyan, teal, green, amber, orange, slate.
- Shell/content gap `p-2.5` (10px) where shell must show. Desktop card height
  `h-125` (500px); Radar-type surfaces may define their own.
- Outer shell: identity + actions. Inner panel: editable fields + content.
- `SourceIcon`, always circular (no local radius overrides), size varies by
  context. Provider icon + source badge = one identity, pass both when
  available. Missing/failed icons: Boring `bauhaus` avatar via `SourceIcon`
  (geometric, no faces), inline SVG inheriting `--color-theme-*` (follows card
  palette incl. Color previews). Seed fixes geometry/palette; theme changes
  update shades. Widget avatars seed on stable Widget ID (rename/palette/
  refresh/move/flip keep identity). Circular + Badge overlay retained.
- Headers: single title line beside icon + actions, 8px gap to inner panel
  both faces. No refresh times/subtitles; refresh shown via action animation.
- Actions: content-sized, background-free, shared `CardHeaderActionButton`;
  hover raises icon opacity only — no filled surface, no spacing growth.
- Refresh feedback: fade + pulse on explicit refresh or auto-fetch without
  current/placeholder data; keep renderable old data stable on background
  refreshes. Minimum 500ms visibility (incl. one-minute-guard instant reuse).
- Buttons default to app primary; inside provider cards use `tone="theme"`
  (filled + outline). No color-context variant names. Theme outlines:
  transparent at rest, tinted on hover/focus.
- Header island expands to 270×110 board-color panel; only control is the
  six-column theme palette, 232×72 grid centered (19px clearance/side).
  Collapsed: active board SVG icon via `currentColor` (no legacy logo).
  `ThemeSelector` stays six columns through animation; mode lives in
  Appearance settings. Edits the same persisted board preference as its editor.
- Widgets: separate inline `CardColorSelector` (swatch at rest, compact
  six-column menu when editing, shared Select surface, circular hover/rings;
  never the board icon palette). LiveCards: no color editing (palette always
  from provider).
- Drag: island becomes enlarged red trash target; stronger tint + icon motion
  on pointer-enter. Valid drop deletes card / removes widget from originating
  board. Drag end restores title state. Trash/outside drops cancel preview
  without saving order.
- Expanded Title Island states are composable `TitleIslandFeature`s (content,
  size, treatment, dismissal, blocking, priority); shell owns collapsed
  progress, shape transitions, resolution. Priority: direct manipulation >
  notifications > user panels. New states via contract, never shell branches.
- Reference: `CardSurface` in
  `apps/extension/src/components/live-card/card-surface.tsx`.
- Markers: shared column width stable across presentations. Timelines: shared
  rail + grouped relative labels. Rankings: numbered circular markers, brief
  post-refresh movement allowed. Unordered: quiet dot, item times as muted
  inline metadata, never rank movement.

### News item preview

- Anchored popover after 300ms hover, incl. items without extended content.
  Trigger limited to item's left half (pointer path to left-positioned
  preview). Whole item is the link target; press never opens preview.
  Shared composition renders text/sanitized HTML/pictures/iframes. Multiple
  pictures = one stable carousel (wrapping prev/next, active picture kept
  into full-size viewer). Picture + text both enter viewer; title used when no
  actionable content.
- Expanded: media + text side-by-side wide, stacked narrow. Media region
  neutral: light `bg-neutral-200/50`, dark `bg-neutral-800/25` over dialog
  `neutral-900` (≈`#1B1B1B`), covering letterbox + iframe gutters. Text region
  `bg-background`; text-only items take full surface (no empty media column).
  Footer actions anchored right so layout shifts never move them. Detail
  column + title stay visible for media previews without body. Expanded media
  flush with region; symmetric inset only for overlay-control clearance.
- Text-only: centered reading column, footer anchored to edge. Justified
  multi-line titles/body, natural last lines; titles 18px/500, body 16px/400.
  Footer left inline text gets small optical inset; right controls unmoved.
- Detail column: fixed identity header, independently scrolling title/body,
  fixed footer (inline presentation + original link). Identity: `author` icon
  + name, shared `beam` avatar (seeded by author name) on missing/failed icon,
  else shared Source icon/badge + card name. Wide ≈60/40 media/detail. Card
  color carried through identity context (generated avatars keep palette in
  portal).
- Inline metadata vertically centered in items + preview footers: 14px box for
  compact 12px, 20px box for expanded 14px; stat icons sized to text box,
  never baseline/edge aligned.
- Multi-item lists: prev/next controls immediately before original-link
  control; disabled at boundaries; carousel resets to first picture on item
  navigation.
- No second inner radius on inset media: 16px popover padding already consumes
  `rounded-2xl`; expanded media likewise un-radiused — fullscreen surface is
  the only clip.
- Compact rows `select-none` (predictable drag/click); both previews allow
  selection; post-selection-drag clicks never open expanded surface.
- Same wrapping controls + Left/Right navigation in both surfaces.

### Shared Card behavior

- Card/Widget share one interaction model; Widget varies only in dimensions,
  renderers, data adapters. Headers, metadata, params, board switching, removal
  confirm, flip/focus, refresh feedback reuse the same components.
  `CardMetadataSettings`: Title/Description/Home/Badge both, + Color for
  Widgets only. Display overrides never change provider identity; permissions
  and data diagnostics belong to adapter content.

### Next Layer surfaces

- Shared Pragmatic Drag and Drop + one pure ordered packing fn (layout, drag
  previews, resize previews, reflow). Persist order + dimensions, never x/y
  (stored `x`/`y` ignored, order wins). Widget vs LiveCard drag data isolated
  (widgets can't move cards). Header trash dispatches by kind, requires
  originating board + widget IDs.
- Footprints in half-card units (`2×2` = 400×500 LiveCard; see
  `WIDGET_GUIDELINE.md`). Widths 2–4 units → visible 400/612/824px at
  24px gutter, every viewport. Center complete columns up to 4 cards;
  horizontal scroll when widest widget can't fit. Cells 212×262 incl. gutter;
  `2×1` = 400×238 after gutter. Width ≥2 and height ≥1; never backfill gaps.
- Drag: snapshot order + grab offset at start; precompute packed result per
  insertion, others keep relative order. Follow nearest dragged-card position;
  switch only when another candidate is >12px closer; ties keep current
  preview (else smallest change from original). Leaving grid (incl. trash)
  restores original immediately, unsaved; re-entry resolves fresh preview.
  Dragged slot = subdued placeholder. Valid drop commits preview; outside
  cancels. Resize reflows without saving.
- Resize: right/bottom/corner handles, pointer capture, edges track cursor at
  pixel precision without slot transition (never lags). Clamp to manifest
  minimums, two-card width, grid right edge, max rows; neighbors still until
  release; grid grows so edge stays reachable. Release snaps to cell boundary,
  animates with 180ms ease (same as slot movement). Arrow keys resize one cell
  immediately. Transitions off only for navigation/pointer-resize/reduced
  motion. Dimensions change, order doesn't. Escape/cancel restores sizes.
  Honor the shared two-unit minimum width and manifest minimums.
- Iframes stay mounted in stable React slots across geometry changes; disable
  iframe pointer events during drag/resize, restore after. Scatter animations
  on inner `data-widget-transition` wrapper (420ms entrance, 80ms delay, 10ms
  stagger, by visual row/column not DOM order). Slot transitions off while
  scatter pending/entering/exiting; initial measurement settles motion-free.
  Overflow visible during navigation; horizontal scroll after only if needed.
- Widget definitions/views/documents/shell: `WIDGET_GUIDELINE.md`. Here: grid +
  shared layer behavior only.
- Now Layer keeps intrinsic centered card layout inside Next Layer's max width
  (≤ four-column row). Shared board container owns responsive insets; both
  layers fill below responsive header. Shared root viewport; no own vertical
  scroll or page padding (Next may scroll horizontally for fixed widgets).
  Header progress + scroll restoration stay consistent across layer switches.
- Scroll recorded per Board+Layer; restored only after target board+layer
  replaced outgoing transition content (route completion is too early — outgoing
  stays mounted during scatter). Board/Layer/combined changes share the
  post-mount path. Board+Layer navigation transitions directly between complete
  views; departing board never briefly shows destination layer.
- Transitions are peer-to-peer: incoming entrance overlaps departing exit; at
  most one outgoing view (rapid switch replaces older only when current ready).
  Pre-settle skips keep existing exit running, never blank screen. Outgoing
  pinned at viewport position, inert until unmount; incoming inert until scroll
  settles. Horizontal motion both cards + widgets: left cards exit left, right
  cards exit right, 80px margin, no vertical displacement. Exit 320ms
  accelerating (`cubic-bezier(0.4, 0, 1, 1)`), 10ms stagger/visible card.
  Reduced motion: instant. Never scale/blur full page.
- Detail flips: front/back rotate independently, 600ms
  `cubic-bezier(0.4, 0, 0.2, 1)`, inactive face non-interactive + backface
  hidden. No shared 3D wrapper around scrollable content. Stationary container
  gets centered 1200px perspective; each face translates away by half its
  extent × |sin(angle)| so nearest edge stays at/behind plane (container-
  relative, resize-safe). Reduced motion: instant.
- Entrance on page load + every board/layer mount (tabs, revisits): converge
  from exit side, fade 420ms `cubic-bezier(0.22, 1, 0.36, 1)`, start after
  80ms, 10ms stagger/visible card uncapped (later rows keep rhythm during
  overlap). Interrupted entrances exit from current position, no added stagger.
- Board View restores root scroll the frame after incoming mounts (no idle
  wait). Next Layer signals readiness after manifest list loads + grid mounts
  (empty/error also ready). Starting positions applied pre-reveal; sortable
  measurements resume post-animation. Interrupted entrances exit from current
  animated styles. Animation perf constraints:
  `PERFORMANCE_GUIDELINE.md#keep-animation-work-above-livecard-content`.
- Snapshot board + layer per departing view; never swap in target content
  during exit. Distinct widget grid + unique visit key per view (incl. rapid
  returns); never share cards/layouts between boards.
- Blank space never switches layers on click. Layers switch only via shared
  control/shortcut; Escape never leaves Next Layer.

### Keyboard shortcut settings

- Dedicated Settings tab; rows show purpose + platform-aware binding + reset.
  Recording starts from binding, preserves current, theme-ring capture state.
  Cancellation/clearing instructions stay in section description. Portable
  storage renders native modifier labels per platform. Cleared = disabled, kept
  in editor. Outside text entry, single-action commands own their key over
  focused buttons; single-key defers to text entry, modified globals (Search)
  stay active there. Users may remap/clear for native behavior.
- Rows size from panel container: narrow stacks details above controls;
  binding buttons equal width, centered labels; reset = compact labeled icon.
  Binding + reset 40px tall (reset 40px square). `island-pill` on both. `kbd`
  quiet text, never monospace.
- Hints read from saved bindings, never duplicated defaults; cleared bindings
  hide their hints. Prev/next board wrap the ordered list; default arrows work
  from page + focused tabs, directional keys preserved inside other controls.
- Board ID in route; active layer from board's persisted `layer`. Now/Next
  share root scroller, separate session positions per Board+Layer. Restore
  post-mount without animation; Dynamic Island progress follows container.
- Board layer = persisted active layer. Layer shortcut + board settings write
  the same preference, no history entries. Opening a board (incl. Back/Forward)
  uses latest persisted layer, never history snapshots.

### LiveCard reordering

- All boards share ordering modes + full-header manual drag. No drag buttons.
  Nested header controls stay clickable; draggable header gets accessible name
  identifying the card. Both layers share exclusion rules + `card-drag-placeholder`.
- Live order preview; neighbors animate via native 180ms ease translations on
  outer items; navigation animation stays on nested wrapper; reduced motion off.
  Commit on valid drop only. List itself is the drop target (valid release
  dismisses native preview instead of animating back). Snapshot slots at drag
  start; resolve pointer to nearest row + slot midpoint; always derive from
  original order/geometry so animated cards can't shift destinations.
- Auto-scroll root Now Layer container vertically near viewport edges (fast PDD
  profile, perceptible beside full-height cards); horizontal off.
- Leaving list / entering trash restores original immediately, unsaved; clears
  preview destination so re-entry resolves fresh from snapshot. Cancellation
  preserves original. Commit requires active list target + in-bounds pointer —
  Escape is never a drop. In-board gaps may keep most recent valid placement.
- Dragged card stays in layout at reduced opacity (original position readable).
- Drag preview stays in provider theme scope: native previews mount outside
  card tree, so clone a compact header with pre-composed translucent surfaces
  over opaque app background (before browser drag-image treatment). Offset so
  pointer stays at corresponding clone position.

## Dialog Patterns

Search, Settings, or single-column — all share the modal foundation.

### Shared modal foundation

- Create/Edit Board + Settings: `min(70vh, 640px)`; Search: 516px. Max widths:
  board dialogs 520px, Settings `2xl`, Search 816px. 16px horizontal viewport
  margins below `sm`. Inner content scrolls; shell + header fixed.
  Confirmations fit content.
- All modal UI reuses shared components — no local backdrop/motion values.
  `ModalOverlay`: `bg-black/75`, no blur, 150ms opacity fade. `ModalPopup`:
  centered motion. `ModalTitle`/`ModalDescription`: shared treatments. Centered
  surfaces: `3xl` outer squircle, opaque `bg-background` (same as item preview
  dialog), 10px shell inset. Content containers + scrollers transparent both
  modes (one dialog background; section Cards directly on it).
  `zenith-theme-400/60` wash directly on shell only — never another layer,
  never on scroller/sections. Stronger accents stay on controls/selection/focus.
- Primitives compose `ModalOverlay/Popup/Title/Description` from
  `@newsnext/ui/components/modal`; styling encapsulated there, no parallel
  utilities.
- Task modals with visible title: compact header in exposed top shell (title
  never in nested content); descriptions/fields/content below. Board create/edit:
  submit upper-right, title centered; destructive edit actions in content.
  `DialogContent` = shell; callers compose `DialogHeader` + transparent
  `SquircleBox` scroller; sections use shared subtle Card. Command dialogs
  (Search) may skip visible header (hidden accessible title/description kept).
- Overlay opacity, shell color, primary radii, motion consistent; layouts vary
  by task. Popovers/anchored transients: no modal overlay.
- Dropdowns/selects: compact translucent + blur, faint neutral outline,
  restrained shadow. 6px trigger gap, 32px rows, regular labels, uncontained
  theme checkmark for selection, subtle neutral wash for focus. Size to content.
- Destructive = shared inline two-step confirm, never another modal. Idle:
  never `destructive` variant/text/background — red is the default theme, so
  resting red competes with accents. Neutral first; armed = destructive outline
  + restrained bg + concise label + confirmation icon (never color/text alone).
  Second activation executes; focus-away cancels. Constrained header variant:
  icon-only idle → compact labeled button armed, 150ms reveal, 3s reset.

### Single-column dialogs

- Shared modal shell + transparent `2xl` scroller; subtle section Cards on it:
  `p-6`; 24px between sections, 8px title/label-to-control (via `ConfigSection`,
  never per-call-site spacing); theme grid centered, equal 8px gaps, never
  stretched; theme edits draft until save (selection never pre-applies);
  async actions disable controls, close/commit only on success, inline
  `role="alert"` on failure; no generic copy between title and first field
  when labels suffice.
- Unified Board dialog for create/edit: same name/theme/order/layer fields;
  deletion edit-only; title + primary action reflect mode
  (`Create board` / `Save changes`, upper-right header). Deletion needs ≥1
  remaining board. `Delete board and contents` removes all owned content;
  `Transfer contents and delete board` requires a target board and merges both
  layers into it. Default layer = compact
  `Now`/`Next` segmented control, decides opening view.

### LiveCard Board ownership

- Card back moves card between boards: single-choice radio, exactly one board.
  Compact trigger shows board name; selecting another performs one atomic move.
  Rows disabled while move action pending.

### Settings dialog

- Two columns, no visible title: vertical tab list in exposed left shell,
  active panel right. One continuous `bg-background` + `zenith-theme-400/60`
  wash, no nested panel bg. Subtle neutral section backgrounds; headings +
  spacing separate sections, quiet dividers for repeated rows. Hidden
  accessible title. Tabs: vertical semantics, Up/Down + Enter/Space; forward
  `orientation` to Base UI root, match `data-orientation` (no
  `data-vertical`/`data-horizontal`). Sidebar `w-24` below `sm`, `w-32` above,
  8px gap to flexible panel. `1px border-border/60` left divider on scroller,
  full dialog height. No shell vertical padding for Settings: 10px inset moves
  into column padding so divider reaches edges. Sidebar kept narrow, long tabs
  truncated. Columns scroll independently when constrained. Shared `sidebar`
  tab variant on transparent list. 40px rows, 4px gaps, `rounded-xl`, left
  labels. Active: `bg-foreground/10` neutral, full contrast, semibold both
  modes; inactive muted + subtle `bg-muted` hover; selected fill persists on
  hover. Never theme fill/underline/shadow/sliding pill. Tab text `text-xs`
  below `sm`. No active-tab subtitle above panel.
- Content scroller `pl-4 pr-6.5 py-6.5 sm:pl-6 sm:pr-8.5 sm:py-8.5`, shell no
  right padding; sidebar `py-4.5`. Fills belong to sections/selected
  nav/controls/records, never stacked wrappers.
- Opens on General. Language first, theme mode second; no Appearance tab.
- Controls compact + consistent: 6px slider track (visible themed range), 14px
  thumb (light theme shade), legible on neutral surface. 32px ordinary buttons,
  adjacent same height/size; text-only tertiary = `ghost` (never card-action
  composition). Removals grouped with their buttons, neutral until armed (only
  armed uses destructive outline); never detached text. Theme-colored buttons:
  white text both modes. Related controls in columns when width permits; labels/
  values/recovery adjacent to control. No helper text when label + control
  suffice.
- `ConfigSection` for panel headings + vertical fields (shared 8px rhythm);
  semantic variants share weight/inset/placement/spacing, differ in HTML only.
  Default subtle `2xl` Card + inset; `surface={false}` for nested/specialized
  lists (never stacked section bgs). Light subtle Card `bg-white/60` (no dark
  gray washes); dark `bg-foreground/3`. Tab change resets scroller to top
  without remounting or discarding unsaved state.
- Native integration switch = persisted preference only. Daemon health shown
  separately; missing status/errors/pending Worker ops never disable switch —
  only a pending toggle does.

### Search dialog

- Two-pane locator: search + results left, selected card right. No visible
  title/header; both panes in one nested `2xl` neutral squircle flush with
  shell (no outer inset). One quiet divider between panes. Preview at normal
  `400×500` (`w-100 h-125`) in 8px padding; left pane same 400px width. SR-only
  title/description. Saved Search binding applies; no shortcut hints inside.
  Results grouped by board in saved order, empty groups omitted. Rows: card
  title + provider (board context from group heading); `12px` horizontal /
  `10px` vertical padding; title + provider one row, title truncates first,
  provider omitted when duplicating card title.
- Search input = top row of nested panel, not a pill: no independent radius/
  fill, quiet bottom divider strengthening on focus, no outer ring. Autofocused,
  visible search icon.
- Shell inherits board theme, stable across selection. Active rows: shared
  neutral muted bg, never board/provider theme, no provider `zenith-*` classes.
  Quiet dividers/selection. Selection color updates instantly, no transition
  (keyboard never feels behind). Keyboard selection updates right card
  immediately. Hover never selects/previews (neutral muted hover bg only);
  click commits. Preview renders the real card (presentation, cached data,
  loading, interactions) — no search-only approximation. Clicking selects for
  preview only: never closes dialog, changes boards, or scrolls card into view.
  Preview draggable from same header surface, shared drag preview; while
  dragging, clear modal + backdrop visual/pointer obstruction so board + trash
  are available. Trash drop deletes (board behavior); current-board drop
  atomically transfers result from source board (quiet dashed board-wide
  indicator). No decorative illustration or helper copy.

### Radar dialog

- App-level Radar = focused card review, not form-around-preview. No visible
  title, outer shell, or nested surface — card stands alone. Destination +
  create controls in separate neutral floating capsule below. Provider color on
  card + primary action only; never wrap card in same-color block. Solid
  `background` behind card for separation; no gradient/offset/diffuse shadow.
- Overlay fades as creation celebration starts (confetti lands on board).
  Celebration ends → close, no card move/scale. Prev/next hidden for single
  suggestion; appear only when usable. SR-only title/description. Standalone
  popup declares red document theme pre-paint regardless of board colors;
  provider color stays scoped to card + action.

## Copy

- English sentence case in typed catalog → en + zh-Hans + zh-Hant aligned.
  Brand/provider content/user data/technical IDs untranslated.
- Language follows system by default; explicit choice is synced settings,
  applies immediately, updates document language for AT.
- Manifest/browser copy in `src/locales/` (WXT i18n); switchable React copy in
  typed i18next resources via react-i18next. Browser copy always follows
  browser locale, never in-app override.
- Labels name exactly what users control. Drop helpers repeating
  title/labels/controls. Keep validation + consequence text for recovery and
  destructive decisions.

## Component previews

- Cosmos: `Basics` (primitives) / `Patterns` (compositions) / `LiveCards`
  (complete states). Basics grouped: foundation, actions, forms, feedback,
  surfaces, navigation, overlays, shapes. Patterns: theme, Dynamic Island,
  notifications, dialogs. One registration per fixture; real product examples
  over implementation demos.
- Basics specimens: category label, title, one-sentence usage, neutral canvas,
  quiet bordered sections. Monospace state labels for meaningful states only.
  One Typography fixture (reading hierarchy), one Colors fixture (semantic +
  provider scales).
- Buttons/Badges separate fixtures: each public variant/size once, then states,
  icon placement, provider tone, render-prop composition. Card header/edit/
  param/state actions together in provider-scoped specimen (no full card in
  Basics). Buttons intrinsic width (specimen-capped); grids never stretch them.
- Shared Button variants = reusable hierarchy only. Contextual treatments
  compose (`CardHeaderActionButton`, `island-pill` on transparent Button).
  Never re-add `quiet`/`island`/business-context variant names. Disabled keeps
  variant colors + not-allowed cursor, suppresses hover/active, never opacity.
- Segmented radio groups speak board-nav-pill language: 4px gaps in shared
  island surface, muted inactive labels (contrast on hover only, no scale/bg),
  theme active pill, theme focus ring, subtle pressed offset. Active pill moves
  via shared-layout spring of Board Nav; isolated layout identity per group.
  `PillGroup`/`pillGroupItemClassName`/`PillGroupIndicator` own
  container/item/background; semantics stay in owners. Theme selector is a
  separate palette control (color grid, logo choices, hover scale, moving
  marker; Base UI radio semantics only).

## Dynamic Islands

- Compact centered controls expanding in place for one focused interaction.
  Shared component owns translucent semantic bg + restrained `theme-400` wash,
  top light, appearance-aware shadow, clipping, spring size/radius. Light
  collapsed: 88% white + 3% wash + neutral contact shadow (theme-strengthened
  on hover). Light expanded: 76% bg + 4% wash, same material calmer, broader
  elevation. Shadow in CSS (200ms ease-out hover/state; Motion owns size/
  radius); reduced motion off. Dark: 5% collapsed / 7% expanded wash, neutral
  deep resting shadow. Real light/dark surfaces, never forced dark colors.
  Subtle vertical top light + separate contact/ambient shadows; no inset
  shadows (border-like rim), uniform borders, noise, directional refraction, or
  animated specular. Expanded keeps blur translucency + faint theme identity +
  broad top light, neutral ambient shadow, no caller washes. Collapsed = round
  pill; expanded = progressive squircle (`corner-shape` → `clip-path: shape()`
  → `border-radius`). Animated island shadow on unclipped Motion shell,
  squircle on inner surface (fallback clipping never cuts elevation). Static
  surfaces use `SquircleBox` (same capability layer). Callers provide layout +
  theme-aware content only — never `island-pill`, extra bg, competing radius,
  or independent width/height transitions.
- Fallback chain runs fully through `clip-path` first; `fallback="border-radius"`
  only when fallback browsers must skip clipping (outset shadows, filters,
  complex compositing). Native `corner-shape` first when available.
- Native integration states (attempts / unavailable / startup failure) stay
  distinct. Concrete connection errors inline with alert semantics, wrapping
  for long paths. Latest error retained through retries; cleared on success or
  disable.
- Header island doubles as non-blocking notification surface (e.g. OPML import
  failure): takes priority, expands automatically — never dialogs or toasts.
  Page stays interactive, no focus moves, alert-semantics announcements. No
  dedicated dismiss (outside-click/scroll + 8s auto-dismiss); restores prior
  board panel if one was open, else collapses.
- Collapsed: short, full pill, denser than surrounding header controls.
- Scroll progress: completed outline tinted active theme + restrained matching
  outer glow on unclipped shell (beyond edge), tied to path visibility — never
  whole-island illumination at rest.
- Surface animates as one shape; remounted content enters with brief
  scale/opacity/blur inside clipped surface.
- Expanded content = one task; outside click/scroll closes.
- Visible keyboard focus; reduced motion honored.

## Implementation Checklist

1. Existing LiveCard/dialog/control/surface already provides it? Reuse.
2. Theme vars + shared utilities intact; no literal color copies.
3. Verify hierarchy, squircle clipping, padding, dismissal, focus, light + dark.
4. Browser check per `AGENTS.md` (ego-lite only on request).
5. Update this spec when the change creates, removes, or revises a rule.

## Stream diagnostics

- Vocabulary: **Streams** (continuous data), **Collection interval** + **Next
  collection** (scheduling), **Observations** (retained snapshots),
  **Automatic collection** (in card details).
- Overview leads with accumulation + collection problems. Stream rows open
  details directly, emphasize observation count. Latest collection/activity/
  interval on one line. Errors always visible; never infer failure from quiet
  content or present estimates as measured freshness. Incomplete totals are
  lower bounds with missing counts disclosed.
- Disambiguate cards/streams via Source identity, card names, explicit
  `key=value` param overrides. Show every sharing card's overrides, owning
  Worker, short Stream ID. Param summaries wrap, stay visible in details;
  missing info ≠ default params.
- Default stable identity order; toolbar **Stream order** explicitly opts into
  **Attention first**. No persistent header/footer explanations for sorting,
  interval bounds, snapshot times. Restoration/storage problems only when
  applicable.
- Details prioritize retained observations, results, content changes, waiting
  reasons, next/retry. Model diagnostics, full IDs, sharing metadata, raw
  config behind native disclosures.
- Card + LiveWidget share `components/card-shell` frame/header/refresh/drag
  preview. Product content + settings stay in adapters; shell never branches on
  entity type or fetches data.

### Workspace connection decisions

- Joining browser differing from shared Workspace gets inline choice: local +
  shared board/card/widget counts, explicit directions (Overwrite shared data /
  Merge both / Discard local data), separate Apply + sync button. Default Merge
  both, unsubmitted. Shared-ID conflict precedence + cross-browser overwrite
  effects explained pre-confirm. Sync paused while pending; toggling
  integration off stays available.
