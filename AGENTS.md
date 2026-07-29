# Project Instructions

## Project Overview

Newsnext is a personalized web crawler that runs inside a browser extension (mv3).

- Use English for all code, comments, and user-facing text written in the repository.
- Avoid creating Markdown documentation files unless the task explicitly requires them.

## Development

### Browser Automation

- Use ego-lite by default for browser control and browser automation tasks.

### Source Documentation

- `docs/SOURCE_GUIDELINE.md` is the canonical reference for source authors.
  Update it in the same change when author-facing configuration or behavior
  changes, including provider metadata, parameters, loaders, field selectors,
  transforms, Liquid templates, JMESPath, Radar rules, capabilities, secrets,
  caching, validation, and source security limits.
- `docs/SOURCE_ARCHITECTURE.md` is the canonical reference for source-system
  internals. Update it in the same change when registry generation, provider
  expansion, runtime resolution, extension execution, caching, template
  compilation, Radar execution, permission enforcement, or security boundaries
  change.
- Keep authoring syntax, field semantics, examples, and operational advice in
  the guide. Keep package boundaries, data flow, implementation lifecycle, and
  security design in the architecture document. Link between them instead of
  duplicating explanations.
- After source-related implementation or debugging work, capture durable
  lessons, non-obvious constraints, and recurring pitfalls in the appropriate
  document. Update both documents when a change affects both the public
  authoring contract and its internal implementation.
- Keep documentation and examples aligned with the current TypeScript APIs and
  runtime behavior.

### Version Control

- Use `git` as the primary version control system for this repository.
- Prefer `git` commands and workflows for status checks, history inspection, branches, commits, and pushes.
- When asked to "separately push" multiple changes, treat that as separate commits pushed sequentially to `main` by default, not separate branches or pull requests, unless explicitly requested.

### Commit Messages

- All commit messages must follow Conventional Commits: `<type>(<scope>): <summary>`.
- Example: `chore(init): initial import`.

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
