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

```js
/** @type {import("@newsnext/source-kit/registry").ProviderConfig} */
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
}
```

- JSON for declarative loaders, JavaScript for custom loaders/helpers.
  Filename (or parent dir of nested `index.js`) becomes the provider ID;
  one provider uses one format. Never edit the generated `registry/sources.js` import index.
  Validate locally with `bun --filter=@newsnext/registry run validate`;
  build refreshes the index with `bun --filter=@newsnext/registry run build`.
- Source IDs are `<provider>:<source>`.

## Local sources

Create providers in the daemon `sources` dir
(dev: `~/.config/newsnext.dev/sources/`, prod: `~/.config/newsnext/sources/`).
Use `<provider>.json` for declarative loaders, or `<provider>.js`,
`<provider>.mjs`, `<provider>/index.js` / `index.mjs` for JavaScript with helpers.
Both use the same ProviderConfig as bundled Sources. Changes reload live;
invalid files are ignored. Local Providers override plugin and bundled
Providers as a whole. See [Source Architecture](SOURCE_ARCHITECTURE.md).

## Author rules (not in types)

- `defaults` deep-fill objects; source values win, arrays replace (not merge).
- `baseUrl`: static absolute HTTP(S), no credentials. `/x` anchors at origin
  root, `x` is relative to base directory; keep trailing slash for
  directories. Resolves loader URLs, static/Radar/response `home`/`badge`,
  and item URLs. HTML body links resolve during conversion to stored
  `content.markdown`.
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
- Keep templates for interpolation and `??`/`||` fallback and `url_path`/`url_query` encoding; tags are rejected. Use `loader.query`
  for query parameters and field `transform` for value conversion; use JMESPath
  for JSON fallbacks and array operations, and JavaScript for conditional logic.
  Transform regex patterns have only JSON escaping; avoid regex string parsing
  inside templates.
- Keep opaque numeric IDs as `text` params with string defaults (they can
  exceed safe-integer range); quote them as JSON strings in CLI runs.
- Radar page parameters use portable URL-query, date-range, and selected-control rules,
  evaluated by the same browser reader for bundled and local Sources.
