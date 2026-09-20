# Project Instructions

## Project Overview

Newsnext is a personalized web crawler that runs inside a browser extension (mv3).

- Use English for all code, comments, and user-facing text written in the repository.
- Avoid creating Markdown documentation files unless the task explicitly requires them.

## Development

### Browser Automation

- Only use ego-lite for browser debugging or automation tasks when the user
  explicitly requests it.
- Debug the extension UI by opening
  `chrome-extension://blkhpdbooolmhamhbpnfinmfghginnbh/app.html`
  directly. The user runs the development server; do not start another one.

### Documentation Principle

- Prefer short comments next to code (TSDoc / line comments) over separate
  Markdown. Field semantics, pixel values, timings, and single-component
  behavior belong in the type or component they describe.
- `docs/*.md` keep only cross-cutting invariants that are invisible from one
  file: package boundaries, data flow, layering, and global consistency rules.
  Link to code instead of restating values. Keep each guideline short; delete
  rather than duplicate what code already says. Exception: `DESIGN_GUIDELINE.md`
  is the design spec and keeps exact values as the implementation authority.
- Do not add Markdown files unless the task explicitly requires them.

### Source Documentation

- `docs/SOURCE_GUIDELINE.md` keeps only author-facing entry points and one
  minimal end-to-end example. Field semantics, loader options, template filters,
  and Radar matching belong as TSDoc on the corresponding types in
  `packages/source-kit` / `packages/sdk`.
- `docs/SOURCE_ARCHITECTURE.md` keeps only the cross-package pipeline and
  security boundaries. Per-loader normalization and single-function behavior
  belong as comments in the implementation.
- Update code comments in the same change as behavior changes; update the
  `docs` files only when a cross-cutting contract changes.

### Design Documentation

- `docs/DESIGN_GUIDELINE.md` is the canonical design spec and keeps concrete
  values (sizes, colors, timings). Code comments point back to it; do not
  duplicate the numbers in both places — single-component details live in
  code, cross-component rules and exact spec values live here.
- Update it only when UI work creates or revises a reusable rule shared by
  multiple surfaces.

### Widget Documentation

- `docs/WIDGET_GUIDELINE.md` keeps only Widget contracts spanning host and
  content. Manifest field semantics belong as TSDoc on the Widget types;
  layout rules already covered by the Design Guideline are linked, not copied.
- Update it only when Widget-facing cross-cutting behavior changes.

### Performance Documentation

- `docs/PERFORMANCE_GUIDELINE.md` keeps only measurement workflow and
  cross-cutting render invariants. Per-component ownership and memoization
  notes belong as comments at the component.
- Record durable, non-obvious pitfalls there; keep per-fix details in code.

### Jotai State Subscriptions

- Use only Jotai's public package entry points; do not import internal files.
- Jotai 3's `useAtomValue` and the read side of `useAtom` can miss updates
  between initial render and effect subscription. Awaiting storage initialization
  before rendering does not guarantee an already-created `atomWithStorage` has
  hydrated its in-memory value; it also reads storage on mount.
- Use `useAtomValueRawSync` for synchronous persisted state that determines
  initial navigation, provider configuration, or selection defaults. Audit each
  independently mounted app, popup, and shared selector. For writable state,
  pair it with `useSetAtom` instead of relying on `useAtom` to close this gap.
- Keep `useAtomValue` for ordinary concurrent subscriptions and async atoms that
  need Suspense. `useAtomValueRawSync` returns promises unchanged and makes store
  updates synchronous; do not replace all subscriptions mechanically.
- Validate subscription or dependency migrations with fresh mounts and affected
  interactions, not only HMR, type checks, or builds. Follow the browser automation
  policy above. Distinguish verified behavior from paths not exercised, and record
  durable findings in `docs/PERFORMANCE_GUIDELINE.md`.

### Version Control

- Use `git` as the primary version control system for this repository.
- Prefer `git` commands and workflows for status checks, history inspection, branches, commits, and pushes.
- Do not use GitHub `github:yeet` skills in this repository.
- Do not create branches or pull requests unless the user explicitly requests
  that exact action. When asked to commit or push without further
  qualification, commit the intended changes and push directly to the current
  branch.
- When asked to "separately push" multiple changes, treat that as separate
  commits pushed sequentially to the current branch, not separate branches or
  pull requests, unless explicitly requested.

### Commit Messages

- All commit messages must follow Conventional Commits: `<type>(<scope>): <summary>`.
- Example: `chore(init): initial import`.

### Code Quality

- Do not introduce duplicated or redundant code.
- Reuse an existing implementation when the same behavior or transformation
  already exists. Extract shared logic when multiple call sites would otherwise
  implement it independently.
- After every code edit, review the affected code before considering the work
  complete. Check for duplicated logic, dead code, unused state or parameters,
  unnecessary compatibility branches, redundant abstractions, and opportunities
  to express the same behavior more simply.
- Prefer the simplest implementation that remains clear, maintainable, strictly
  typed, and correct. Do not trade readability or type safety for fewer lines.

## General

- Use TypeScript, React 19, Tailwind CSS v4, and Bun.
- Run tests with `bun run test` when verification is needed.
- Run `bun run typecheck` to type-check all workspaces with TypeScript 7.
- Components in `ui/*` come from `@base-ui/react`.
- When a render prop receives an element such as `Link`, the `Button` component injects into that element instead of wrapping it.
- Prefer functional components and composition; extract reusable behavior into custom hooks when it improves clarity.
- Follow the Rules of Hooks, keep state close to usage, and add effect cleanup when needed.
- Use semantic HTML and accessible interactions for forms and UI.
- Only add unit tests for deterministic pure functions.
- Do not test React components, hooks, browser APIs, storage, network requests, WebSockets, CLI orchestration, or thin delegation wrappers with mocks.
- Extract reusable parsing, normalization, validation, matching, and decision logic into pure functions when it deserves testing.
- Do not add tests for trivial wiring, type-level guarantees, constants, direct property forwarding, mechanical refactors, styling-only changes, or configuration-only changes.
- Optimize render performance deliberately rather than by default.
- Avoid `any`; prefer `unknown` when a value is not yet known.
- Prefer `interface` for object shapes and `type` for unions, intersections, and mapped types.
- Keep strict typing intact, minimize type assertions, and keep types close to usage unless they are shared.
- Add explicit return types for public functions and exported APIs.
- Prefer `async`/`await` for asynchronous flows.
