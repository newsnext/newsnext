# Source Authoring Guide

Field semantics live as TSDoc on the types — links below.

- Provider/source shape: `ProviderConfig` in
  `packages/source-kit/src/registry/types.ts` (provider identity in
  `sdk/src/models/source.ts:SourceProvider`).
- Params (text/url/number/switch/select/multiselect + validation):
  `sdk/src/models/params.ts`, `source-kit/src/core/params.ts`.
- Loaders: JSON (`source-kit/src/core/loaders/json.ts`), HTML (`.../html.ts`),
  RSS (`.../rss.ts`), custom (`types/source.ts:SourceLoaderDefinition`).
  Output contract (`SourceLoaderOutput`, 50 items max, order preserved):
  `sdk/src/models/source.ts`.
- Templates/filters/scope: `source-kit/src/core/template.ts`. Request
  options/rules: `source-kit/src/utils/request/*`, `core/base-url.ts`,
  `core/capabilities.ts`. Radar matching: `sdk/src/models/source.ts:SourceRadarRule`
  + `source-kit/src/core/radar.ts`. Validation/errors:
  `registry/validation.ts`, `core/source-error.ts`, `core/limits.ts`.
- Internals: see `SOURCE_ARCHITECTURE.md`. Real examples: `registry/src/*`.

## Quick start

```ts
import type { ProviderConfig } from "@newsnext/source-kit/registry"

export default {
  title: "Example",
  color: "blue",
  defaults: { baseUrl: "https://example.com/" },
  sources: {
    latest: {
      metadata: { title: "Latest" },
      loader: {
        type: "json",
        url: "/articles",
        items: "data.items",
        fields: { title: "title", url: "url" },
      },
    },
  },
} satisfies ProviderConfig
```

- JSON for declarative loaders, TypeScript for custom loaders/helpers.
  Filename (or parent dir of nested `index.ts`) becomes the provider ID;
  one provider uses one format. Never edit `registry/registry.json` or
  `registry/sources.ts` — build with `bun --filter=@newsnext/registry run build`.
- Source IDs are `<provider>:<source>`.

## Local sources

Drop `<provider>.json` into the daemon `sources` dir
(dev: `~/.config/newsnext.dev/sources/`, prod: `~/.config/newsnext/sources/`).
JSON only, watched live, invalid files ignored. Same shape as
`registry/src/<provider>.json`.

## Author rules (not in types)

- `defaults` deep-fill objects; source values win, arrays replace (not merge).
- `baseUrl`: static absolute HTTP(S), no credentials. `/x` anchors at origin
  root, `x` is relative to base directory; keep trailing slash for
  directories. Resolves loader URLs, static/Radar/response `home`/`badge`,
  and item URLs — never inside `content.html` (use `absolute_url` there).
  Multi-origin sources keep secondary URLs absolute + declare capabilities.
- Static metadata must hold for every param value: generic fallback
  (`User Posts`, `Channel`), no concrete identity, no `|`/`｜` in
  `metadata.title`. LiveCard titles use ASCII ` | ` for identity/variant.
  Concrete identity resolves via Radar or loader metadata; omit static `home`
  when no param-independent URL exists.
- Category = provider's primary product experience (see `CATEGORY_IDS`).
- `color`/`icon` are provider identity (`sdk/src/models/source.ts:SourceProvider`):
  source-owned `icon`/`color` fail validation (`registry/validation.ts`); use
  `metadata.badge` for card identity, omit `icon` for favicon-service cases.
- `version` bump invalidates snapshots and result identity
  (`apps/extension/src/lib/source/source-snapshot.ts`); bump only on
  behavioral or result-shape change.
- `metadata.type`: set `ranking` for ranked results, `list` to force unordered;
  timeline is inferred when all `publishedAt` are newest-first, else list
  (`sdk/src/models/source.ts:SOURCE_PRESENTATION_TYPES`).
- Item order is preserved by default; opt into newest-first with
  `sortByTimestamp` (unpublished items stay last in original order).
  Empty results are rejected as load errors (`core/loader-result.ts`).
- Streams must follow an explicit user choice (follows, lists, topics) — no
  opaque recommendation timelines.
- Custom loader only when declarative loaders cannot express the source.
  Timelines with nested modules: parse both levels through one shared parser.
  One page = multiple sources → one Radar rule per source. Original +
  translation → param switch, selected variant as title, other in
  `content.text`.
- Verify with registry build + typecheck + tests; error codes live beside
  `registry/validation.ts` and `core/source-error.ts`.
- In JSON providers, write four backslashes for one regex backslash
  (source file + Liquid string parsing both consume one layer).
- Keep opaque numeric IDs as `text` params with string defaults (they can
  exceed safe-integer range); quote them as JSON strings in CLI runs.
- Radar JS param functions must be closure-free (serialized into the page);
  keep them cheap and side-effect-free, evaluated on every full resolve.
