# Project Instructions

## Project Overview

Newsnext is a personalized web crawler that runs inside a browser extension.

- Use English for all code, comments, and user-facing text written in the repository.
- Avoid creating Markdown documentation files unless the task explicitly requires them.

## Development

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
- Add or update tests for meaningful behavior changes, bug fixes, shared logic, and risky integration paths. Avoid adding low-value tests for trivial wiring, mechanical refactors, styling-only changes, or configuration-only changes when type-checking, linting, build output, or targeted manual verification covers the risk.
- Optimize render performance deliberately rather than by default.
- Avoid `any`; prefer `unknown` when a value is not yet known.
- Prefer `interface` for object shapes and `type` for unions, intersections, and mapped types.
- Keep strict typing intact, minimize type assertions, and keep types close to usage unless they are shared.
- Add explicit return types for public functions and exported APIs.
- Prefer `async`/`await` for asynchronous flows.
