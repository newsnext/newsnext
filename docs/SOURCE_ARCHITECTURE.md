# Source Architecture

Cross-package pipeline and security boundaries (per-loader behavior lives
beside the implementation — linked below).

## Boundaries

- `registry/`: original Provider definitions (`src/`) → validated import index
  (`sources.js`). Build emits no merged or serialized Source configurations.
- `packages/source-kit/`: expansion (`registry/*`), a host-supplied Source
  catalog (`runtime/catalog.ts`), execution (`core/`, `utils/request/`).
- Hosts supply original Provider definitions; the extension resolves Sources
  and binds local callback references to their execution backend.
  Local modules and bundled modules share the same Source contract; origin
  does not change LiveCard, parameter, permission, or snapshot semantics.
- Action/Typed-SDK/Widget/CLI contracts belong to their packages; this doc
  covers source flow only.

## Pipeline

1. Build: collect JSON/JavaScript Providers → validate original definitions
   and resolve them with the runtime engine → emit only imports (`registry/build.ts`).
   Duplicate Provider IDs fail the build. The local `registry` validate command
   runs the same checks without writing artifacts or fetching Source data.
   JSON and JavaScript use the same `resolveProvider` validation and resolution;
   module callbacks are allowed only in loader `load`, `request`, and `annotation` slots.
2. Catalog priority is standalone local Provider → plugin Provider → bundled
   Provider. A higher-priority Provider replaces the whole lower-priority
   Provider, preventing mixed identity/defaults; removal restores the next
   available Provider. Invalid definitions are ignored. Local JSON resolves
   declaratively; local modules publish serializable Provider definitions with
   references for `load`, `request`, and annotation callbacks. The extension
   resolves both formats through the same Provider/Source engine; the module
   host does not compile templates, construct standard loaders, or normalize
   results. Executable paths stay in the host.
   `ctx.fetch` and `ctx.updateSecrets` return to the originating browser,
   retaining its session, network capabilities, request queue, and secret
   storage. Node.js 24+ loads local ESM modules directly, resolving
   `@newsnext/source-kit` to the embedded library; no local Source compilation
   is needed. Function references are bound to a catalog revision. One local
   task holds the module session while the extension runs the pipeline and
   calls its functions; annotations receive normalized items in one batch.
   Final results stay in the extension; session completion returns only an acknowledgment.
   Cancellation releases the task and pending calls. Purely declarative
   module Sources execute directly in the extension. Runtime code
   never executes dynamically in the extension. Local directory changes
   replace the catalog live.
3. Resolution: `resolveProvider`
   (`core/resolver.ts`) → `baseUrl` joins (`core/base-url.ts`) → params
   validate/coerce (`core/params.ts`) → Radar matches page → patch applies
   (`core/radar.ts`). Radar `priority` breaks equal-specificity ties only;
   it never overrides a structurally more specific match.
4. Request: resolution compiles URL, query, and fetch options into a request
   program (`core/request-templates.ts`); capability inference and execution
   reuse it. Interpolation syntax (`core/interpolation.ts`) is separate from
   Source scope rules (`core/template-policy.ts`) and typed JSON bodies
   (`core/template-json.ts`). Execution supplies parameters → fetch through
   queue with retry/credentials
   (`utils/request/`) → capabilities + secrets + requestRules enforced
   (`core/capabilities.ts`).
5. Loaders: JSON (JMESPath select → fields → timestamp sort), HTML (CSS
   select → traversal → fields), RSS (feed parse → normalize), custom
   (`load(params, ctx)` with `ctx.fetch/secrets/signal/updateSecrets`).
   Details beside `core/loaders/*.ts`.
6. Output: `validateSourceLoaderOutput` converts collector `content.html` to
   `content.markdown`; stored items never contain HTML. Preview renders GFM
   with embedded HTML disabled (`ui/src/components/markdown.tsx`).
   URL resolution → cap 50, order
   preserved (`core/loader-result.ts`, `core/base-url.ts`). One-minute
   per-source/params protection interval reuses snapshots
   (`apps/extension/src/lib/source/query-policy.ts`); snapshots are
   Worker-local, schema-versioned, discarded after 30 days
   (`lib/source/source-snapshot.ts`). Both local and bundled loaders use this
   extension-owned output pipeline. Storage separates lightweight per-card
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
  (`core/template-policy.ts`). Registry capped (2MB, ≤1000 sources).
- Extension enforces permissions for both standard loaders and local callback
  requests through the bound browser context.
  Never log secret values.
