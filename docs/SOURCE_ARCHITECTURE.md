# Source Architecture

Cross-package pipeline and security boundaries (per-loader behavior lives
beside the implementation — linked below).

## Boundaries

- `registry/`: author input (`src/`) → build (`build.ts`, `provider.ts`) →
  generated `registry.json` + `sources.ts`. Registry is the only writer of
  generated artifacts.
- `packages/source-kit/`: expansion (`registry/*`), runtime resolution
  (`runtime/`), execution (`core/`, `utils/request/`).
- `apps/extension/src/lib/source/`: query policy, bundled sources, background
  execution. Daemon/CLI executes natively via the versioned protocol.
- Action/Typed-SDK/Widget/CLI contracts belong to their packages; this doc
  covers source flow only.

## Pipeline

1. Build: parse → validate (`registry/validation.ts`, `parser.ts`,
   `core/limits.ts`) → expand defaults → emit declarative sources to
   `registry.json`, executable ones to `sources.ts`. Duplicate source IDs
   (or duplicate executable provider IDs) fail the build (`registry/build.ts`).
2. Local sources merge over the registry (JSON only, watched, invalid ignored;
   bundled IDs win on conflict).
3. Resolution: `flattenProviderConfig`/`resolveProvider`
   (`core/resolver.ts`) → `baseUrl` joins (`core/base-url.ts`) → params
   validate/coerce (`core/params.ts`) → Radar matches page → patch applies
   (`core/radar.ts`). Radar `priority` breaks equal-specificity ties only;
   it never overrides a structurally more specific match.
4. Request: template slots compile once with cache keys
   (`core/template.ts`) → fetch through queue with retry/credentials
   (`utils/request/`) → capabilities + secrets + requestRules enforced
   (`core/capabilities.ts`).
5. Loaders: JSON (JMESPath select → fields → timestamp sort), HTML (CSS
   select → traversal → fields), RSS (feed parse → normalize), custom
   (`load(params, ctx)` with `ctx.fetch/secrets/signal/updateSecrets`).
   Details beside `core/loaders/*.ts`.
6. Output: `validateSourceLoaderOutput` → URL resolution → cap 50, order
   preserved (`core/loader-result.ts`, `core/base-url.ts`). One-minute
   per-source/params protection interval reuses snapshots
   (`apps/extension/src/lib/source/query-policy.ts`); snapshots are
   Worker-local, schema-versioned, discarded after 30 days
   (`lib/source/source-snapshot.ts`). Storage separates lightweight per-card
   snapshots from shared Source result snapshots: a LiveCard record owns its
   last Source presentation and result reference, while cards with the same
   Source identity reuse the items payload. `liveCard.readSnapshot` joins both
   parts; UI query caches subscribe to this boundary but are not the repository. A
   refresh starts only after the snapshot read settles, then replaces the
   subscribed snapshot on success.
7. Diagnostics: stream collection, waiting reasons, next/retry scheduling
   flow through the same result shape; extension surfaces observations.

## Security

- Network allowlist (`capabilities.network`), cookie scoping
  (`capabilities.cookies`), secrets (`cookie`/`localStorage` with origin +
  itemKey, optional cache) — see `core/capabilities.ts` and
  `sdk/src/models/source.ts:SourceSecretDefinition`.
- Request rules bounded (`limits.ts`: ≤10 rules/source, ≤20 domains,
  ≤5 headers). JMESPath length-capped (2000), `__proto__`/constructor
  rejected (`loaders/json.ts`). Template slots whitelisted
  (`core/template.ts`). Registry capped (2MB, ≤1000 sources).
- Extension enforces permissions at execution; CLI mirrors them natively.
  Never log secret values.
