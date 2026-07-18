# Project Instructions

- Use English for all code, comments, and user-facing text written in the repository.
- Avoid creating Markdown documentation files unless the task explicitly requires them.

## Development

### SolidJS 2 Beta

- This project uses **SolidJS 2 beta**, not SolidJS 1.x.
- All SolidJS code must strictly follow [`doc/MIGRATION.md`](doc/MIGRATION.md).
- Before adding or changing SolidJS APIs, patterns, imports, JSX types, effects, lifecycle hooks, list rendering, stores, or reactive behavior, consult the migration guide and use the SolidJS 2 beta form.
- Do not introduce SolidJS 1.x-only APIs or patterns. In particular, `createEffect` must use the SolidJS 2 compute/apply signature described in the migration guide.


### Version Control

- Use `git` as the primary version control system for this repository.
- Prefer `git` commands and workflows for status checks, history inspection, branches, commits, and pushes.
- When asked to "separately push" multiple changes, treat that as separate commits pushed sequentially to `main` by default, not separate branches or pull requests, unless explicitly requested.

### Commit Messages

- All commit messages must follow Conventional Commits: `<type>(<scope>): <summary>`.
- Example: `chore(init): initial import`.

## General

- Use TypeScript 7, Solidjs v2 beta, Tailwind CSS v4, and Bun.
- Run tests with `bun run test` when verification is needed.
- Do not use `tsc` for type-checking in this repository; use `tsgo` instead.
- Components in `ui/*` come from `@base-ui/react`.
- When a render prop receives an element such as `Link`, the `Button` component injects into that element instead of wrapping it.
- Prefer functional components and composition; extract reusable behavior into custom hooks when it improves clarity.
- Follow the Rules of Hooks, keep state close to usage, and add effect cleanup when needed.
- Use semantic HTML and accessible interactions for forms and UI.
- Add or update tests for meaningful behavior changes, bug fixes, shared logic, and risky integration paths. Avoid adding low-value tests for trivial wiring, mechanical refactors, styling-only changes, or configuration-only changes when type-checking, linting, build output, or targeted manual verification covers the risk.
- Optimize render performance deliberately rather than by default.
- Avoid `any`; prefer `unknown` when a value is not yet known.
- Prefer `interface` for object shapes and `type` for unions, intersections, and mapped types.
- Keep strict typing intact, minimize type assertions, and keep types close to usage unless they are shared.
- Add explicit return types for public functions and exported APIs.
- Prefer `async`/`await` for asynchronous flows.
