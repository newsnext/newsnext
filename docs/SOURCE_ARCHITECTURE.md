# Source Architecture

This document describes how NewsNext source definitions move from provider
files to executable browser-extension sources. For configuration syntax and
authoring examples, see the [source authoring guide](SOURCE_GUIDELINE.md).

## System boundaries

Source support is split across three packages:

```text
packages/registry
  owns provider definitions and generated registry artifacts

packages/source
  owns source contracts, validation, resolution, and structured loaders

apps/extension
  owns browser integration, permissions, secrets, caching, and execution
```

`@newsnext/source` does not import concrete providers. It receives resolved
sources through an `ExternalSourcesLoader`, which keeps the source runtime
independent from the bundled registry and its wire format.

The main source package is organized by responsibility:

```text
packages/source/src/
├── core/       defaults, parameters, templates, loaders, and capabilities
├── registry/   provider expansion and registry parsing
├── runtime/    source lookup and request preparation
├── types/      shared contracts
└── utils/      source-facing fetch, crypto, and JWT helpers
```

## Build pipeline

Providers live under `packages/registry/src`. The registry build discovers
top-level TypeScript files, nested `index.ts` files, and top-level JSON files.
It then produces:

```text
packages/registry/registry.json
packages/registry/loaders.ts
```

`registry.json` is a flat object keyed by complete source IDs such as
`example:latest`. It contains serializable provider metadata, expanded source
configuration, structured loaders, and resolved capabilities.

`loaders.ts` contains the executable loader map for TypeScript providers. The
registry entry for such a source omits its loader function; at runtime the
generated map restores it by complete source ID.

The build follows this sequence:

```text
provider files
    │
    ├─ validate provider and source IDs
    ├─ apply provider defaults and merge source variables
    ├─ attach provider metadata
    ├─ flatten providers to complete source IDs
    ├─ materialize capabilities for executable sources
    ├─ remove executable loaders from serialized entries
    └─ validate the complete generated registry
            │
            ├─ registry.json
            └─ loaders.ts
```

Duplicate provider or source IDs fail the build. Generated files are rewritten
only when their content changes.

## Defaults and provider expansion

`flattenProviderConfig` and `resolveProvider` share the same provider expansion
path. Expansion:

1. validates the provider shape and IDs;
2. applies source values over provider defaults;
3. recursively fills missing object properties;
4. replaces inherited arrays with source arrays;
5. recursively merges `vars`, with source values taking precedence;
6. validates the inherited source `baseUrl`;
7. attaches provider-owned presentation metadata to every source;
8. validates the complete source and rejects source-owned `icon` or `color`.

Required source values, including cache policy and loader, come from defaults or
individual source configuration. Provider color is required; provider icon and
category are optional.

Provider identity remains separate from source metadata:

```ts
provider: {
  title: "Example",
  color: "blue",
  category: "social", // optional
}
```

Provider expansion treats `icon` as opaque presentation data and preserves
standard `data:image/...` URLs as well as remote image URLs. Embedded icons are
serialized directly into the generated registry and rendered as image sources;
they do not add network or browser capabilities.

When `icon` is absent, the extension presentation layer derives a favicon
service URL from the resolved source `metadata.home` and the user's icon source
preference. The URL template supports `{hostname}`, `{origin}`, and `{url}`;
the latter two substitutions are percent-encoded. An empty template disables
the fallback. The extension persists the selected preset and template as a
local user setting. This keeps third-party favicon service URLs out of provider
definitions and the generated registry while allowing instance-specific home
overrides to select the matching icon. The preference is part of the portable
Settings slice. Settings, Board items, and source instances are separate
versioned slices so they can be updated and synchronized without rewriting one
monolithic value. Each Board item owns its sort mode and manual source order,
so Board export, deletion, and synchronization cannot detach that state from
its owner. Extension pages read synchronous `localStorage`
snapshots first, then reconcile them with canonical copies in
`browser.storage.local`; background storage wins when both copies exist.
A versioned `newsnext-user-data` envelope validates and combines the portable
slices for import and export. Current board selection, CLI connectivity, browser
permissions, and caches are device-local and are not part of that envelope.
The Settings data reset restores every persisted slice to its default, deletes
the device-local source-secret and IndexedDB source-result caches, clears active
source queries, and revokes user-granted optional browser and host permissions.
Required development permissions remain controlled by the extension manifest
and cannot be removed at runtime.

This prevents a source, Radar rule, or card instance from changing the identity
and visual treatment shared by its provider.

Provider category is a static registry attribute. Provider expansion copies it
into every flattened source descriptor, and registry parsing validates it
against the shared `CategoryId` taxonomy. Runtime resolution does not infer a
category from source content, parameters, URLs, or loader behavior. An omitted
category remains absent. Source metadata, Radar patches, loader metadata, and
persisted card-instance patches cannot add or replace it. See the
[provider category taxonomy](SOURCE_GUIDELINE.md#provider-category-taxonomy) for
authoring and matching rules.

## Registry resolution

The extension bundles `registry.json` and the generated `resolveSources`
function. Background startup configures the source runtime with a loader that
resolves both artifacts:

```text
bundled registry.json
        +
generated executable loader map
        │
        ▼
resolveSourceRegistry
        │
        ▼
Record<sourceId, RuntimeSource>
```

The record key is the canonical source ID, such as `github:trending`.
`RuntimeSource` does not duplicate either the full ID or its provider-local
segment. Public descriptors receive an `id` only when the keyed runtime record
is converted for clients.

The extension page memoizes its descriptor-list request for the lifetime of the
page. Card loads therefore reuse the same descriptors instead of listing,
serializing, and sorting the complete registry for every request. A failed
descriptor request clears the memoized promise so a later request can retry.
The app's board route also primes the descriptor query with
`ensureQueryData` before rendering cards. Descriptor query options are shared
between the route and React consumers and run independently of network status.
The underlying descriptor-list request remains memoized for the page lifetime
because the bundled registry cannot change without an extension reload.

Static source presentation remains nested as
`RuntimeSource.metadata: SourcePresentationMetadata`. Runtime resolution
normalizes `metadata.home` and `metadata.badge` but does not flatten presentation
fields onto the operational source object. Public `SourceDescriptor` and
extension `BoardSource` preserve the same nested shape, so static metadata,
instance patches, and loader results share one merge boundary.

Registry parsing validates the entire wire format before resolving entries.
Declarative registry entries keep their JSON, HTML, or RSS loader. An entry
without a loader must have an exact match in the executable loader map and is
resolved as a custom loader.

Resolved sources are cached within the active runtime context. Concurrent
requests share the same in-flight registry promise. Reconfiguring the external
loader invalidates both the cached result and any previous generation.

The runtime never fetches a registry over HTTP or reads one from extension
storage. Registry changes therefore require rebuilding the bundled artifacts
and releasing or reloading the extension.

## Source request lifecycle

A normal source request crosses the following stages:

```text
source ID and raw parameters
        │
        ├─ resolve source
        ├─ normalize and validate parameters
        ├─ build versioned cache key
        ├─ return a fresh cached result when available
        ├─ resolve required secrets in the background
        ├─ execute the source loader
        ├─ validate the result, every NewsItem, and response metadata
        ├─ reject an empty or malformed item result
        ├─ cache items and dynamic source presentation metadata
        └─ infer the card presentation from item timestamps and order in the UI
```

In-flight loads are deduplicated by TanStack Query using a key containing the
source ID and normalized parameters. Source query keys and complete options are
created together so React observers, imperative Fetch Latest calls, and future
prefetch consumers share the same identity and lifecycle policy. Both
individual-card and board-wide user refreshes execute enabled TanStack queries
that fetch the latest source data; disabled and unmounted queries are not
fetched implicitly. Fetch Latest ignores normal source-cache freshness, but a
separate one-minute frequency guard prevents repeated remote loads. A protected
request still follows the normal user-triggered query path and completes
transparently from the most recent stored result. Expired cached data is
otherwise published as a temporary query result while a remote load is pending.
Automatic query revalidation uses the normal source cache policy. Fetch-latest
intent is passed directly to the query function rather than stored as state for
a later query execution. App query timing and the Fetch Latest protection
interval are centralized in
`apps/extension/src/lib/source-query-policy.ts`.

The app also reads the last persisted result as presentation-only placeholder
data when a card mounts. This survives an app close and reopen
and may use an expired entry while a fresh request is pending. The loader reads
each cache entry once and injects stale data into the active query before
continuing the request. Placeholder data does not satisfy the request, extend
the entry's freshness, or change fetch-latest behavior.

The persistent cache is an IndexedDB object store containing the result,
`cachedAt`, and `usedAt`. Successful reads update `usedAt`. At most once per
day after a write, cleanup removes entries unused for 30 days, superseded cache
versions for the same source and normalized parameters, and least-recently-used
entries beyond 500 records or an estimated 50 MiB. Cache failures remain
fail-open: they never prevent a source request from completing.

Card queries mount when their container enters the preload margin of the app's
root scroll container. The observer must use that scrolling element as its root;
using the browser viewport lets the overflow container clip cards before the
viewport root margin is applied and effectively disables preloading. After a
card leaves that margin, its query remains active for one minute to avoid churn
during short scrolls, then unmounts. Re-entering during that interval cancels
the pending unmount. Successful query data remains fresh in memory for one
minute; this avoids redundant loader and persistent-cache reads without changing
the source-defined persistent cache duration. Active card queries also revalidate
once every five minutes, including while the app is in the background.
Inactive query data follows TanStack Query's default garbage-collection policy
and can still be restored from the persistent cache. Source queries use
offline-first network mode so their query function can consult IndexedDB before
an unavailable network request is attempted. The source loader may still
satisfy an automatic revalidation from a fresh persisted result.

Each page-side query request receives a TanStack `AbortSignal`. Because signals
cannot be transported directly through the extension proxy, the page assigns a
request ID and sends a separate cancellation command to the background service.
The background service owns the corresponding `AbortController` and exposes its
signal through `SourceLoaderContext`. The same context contains a required
`fetch` client that permanently binds the signal to every normal, raw, native,
or derived request while retaining the shared session and hostname-queue
policy. It also checks each effective request URL against the active source's
declared network capabilities. Structured JSON, HTML, and RSS loaders use it directly;
custom loaders and structured-loader custom request callbacks receive the same
bound request capability. The request callback context also contains the resolved
URL and returns a `Response`, leaving body parsing and HTML decoding at the
structured-loader boundary. Cancellation therefore removes queued host requests
and aborts active fetches without relying on each provider to forward a signal.
TanStack Query remains the single in-flight deduplication layer, which also
prevents a replacement Fetch Latest request from reusing a cancelled loader
promise.

Loader metadata is response-scoped and remains part of the cached load result.
It uses the complete source presentation metadata shape: title, badge,
description, and home URL. While displayed, it has the highest field-level
priority over static metadata and persisted Radar or card-instance patches,
without persisting response-derived values into the saved source instance.
Before the first successful load, the card continues to use static or instance
metadata and ultimately the provider title. Radar title patches are optional,
including for parameterized sources; a successful loader result may provide the
effective title without changing discovery-time configuration.

The presentation layer resolves effective metadata without changing the source
execution configuration:

```text
RuntimeSource.metadata
    → persisted instance patch.metadata
    → SourceLoaderResult.metadata
```

Each step performs a field-level merge, with later values taking precedence.

Every presentation surface must use this same merge boundary. Cards apply
loader metadata directly from their active source query. Search subscribes to
the same normalized source query keys with disabled observers, so an existing
loader result can update searchable titles and result labels without starting
loads merely because the Search dialog opened. When an in-memory query has no
data, Search may hydrate it from the matching persistent source-cache entry.
That hydration preserves the entry's original `cachedAt` as the TanStack query
update time, so stale presentation data cannot become artificially fresh or
suppress normal card revalidation. Until a loader has published and cached its
first successful result, Search follows the normal static, instance, and
provider-title fallback behavior.

Loader metadata reuses responses already required to produce the items. Source
loaders must not issue profile, community, channel, batch, or other companion
requests only to enrich metadata. If the required item requests do not expose a
field, authoring falls back to static or page-derived Radar metadata instead.

The background and source runtime do not send a declared card type. They
preserve loader output order, including through caching and transport. JSON and
HTML loaders may first apply their shared optional `sortByTimestamp` step after
field normalization; it orders items newest first and keeps missing timestamps
last. The frontend renders a timeline only when the non-empty result has a
finite timestamp on every item and those timestamps are monotonically
non-increasing.
All other non-empty results render as a ranking. Empty results fail before
caching or presentation. A provider may deliberately sort inside a request,
JMESPath selection, structured loader configuration, or custom loader when
chronological order is the correct source behavior.

The extension executes registry access and source loaders through its background
service so loaders can use extension host permissions, cookie and local-storage
secrets, and request rules.

Host capabilities and browser API permissions intentionally follow separate
paths. Ordinary sources expose only `network` and `cookies` capabilities. The
extension maps the built-in `browser:history` and `browser:bookmarks` source IDs
to their fixed optional browser permissions; registry authors cannot extend
that mapping through source configuration. The `rss:feed` source has a separate
parameter-aware host-permission resolver: it converts the effective feed URL
into one exact hostname origin instead of requesting the wildcard declared for
runtime network validation. Permission state is recomputed when saved RSS
parameters change.

## Parameter and request pipeline

Parameters use one deterministic pipeline:

```text
raw value or default
    → trim strings
    → type coercion
    → schema validation
```

Parameter schemas intentionally avoid arbitrary regex validation and Liquid
normalization. Discovery-specific extraction and normalization belong in Radar
parameter patches, while the shared parameter pipeline enforces type,
selection, and range constraints.

After every parameter is resolved, structured loaders render their URL and,
for default requests, nested `fetchOptions`, whose runtime contract is Ky's
`Options` shape. A custom `request` and `fetchOptions` are mutually exclusive.
A relative request URL is then resolved against the source's optional `baseUrl`.
Network capabilities are inferred and checked against this final absolute URL,
immediately before the request is sent.

Custom loaders receive already-normalized parameters. The source runtime cannot
infer their requests, so custom loader capabilities must be declared.

After any structured, RSS, or custom loader returns, the resolver applies the
same optional `baseUrl` to explicit URL-bearing result fields. This boundary
normalization covers item navigation URLs, image and iframe values, and dynamic
home and badge metadata without interpreting arbitrary text or rewriting HTML
strings. Static source home and badge metadata are normalized during
registration. Radar home and badge patches use the same base during discovery.

The resolved-loader boundary validates the `SourceLoaderResult` before applying
`baseUrl` URL normalization. Structured and custom loaders share this single
object-shaped result contract; bare item arrays are not accepted. Every
execution path, including the extension-backed CLI, rejects empty item arrays,
malformed required item fields, non-finite timestamps, and unsupported or
invalid response metadata before the result reaches a client or cache. Invalid
optional `inline` and `preview` values are removed at this boundary rather than
rejecting the result, keeping card rendering dependent on the required item
fields instead of optional presentation content.

## Structured loader pipelines

JSON loaders:

```text
request
    → parse JSON response
    → select items with JMESPath
    → select each field with JMESPath
    → render field Liquid templates
    → normalize and validate NewsItem values
    → optionally sort normalized timestamps newest first
```

JSON and HTML helper contracts use `*LoaderOptions` for loader configuration
and the shared `LoaderContext` for per-invocation state. `SourceLoader` and
`SourceLoaderContext` remain the runtime contract for loading a complete source.

HTML loaders:

```text
request
    → decode and parse document
    → select item roots
    → traverse and select every field
    → extract text, attribute, or HTML
    → render field Liquid templates
    → select and render document metadata
    → normalize and validate NewsItem values
    → optionally sort normalized timestamps newest first
```

All item or metadata fields in a group are extracted before that group's
templates render. Each template sees its complete pre-template group, which
makes output independent of declaration order and prevents template cycles.

RSS loaders request the response as text explicitly because fetch clients may
otherwise represent `application/rss+xml` responses as blobs. They parse the
RSS channel title, description, home link, and image URL, or the Atom feed
title, subtitle, and non-self home link, into dynamic loader metadata. They then
map entries directly to title, URL, and an optional timestamp. Entries without
a title or URL are discarded, and an unparseable date is treated as an omitted
timestamp. RSS metadata uses the same normalization, URL resolution, caching,
and presentation override pipeline as JSON, HTML, and custom loader metadata.

## Template compilation

Each template slot defines its allowed `source` and `scope` paths. Registration
parses templates and rejects unknown paths, filters, prohibited tags, and raw
output before a loader runs.

Compilation has two cache layers:

- a program cache shared by identical slot, output mode, and template text;
- a binding cache that also preserves the source configuration location.

The shared program avoids repeated parsing. The binding location produces
actionable validation and runtime errors such as the exact loader field or
Radar patch that failed.

Plain-text and HTML output use separate renderers. In HTML fields, literal
template markup remains markup while inserted values are escaped.

## Radar pipeline

Radar runs against source descriptors rather than executable loaders:

```text
active tab URL
    → host and included/excluded path or full-URL regex matching
    → render parameter patches
    → normalize and validate parameters
    → batch page-field extraction
    → render metadata patches
    → apply source presentation metadata to the discovered instance
    → order suggestions by confidence
    → persist the accepted suggestion with the selected board membership
```

Page-field queries required by matching rules are deduplicated and executed in
one active-tab script. When the built-in `rss:feed` source is available, Radar
also scans the active HTTP(S) document for RSS and Atom alternate links or a
directly opened feed. Direct feed detection recognizes both RSS or Atom
document roots and the browser's built-in unstyled XML document view. The
bounded scan deduplicates absolute URLs and adds one built-in suggestion per
feed, up to 20 per page. Each suggestion keeps the page URL as its home, uses
the page hostname favicon as its initial instance badge, and prefers the
discovered feed title over the source's static title. After loading, dynamic
RSS metadata may replace that badge. RSS suggestions use lower built-in
confidence than generated origin-only and default explicit rules, so a
dedicated source normally remains the primary suggestion.
Field and feed extraction are isolated from template rendering; page scripts
are not executed and the document object is never exposed to Liquid.
Radar renders in the extension action popup, which keeps discovery available
for both regular HTML pages and browser-rendered XML documents.

Rules and compiled matchers are cached. Optional Radar failures are reported as
diagnostics and fail closed instead of interrupting the surrounding UI.
Radar metadata can replace source-owned presentation fields such as title,
badge, description, and home URL, but cannot modify source identity,
provider title, icon, color, category, loader behavior, capabilities, secrets,
request rules, or cache policy.
Accepting a Radar suggestion creates one card instance with the selected board
membership. The instance owns its board ID alongside its source ID and patch.
Moving a card updates only that board ID; source parameters, presentation
metadata, and cache identity remain unchanged. The board ID is nullable:
`null` means the card has no custom board, while a custom board ID adds it to
that board. All deliberately skips membership filtering and aggregates every
card instance. Its persisted ID is `all`, producing the `/board/all` route.
The card editor writes the same instance patch shape and exposes every declared
source parameter plus each editable source-owned presentation metadata field.
The inferred card presentation is read-only. Provider
title, icon, color, and category remain read-only. Editing preserves patches as
sparse overrides: only explicitly changed parameter and metadata fields are
persisted. Parameter defaults are resolved for display and loading, while
inherited source metadata is resolved for display, without copying either into
the instance patch.

## Capabilities, secrets, and request rules

Capabilities describe effects a source may perform:

- `network` controls permitted HTTP and HTTPS hostnames;
- `cookies` identifies origins used by cookie-backed secrets;
- `browser` controls browser features such as history or bookmarks.

Structured loaders infer a static URL hostname and merge it with explicit
capabilities. Dynamic URLs are checked after template rendering. Custom loaders
must declare all effects because their behavior cannot be inspected.

The shared HTTP client uses `credentials: "include"` because source execution
represents the user's logged-in browser session. A loader may explicitly use
`credentials: "omit"` for an anonymous request. The network capability still
controls which origins the source may contact; the cookies capability is
reserved for cookie-backed secrets that read specific values.

The shared `sessionFetch` client queues requests by normalized hostname. Each
hostname runs one request at a time and observes the centralized minimum start
interval, while different hostnames remain independent. A private Ky client
provides method shortcuts, request serialization, body parsing, timeout
handling, and retries for transient GET failures. Runtime entry points derive a
Ky instance for each `SourceLoaderContext`, force the execution signal through
an init hook, and validate Ky's final normalized request URL in a
`beforeRequest` hook. Custom loaders use `context.fetch` rather than importing
the shared client or calling global `fetch`; direct calls would detach the
request from its execution lifecycle and are not an accepted source-loader
request path.

The retry policy excludes mutation methods and deterministic client errors. It
retries rate limits and selected server failures with exponential backoff and
full jitter. `Retry-After` is honored for `429` and `503`, but both server
directed waits and client backoff are capped by the shared request timeout so a
single source cannot stall indefinitely.

Each hostname owns a long-lived `p-queue` instance with concurrency `1` and a
strict sliding-window rate limit. Keeping the queue for the source runtime's
lifetime preserves the interval across idle periods; discarding an idle queue
would let the next request bypass the protection window.

The extension resolves cookie and local-storage secrets immediately before a
background loader runs. A loader receives only the values defined by its source.
`updateSecrets` persists refreshed values through the same source/provider
namespace.

Request rules are installed as Manifest V3 session rules. The extension assigns
rule IDs, scopes rules to extension-initiated traffic, and requires all request
domains to be covered by the source's network capabilities.

## Validation and security

Validation occurs twice:

1. provider expansion validates authoring configuration during the registry
   build;
2. registry parsing validates the generated wire format before runtime
   resolution.

The runtime registry accepts only declarative structured loaders. Executable
functions must come from the bundled loader map, so registry data cannot inject
code.

Other boundaries include:

- registry size and source-count limits;
- source ID validation and prototype-segment rejection;
- JMESPath length, syntax, and prototype-property checks;
- bounded template parsing, rendering, memory, and caches;
- bounded regex patterns and inputs;
- bounded HTML item selection and Radar page extraction;
- HTML escaping for untrusted template values;
- capability checks against resolved request URLs;
- narrow request-rule counts, domains, and header modifications.

Neither Liquid nor JMESPath evaluates JavaScript source text. Liquid file access,
raw output, and dynamic include/render features are disabled.

## CLI execution

`newsnext source run` sends a request through a loopback WebSocket to a connected
extension. The extension executes the same provider expansion, parameter
normalization, registry validation, capabilities, secrets, and background loader
path as normal source loading.

Local provider runs use an isolated `cli:<provider-id>` secret namespace unless
`--use-provider-secrets` is supplied. CLI execution does not install the
provider, change the bundled registry, populate the normal source cache, or
grant additional browser permissions. It does use the same loader-result
validation as registered extension app loads.

This is why direct HTTP requests are useful for investigation but are not a
substitute for extension-backed source verification.
