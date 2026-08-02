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
- Prefer squircles for major containers and nested surfaces.
- Keep supporting decoration quiet. Controls and content should remain the
  visual focus.
- Reuse existing component treatments and tokens before introducing another
  surface style.

## Card Surface Language

Cards define the primary NewsNext surface treatment.

- The outer `3xl` squircle mixes `var(--background)` with the relevant theme
  color at 55%.
- The content panel uses a nested `2xl` squircle with `bg-background/70` and the
  matching `sunrise-*-400` treatment.
- Use `12px` (`p-3`) between the outer shell and nested content where the card
  shell must remain visible.
- Place identity and surface actions in the exposed outer shell. Place editable
  fields and primary content in the quieter inner panel.

The reference implementation is `CardSurface` in
`apps/extension/src/components/card/card-surface.tsx`.

## Dialog Patterns

Choose the dialog structure from its information architecture rather than
applying one frame treatment to every modal.

### Shared modal foundation

All modal-style UI, including dialogs, alert dialogs, command dialogs, sheets,
and drawers, must reuse the shared modal overlay instead of defining local
backdrop values. The shared overlay uses `bg-black/75`, a subtle `2px` backdrop
blur, and a `150ms` fade. Centered modal surfaces use a `3xl` outer squircle,
the shared 60% popover / 40% theme shell color, and an `8px` shell inset where a
nested surface is present. Nested content uses a `2xl` shape with
`bg-background/70` and `sunrise-theme-400`.

Keep content-specific layouts distinct when needed, but keep overlay opacity,
blur, shell color, primary radii, close-button treatment when present, and
motion consistent. Popover menus and anchored transient controls do not use a
modal overlay.

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
- `8px` (`p-2`) of outer padding on every side, leaving a visible theme-colored
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

The Board Edit and Add (`Create board`) dialogs are the canonical examples. In
particular, do not add the following descriptions back to those dialogs:

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

## Copy

- Use English sentence case for user-facing text.
- Prefer labels and action names that state exactly what users control.
- Remove helper text that repeats information already conveyed by the title,
  field labels, or visible controls.
- Keep validation and consequence text when it helps users recover or make an
  informed destructive decision.

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
