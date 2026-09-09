# Source Architecture

This document describes how NewsNext source definitions move from provider
files to executable browser-extension sources. For configuration syntax and
authoring examples, see the [source authoring guide](SOURCE_GUIDELINE.md).

## System boundaries

Source support is split across these packages:

```text
registry
  owns provider definitions and generated registry artifacts

packages/sdk
  owns all Action contracts and shared public Source, Board, and Instance models

packages/shared
  owns foundational theme colors and news item types without SDK or CLI dependencies

packages/source-kit
  owns source validation, resolution, loader contracts, and structured loaders

apps/extension
  owns browser integration, permissions, secrets, caching, and execution
```

`@newsnext/source-kit` does not import concrete providers. It receives resolved
sources through an `ExternalSourcesLoader`, which keeps the source runtime
independent from the bundled registry and its wire format.

The main source package is organized by responsibility:

```text
packages/source-kit/src/
├── core/       defaults, parameters, templates, loaders, and capabilities
├── registry/   provider expansion and registry parsing
├── runtime/    source lookup and request preparation
├── types/      loader contracts and re-exports of SDK public models
└── utils/      source-facing fetch, crypto, and JWT helpers
```

## Action contracts

`packages/sdk/src/action` is the single source of truth for every Action's name,
parameter schema, result schema, and validation. Each contract declares its name
once; application and background contract lists are combined into a catalog keyed
by those names. Catalog construction rejects duplicate names across both lists.
Application and background handlers in the extension bind implementations to these
contracts with the extension-local `defineAction`; diagnostic redaction lives with
these handlers, and they do not declare another schema. Public model
shapes are exported from `packages/sdk/src/models`. The theme palette, color type,
news item types, and `MaybeArray` originate in `packages/shared/src`. The SDK
imports and re-exports these foundations through its workspace dependency on
`@newsnext/shared`. Shared never imports the SDK. Source-kit consumes these
definitions while keeping loader execution and browser behavior local.

The browser-safe `@newsnext/sdk/actions` and `@newsnext/sdk/models` entry points
never import the Node CLI transport. The SDK derives nested methods, inputs, and
results directly from the contracts. Node clients can call
`client.actions.board.create({ name: "Reading" })` without requesting a catalog.
All Actions are exposed through both CLI and UI clients. Invocation origin is
recorded for diagnostics and does not restrict Action availability.
`actions.list()` is runtime diagnostic information, not the type source.

The SDK is a compiled workspace dependency. Extension preparation and root test
and typecheck commands build it first, including on a clean checkout. Rebuild
`@newsnext/sdk` after editing its contracts when running an existing dev server.

## Build pipeline

Providers live under `registry/src`. The registry build discovers
top-level TypeScript files, nested `index.ts` files, and top-level JSON files.
It then produces:

```text
registry/registry.json
registry/sources.ts
```

`registry.json` is a flat object keyed by complete source IDs such as
`example:latest`. It contains serializable Sources from JSON providers and
TypeScript providers: provider metadata, expanded source configuration,
structured loaders, and resolved capabilities.

`sources.ts` contains only the complete resolved Runtime Sources from
TypeScript providers that require executable behavior, including custom
loaders, request callbacks, or JavaScript Radar values. A declarative Source in
a TypeScript provider is emitted to `registry.json` instead after provider
defaults and metadata have been fully expanded. The generated TypeScript
provider configs contain only executable Sources, so runtime startup does not
repeat build-time classification or filter against the JSON registry.

The build follows this sequence:

```text
provider files
    │
    ├─ JSON providers
    │      ├─ expand and validate serializable configuration
    │      └─ registry.json
    │
    └─ TypeScript providers
           ├─ expand each complete Source
           ├─ JSON-safe Sources ── registry.json
           └─ Sources with executable values ── sources.ts

registry.json + executable Runtime Sources
    └─ reject duplicate complete Source IDs
```

Duplicate provider files or source IDs fail the build. An authored provider ID
cannot appear in both JSON and TypeScript files, even when its local Source IDs
differ. A TypeScript provider may produce both generated formats because the
build partitions its expanded Sources by JSON serializability. Generated files
are rewritten only when their content changes.

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

The expanded Source keeps provider identity separate from source metadata.
Icons remain opaque data; embedded images add no network capability. When no
icon is supplied, extension presentation derives a favicon from effective home
metadata and the portable Settings preference. Provider palette, categories,
defaults, and authoring constraints are defined in the
[authoring guide](SOURCE_GUIDELINE.md#provider-and-source-configuration).

Workspace persistence, import/export, and Board membership belong to
[Application Architecture](APPLICATION_ARCHITECTURE.md), not provider expansion.

Provider category is a static registry attribute. Provider expansion copies it
into every flattened source descriptor, and registry parsing validates it
against the shared `CategoryId` taxonomy. Runtime resolution does not infer a
category from source content, parameters, URLs, or loader behavior. An omitted
category remains absent. Source metadata, Radar patches, loader metadata, and
persisted Instance patches cannot add or replace it. See the
[provider category taxonomy](SOURCE_GUIDELINE.md#provider-category-taxonomy) for
authoring and matching rules.

## Registry resolution

The extension bundles `registry.json` as the default registry and bundles the
generated `resolveSources` function. Users may add multiple HTTP(S) registry
URLs in the dedicated Registry settings tab; the list is empty by default. The
background downloads each configured declarative registry, validates it, and
caches the last valid result for that URL in extension-local storage before
resolving it with the bundled function:

```text
configured registry URLs ── per-URL validation ── per-URL cache fallback
             │
             ▼
bundled registry.json ── merge in configured order
             │             later duplicate IDs override earlier JSON entries
             ▼
resolveSourceRegistry ── JSON Runtime Sources

generated complete TypeScript Runtime Sources
        │
        └──────────────────────────┐
                                   ▼
                          reject duplicate IDs
                                   │
                                   ▼
Record<sourceId, RuntimeSource>
```

The record key is the canonical source ID, such as `github:trending`.
`RuntimeSource` does not duplicate either the full ID or its provider-local
segment. Public descriptors receive an `id` only when the keyed runtime record
is converted for clients.

The extension page caches descriptor-list requests through its query client for
consumers that need Source discovery or configuration, such as Search,
Settings, and Drafts. Completing a registry merge invalidates that query so the
Registry settings tab and other consumers receive the updated Source list.
Board routes and persisted Instance queries neither list nor wait for
descriptors; they render from Loader result snapshots.

Static source presentation remains nested as
`RuntimeSource.metadata: SourcePresentationMetadata`. Runtime resolution
normalizes `metadata.home` and `metadata.badge` but does not flatten presentation
fields onto the operational source object. Public `SourceDescriptor` and
extension `BoardSource` preserve the same nested shape, so static metadata,
instance patches, and loader results share one merge boundary.

Registry parsing validates the entire JSON wire format before resolving entries.
Every registry entry owns its structured JSON, HTML, or RSS loader; missing or
custom executable loaders are rejected. Executable TypeScript Sources bypass
the JSON registry parser because provider expansion already resolves their
complete trusted runtime definition. Their JavaScript Radar parameter values
remain available to the background Radar service.
Public descriptors strip those functions before extension messaging; the Radar
popup asks the background service to execute matching functions in the active
tab and receives only serializable suggestions.

Resolved sources are cached within the active runtime context. Concurrent
requests share the same in-flight registry promise. Reconfiguring the external
loader invalidates both the cached result and any previous generation.

The background checks configured registries at first use, whenever the URL list
changes, when the user requests a refresh, and every hour. A valid download
replaces that URL's extension-local cache and reconfigures the external loader
so subsequent requests use the merged result without an extension release.
Source request rules are synchronized again after an update. A failed or
invalid download falls back to the last valid cache for that URL; URLs without
a valid download or cache are omitted while the bundled registry remains
available. Remote data passes the same per-registry and merged-registry limits
and parser as bundled data before it can be cached or used. Adding a URL
requests host access for its origin. Registry downloads time out after 15
seconds so health checks always reach a terminal state.

`general.registryUrls` is portable Settings synchronized in the daemon's opaque
Workspace snapshot. Downloaded documents, health state, and host permissions
remain local to each browser; Workspace synchronization does not grant access.

The background publishes per-URL health, last-success time, errors, and Source
IDs to extension-local state after each check. The Registry settings tab uses
that state for status feedback and Source provenance, and lets users reorder
URLs to change merge precedence. Its Source browser searches the complete
resolved list and filters it by bundled or configured Registry origin.

Only declarative structured loaders come from the downloaded JSON. Executable
TypeScript Sources and JavaScript Radar parameter functions remain trusted
bundled code and can change only with an extension release. The resolver still
rejects IDs duplicated between those bundled Sources and the merged JSON
registry.

## Source request lifecycle

A normal source request crosses the following stages:

```text
source ID and raw parameters
        │
        ├─ resolve source
        ├─ normalize and validate parameters
        ├─ build a Worker-local result identity from source ID, version, and normalized parameters
        ├─ read the persisted Source result when available
        ├─ skip a user-triggered request during the one-minute protection interval
        ├─ resolve required secrets in the background
        ├─ execute the source loader
        ├─ validate the loader output, every NewsItem, and response metadata
        ├─ reject an empty or malformed item result
        ├─ keep the first 50 items and normalize their explicit URLs
        ├─ render the compiled inline template to index-aligned plain text
        ├─ persist the successful Source result and fetch time
        ├─ publish the result into the page's in-memory QueryClient
        └─ infer the LiveCard presentation from effective item times and order in the UI
```

The background protected loader enforces a one-minute minimum execution interval
for each Source ID, Source version, and normalized parameter set within one
Worker. This protects
third-party APIs from accidental bursts that can trigger rate limits or account
suspension. It also deduplicates in-flight loads across UI and connected CLI
consumers. The background does not own a Query cache. Page-side TanStack Query
owns component subscriptions, loading and error state, page-local freshness,
and in-memory result reuse. A persisted Instance query is keyed only by
`["instance", instanceId]`; a Draft without an Instance uses Source ID, Source
version, and normalized parameters. Query options are created with those keys
so React observers, imperative manual requests, and future prefetch consumers
share the correct identity. Both
individual LiveCard and board-wide manual requests execute enabled TanStack queries
through `refetchQueries` with `type: "active"`; individual requests add a query-hash
predicate, while board-wide requests match every active Source query. TanStack
Query owns request cancellation and concurrent refetching, and disabled or
unmounted queries are not fetched implicitly. Automatic revalidation follows
TanStack freshness. Manual Request is a page-side user intent that tracks
distinct UI feedback around that refetch. Both paths send the
same load action without a manual-request flag, so the background cannot
distinguish them and applies the same protection behavior. A protected request
returns the persisted result with `fetchProtected: true` and a new caller-visible
`loadedAt` without executing the Source or changing its internal `fetchedAt`.
Manual Request keeps UI feedback visible for a minimum 500ms. App query timing
and the Source request protection interval are centralized in
`apps/extension/src/lib/source/query-policy.ts`.

The bound browser Loader writes every successful execution once to its
Worker-local Dexie-backed Source result cache, keyed by Source ID, Source version,
and normalized parameters. No record is shared across Workers, even when that
complete key matches. The same record supplies both API protection and startup
placeholder data. Instance IDs are deliberately absent from this Loader cache
because they do not affect Source execution. Page-side TanStack queries for saved
Instances use only the Instance ID, while configuration changes explicitly
invalidate that stable query.

Each cache record contains only its schema version, derived key, validated
result, and real `fetchedAt` completion time; it does not duplicate the
normalized target. The schema version invalidates results whose runtime result
contract predates the active extension. When
a Board route renders, the App asks the opaque
Instance router for each referenced Instance's cached result. The router reads
directly in the current browser when it is the binding and otherwise relays to
the bound browser through the daemon. Successful responses seed Instance-scoped
TanStack queries before Board content renders without copying another durable
cache. Misses and failures do not discard successful responses. This hydration
never executes a Source.
Persisted results are discarded after 30 days. Increasing the Source version
changes result identity immediately, while old versions age out independently.
Persistence failures remain fail-open and never prevent Source execution.

UI loads take an Instance ID and use a local fast path or `loader.loadInstance`
through the daemon. Routing alone does not retain History. A disconnected owner
suspends cache reads and execution but does not remove the Instance or make its
configuration read-only.

The daemon retains results from automatic Instance collection and Jobs in Turso.
Automatic collection can retain a protected cached result at its original
`fetchedAt` to fill a foreground-history gap; dataset/timestamp uniqueness
prevents duplicates. Unchanged fresh fetches are separate observations. Explicit
Jobs retain fresh, unprotected responses. No retention path receives credentials
or raw fetch response bodies.

A dataset is the unique tuple of execution Worker ID, Source ID, Source version,
and canonical normalized parameter JSON. Worker ID is explicit because the
daemon combines observations from browser Loaders with different credentials,
permissions, and network environments. Each new dataset receives an opaque 16-character alphanumeric Nano ID
exposed by `client.history.datasets()` in `@newsnext/sdk` and used by the other
SDK history methods. The SDK invokes the CLI through a versioned JSONL transport;
it does not open the database or import the private Rust implementation.
`history.export()` uses one CLI process, reconstructs complete observations through
the daemon, and pins an upper timestamp for ascending traversal. This is not a
transactional snapshot: backfilled observations can still affect an earlier interval.

Worker ID is the isolation boundary for all Source results, not only
account-scoped Sources. Each Worker owns its browser credentials, Loader cache,
and execution environment. History includes Worker ID in its dataset identity,
so neither cached results nor retained observations are shared when two Workers
produce the same Source ID, version, and normalized parameters. Personalized
Sources therefore do not add the current signed-in account ID as a Source
parameter. Account or user parameters remain part of the normalized target only
when they select a feed or resource independently within the same Worker.

The schema normalizes retained values into `history_datasets`,
`history_observations`, provider-scoped `history_items`, content-addressed
`history_revisions`, and ordered `history_observation_items`. A domain-separated SHA-256 revision key is
derived from provider ID, exact URL, and canonical item JSON, so Sources and
parameter sets under the same provider reuse unchanged item values. Observation
position remains dataset-specific and one-based. Observation kinds use the
same presentation semantics as the extension: an effective declared `ranking`
or `list` wins, otherwise descending publication timestamps infer
`timeline` and remaining results become `list`. Only `publishedAt`
is used; RSS parsing resolves missing publication times before this stage. Loader metadata overrides static Source metadata. History
reports position movement only when both compared observations are rankings.

The daemon owns one Turso engine and one mutex-protected write connection.
Schema initialization runs before IPC begins accepting clients. Retention uses an immediate
transaction that creates or reuses the dataset and revisions, inserts the
observation and ordered item links, and updates dataset counters atomically.
Read operations open independent bounded-wait connections and use keyset
pagination. A dropped or failed transaction rolls back instead of exposing a
partial observation.

The daemon initializes new databases at schema 10 and opens existing schema 10
databases directly. Other schema versions are rejected without migration.

History exposes four daemon operations: dataset discovery, cursor-paginated
observation summaries, one hydrated observation, and deterministic comparison
between two observations. Public records contain the opaque dataset ID,
provider-scoped item identity, one-based position, observed `NewsItem`, Source
version, and presentation metadata. Internal revision IDs never cross the
boundary. Retained observations are durable; automatic age or size eviction is
not part of this increment and must be introduced later as an explicit task
retention policy.

Observation comparison reports only directly supported facts: items added to
the returned observation, items missing from it, position changes, and changed
top-level `NewsItem` fields. In particular, `missing` is not labeled as removed
or dropped because a returned list may cover only part of a source. Responses
preserve a completeness envelope for future partial-retention policies.
Product-specific interpretations are derived by the consumer and are not part
of persistence code.

History commands read the daemon database without a connected browser. Fresh
execution requires the owning Worker. Application Actions and Workspace storage
are documented in [Application Architecture](APPLICATION_ARCHITECTURE.md);
command syntax is in the [CLI reference](../skills/newsnext-sdk/references/commands.md).

LiveCard queries mount when their container enters the preload margin of the app's
root scroll container. The observer must use that scrolling element as its root;
using the browser viewport lets the overflow container clip LiveCards before the
viewport root margin is applied and effectively disables preloading. After a
LiveCard leaves that margin, its query remains active for one minute to avoid churn
during short scrolls, then unmounts. Re-entering during that interval cancels
the pending unmount. Successful query data remains fresh in memory for two
minutes; this avoids redundant background loads and persisted-result reads during that
window. Regaining focus or remounting can revalidate
stale queries. Active LiveCard queries also revalidate once every five minutes,
but interval revalidation is skipped while the app is in the background.
Inactive query data follows TanStack Query's default garbage-collection policy;
the durable Source result remains independently available in IndexedDB. Each
saved Instance owns one page query, while Instances bound to the same Worker may
still share the Loader's Source-request cache. Source queries use offline-first
network mode. Before rendering Board content, the App restores valid persisted
Source results for that Board into its QueryClient. This lets Instances render
cached Source snapshots without loading the registry. Disabled Search observers reuse data already present in the page
cache but do not cause other Boards' persisted results to be restored or execute
a Source.
Stale restored queries follow the same focus, remount, and interval revalidation
policy as queries produced in the current session. The Board projection does
not subscribe to ongoing Query Cache events; active LiveCards own their query
updates locally. When a query-key change temporarily displays placeholder data,
the LiveCard preserves that response's caller-visible `loadedAt` instead of replacing it
with the component mount time.

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
TanStack Query deduplicates page observers for one query. The background
protected loader separately deduplicates actual Source execution across page and
connected CLI consumers, so concurrent callers cannot burst a third-party API.

The three identities stay separate: Instance ID routes page queries; Worker plus
resolved Source target isolates Loader cache and History datasets. NextLayer
reads daemon-owned Widget Snapshots; its lifecycle is documented under
[Layers and Widgets](APPLICATION_ARCHITECTURE.md#layers-and-widgets).

Loader metadata is response-scoped and remains part of the load result stored in
TanStack Query and persisted for later restoration.
It uses the complete source presentation metadata shape: title, badge,
description, and home URL. While displayed, it has the highest field-level
priority over static metadata and persisted Radar or Instance patches, without
persisting response-derived values into the saved Instance. Before the first
successful load, the LiveCard continues to use static or Instance
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

Every presentation surface must use this same merge boundary. LiveCards apply
loader metadata directly from their active source query. The Search result list
subscribes to each result's Instance query key with disabled observers, so
existing in-memory loader results can update searchable dynamic titles and
result labels. Its selected-result preview mounts the real LiveCard with a normal
active observer, starting or reusing that Instance query as selection changes.
Because the dialog portal is outside the Board scroll container, this preview
explicitly mounts LiveCard content eagerly instead of applying the Board's
intersection-based offscreen deferral.
Board-scoped restoration maps `fetchedAt` to TanStack's internal `dataUpdatedAt`,
so stale presentation data cannot become artificially fresh or suppress normal
LiveCard revalidation. For other Boards whose results are not in the page cache,
unselected Search results follow the normal static, Instance, and provider-title
fallback behavior.

Presentation order and metadata precedence follow the
[authoring contract](SOURCE_GUIDELINE.md#provider-and-source-configuration).
The runtime preserves validated ordering and effective `type` through persistence
and transport; the frontend infers timelines when no explicit type applies.

The extension executes registry access and source loaders through its background
service so loaders can use extension host permissions, cookie and local-storage
secrets, and request rules.

The extension-page Content Security Policy intentionally leaves `connect-src`
unspecified because Source destinations are dynamic. Browser host permissions
and the runtime network capability check are the two request gates. Adding a
static `connect-src` allowlist would reject otherwise authorized Sources before
either permission boundary can evaluate the request.

Sources expose only `network` and `cookies` capabilities. The `rss:feed` source
has a parameter-aware host-permission resolver that converts its effective
`url` parameter into one exact hostname origin instead of requesting the
wildcard declared for runtime network validation. Permission state is
recomputed when the saved parameter changes.

## Parameter and request pipeline

Parameters use one deterministic pipeline:

```text
raw value or default
    → trim strings
    → type coercion
    → schema validation
```

Parameter schemas use serializable validation rules rather than JavaScript
callbacks so the same contract can cross into the UI. The shared pipeline
enforces type, selection, range, built-in format, and bounded regex constraints.
Radar extracts candidate values but does not duplicate their reusable semantic
validation.

After every parameter is resolved, structured loaders render their URL and,
for default requests, nested `fetchOptions`, whose runtime contract is Ky's
`Options` shape. A custom `request` and `fetchOptions` are mutually exclusive.
A relative request URL is then resolved against the source's optional `baseUrl`.
Network capabilities are inferred and checked against this final absolute URL,
immediately before the request is sent.

Custom loaders receive already-normalized parameters. The source runtime cannot
infer their requests, so custom loader capabilities must be declared.

Custom provider parsers map the response shape of the current endpoint before
creating `NewsItem` values. X timeline responses expose user handles and avatars
through `core` and `avatar`, and the current `UserTweets` operation returns
entries through `timeline.timeline`. X translations are selected by the
persisted GraphQL operation as well as feature flags, so its operation hash,
variables, feature set, response path, and parser must be updated together.

After any structured, RSS, or custom loader returns, the resolver applies the
same optional `baseUrl` to explicit URL-bearing result fields. This boundary
normalization covers the single item navigation field `url`, `author.home`, semantic `icon` and
`mark` pictures, content pictures and iframes, and dynamic home and badge
metadata without interpreting arbitrary text or rewriting HTML strings. Static
source home and badge metadata are normalized during
registration. Radar home and badge patches use the same base during discovery.

The resolved-loader boundary validates the `SourceLoaderOutput` before applying
`baseUrl` URL normalization and rendering the optional static inline template into
a `SourceLoaderResult`. Structured and custom loaders share the same
object-shaped output contract; bare item arrays are not accepted. Every
execution path, including the extension-backed CLI, rejects empty item arrays,
malformed or unsupported semantic item fields, non-finite times and stats,
and unsupported or invalid response metadata before
keeping the first 50 items. Only that bounded result reaches URL normalization
and inline presentation rendering, followed by clients, persistence, the Query
cache, or History.

After validation, the runtime bounds and normalizes items, then renders the
precompiled `inlineTemplate` to index-aligned plain text. Empty or failed per-item
renders select the UI fallback. Executable templates never reach the UI, and
rendered inline text is not stored as an item fact in History.

Liquid engines initialize lazily so background exports in shared barrels do not
retain template/date dependencies in UI entry chunks. The shared result boundary
removes nullish nested values and empty semantic groups while preserving zero
and false. Source versions partition caches and datasets after schema changes.
For item fields and template syntax, see
[loader results](SOURCE_GUIDELINE.md#rss-custom-loaders-and-loader-results).

## Structured loader pipelines

JSON loaders:

```text
request
    → parse JSON response
    → select items with JMESPath
    → select each field with JMESPath
    → render field Liquid templates
    → normalize and validate NewsItem values
    → optionally sort by publishedAt newest first, with undated items last
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
    → optionally sort by publishedAt newest first, with undated items last
```

The Hacker News provider intentionally remains a single-request HTML loader.
Each `.athing` title row is followed by a metadata row, so author, time, score,
and comments traverse to the next `tr`. The comment selector targets the last
direct link in `.subline`; a broader `:last-child` selector also matches the
age link nested inside its span. Numeric extraction does not depend on spaces
because Hacker News separates comment counts with a non-breaking space. The HN
discussion URL remains the item identity, while the article URL, site, and
visible rank are retained as source-specific attributes.

All item or metadata fields in a group are extracted before that group's
templates render. Each template sees its complete pre-template group, which
makes output independent of declaration order and prevents template cycles.
When every fallback selector for an optional field misses, the HTML loader
returns an empty Cheerio collection derived from the current root; it must not
send an empty synthetic selector back through the CSS selector parser.

RSS loaders request the response as text explicitly, sniff JSON versus XML,
and support RSS, Atom, and JSON Feed 1.0 or 1.1 through one resolution path.
RSS and Atom map their channel/feed metadata and entries; JSON Feed maps its
presentation metadata, first item author, and item URL fields. XML text values
receive one strict HTML character-reference decoding pass after parsing so
entities left literal by CDATA-producing feeds do not leak into presentation.
RSS and Atom entry body candidates map to `content.html`; the frontend's shared
sanitized HTML renderer owns their presentation. JSON Feed retains the format's
explicit distinction between `content_html` and `content_text`.
A missing JSON Feed item title is derived from its summary, text content, or
stripped HTML and bounded to 200 characters. Entries without a usable title or
URL are discarded. The loader emits only `publishedAt`, using the parseable
publication time or falling back to the update time inside RSS parsing. Parsed
entries temporarily pair their item with the raw parsed update time. If every
retained entry has an update time in descending order (including ties), the
loader stably sorts by the resolved publication time before the shared result
limit is applied. Other feeds retain their order. The internal update times are
discarded before returning items; downstream sorting and timeline inference do
not inspect them. The shared item type and JSON/HTML field contracts expose only
`publishedAt`; the loader-result boundary rejects unsupported top-level item
fields instead of retaining a second time field.
RSS metadata uses the same normalization, URL resolution, persistence, Query caching, and
presentation override pipeline as JSON, HTML, and custom loader metadata.

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
Source-specific compact counts are normalized through the shared
`parse_compact_number` Liquid filter before the loader-result boundary validates
them as finite numeric stats.

## Radar pipeline

Radar ignores executable loaders but retains bundled JavaScript parameter
functions in its background-only runtime matcher:

```text
active tab URL
    → select and parse the URL or hash location
    → match and validate structured URL components
    → batch page-field extraction and matching JavaScript parameter functions
    → render Liquid parameter patches and apply JavaScript results
    → normalize and validate parameters
    → render metadata patches
    → apply source presentation metadata to the discovered instance
    → rank simultaneous matches by query/hash, path, and host specificity
    → break equal-specificity ties with explicit rule priority
    → persist the accepted suggestion with the selected board membership
```

Page-field queries required by matching rules are deduplicated and executed in
one active-tab script. Each matching JavaScript parameter function executes in
the active tab through the browser scripting API; failures omit that discovered
value and let normal parameter defaults apply. Functions are bundled trusted
code, must be closure-free, and never cross extension messaging. Field and
function results are isolated from Liquid rendering, and the document object is
never exposed to Liquid. Radar does not scan pages for RSS, Atom, or JSON Feed
links; users can still add those URLs through the built-in `rss:feed` source.
The Chromium extension exposes `app.html` exclusively to the published RSSHub
Radar extension ID. At that boundary, the App accepts the `feed`, `add_feed`,
`url_rss`, and `feed_url` subscription parameters, including parameters after a
compatibility path prefix. Before Hash Router startup, the App validates the
external HTTP(S) feed URL, stores a one-shot in-document intent, removes the
query, and opens an `rss:feed` Radar modal. The caller cannot mutate the
workspace or use extension messaging directly; creating the LiveCard still
requires the ordinary Radar review and Board selection. Page discovery Radar
otherwise renders in the extension action popup.

Badge updates use a URL-only match to advertise possible suggestions; they do
not claim that page extraction has completed. The action popup performs the
authorized page extraction and receives each resolved suggestion together with
its exact serializable Source descriptor in one response. It never follows a
completed scan with a separate complete-registry request before rendering the
LiveCard.

The background does not cache resolved Radar suggestions. Every full scan reads
the active page's current fields and JavaScript parameter values before matching,
including when the tab URL and title have not changed.

Radar discovery is complete only when the suggestion captures the active page's
full Source configuration. Its intended interaction is review followed by one
`Create` action, without making the user re-enter filters, sorting, identity, or
other choices already expressed by the page.

Each rule selects one URL-like location. The default uses the ordinary pathname
and query; `location: "hash"` parses a Hash Router path and query or a bare
fragment parameter string. Both expose the same `scope.path` and `scope.query`,
so the schema and matcher do not duplicate URL semantics. Plain fragment
anchors are ignored. Path matchers return named captures without validating
their values. A rule may require query keys but never matches their values;
every query value remains available independently so a patch may map optional
page state without making it an eligibility condition. Radar does not accept
arbitrary regex or parameter validation. Reusable value semantics belong in the
Source parameter schema. The runtime normalizes and validates that schema before
invoking a loader, so loaders consume parameter values directly instead of
repeating parameter or parameter-combination policy. Loaders still validate
untrusted external data at the response boundary.

Radar parameter patches remain sparse. Radar validates only discovered values
and stores only those values in the Instance patch; defaults are combined with
the patch when producing the effective parameters used by metadata templates
and Source execution.

Structured specificity is a lexicographic tuple: query or hash state above
path above host, followed by exact, parameterized, and wildcard path kind,
static segment count, path depth, required-query-key count, and fewer dynamic or
wildcard segments. The matcher evaluates every matching include pattern and
retains the most specific one. Only equally specific suggestions consult the
rule's optional integer `priority`. Generated same-origin fallback rules do not
set one.

Rules and compiled matchers are cached. Optional Radar failures are reported as
diagnostics and fail closed instead of interrupting the surrounding UI.
Radar metadata can replace source-owned presentation fields such as title,
badge, description, and home URL, but cannot modify source identity,
provider title, icon, color, category, loader behavior, capabilities, secrets,
request rules, or Source version.
Accepting a Radar suggestion creates an Instance in exactly one Board. The editor
uses the same sparse parameter and metadata patch; inherited defaults are resolved
for display/loading without being copied into persistence. Provider identity and
inferred presentation remain read-only. Membership and identity rules belong to
[Application Architecture](APPLICATION_ARCHITECTURE.md#persistent-application-data).

Parameter normalization and validation live in `source-kit` rather than in a
specific caller. A serializable parameter `validate` rule travels with public
Source descriptors, allowing the LiveCard editor to report invalid input before
save while the background runtime, CLI preparation, and Radar use the same pure
helpers. Radar only extracts candidate values; its resolved patch passes through
the complete parameter schema before metadata renders or a suggestion appears.

## Capabilities, secrets, and request rules

Capabilities describe effects a source may perform:

- `network` controls permitted HTTP and HTTPS hostnames;
- `cookies` identifies origins used by cookie-backed secrets.

Structured loaders infer a static URL hostname and merge it with explicit
capabilities. Dynamic URLs are checked after template rendering. Custom loaders
must declare all effects because their behavior cannot be inspected.

The shared HTTP client uses `credentials: "include"` because source execution
represents the user's logged-in browser session. A loader may explicitly use
`credentials: "omit"` for an anonymous request. The network capability still
controls which origins the source may contact; the cookies capability is
reserved for cookie-backed secrets that read specific values.

The shared Source HTTP client queues requests by normalized hostname. Each
hostname runs one request at a time and observes the centralized minimum start
interval, while different hostnames remain independent. A private Ky client
provides method shortcuts, request serialization, body parsing, timeout
handling, and retries for transient GET failures. Runtime entry points derive a
Ky instance for each `SourceLoaderContext`, bind the execution signal as a Ky
option, and validate Ky's final normalized request URL in a
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

The JSON registry accepts only declarative structured loaders. Function loaders
and JavaScript Radar parameters must come from bundled TypeScript Runtime
Sources, so registry data cannot inject code.

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

`run` and `fetch` travel through the local Rust daemon and Native Messaging host
to the connected extension. `run` shares provider expansion, parameter validation,
capabilities, secrets, and result validation with normal Source execution, but
bypasses the normal persisted-result protection path for authoring. Only `--debug`
captures cloned request/response diagnostics. Local JSON providers use an isolated
`cli:<provider-id>` secret namespace unless `--use-provider-secrets` is supplied;
they do not install or modify the registry.

`fetch` makes one browser-owned HTTP(S) request without source retries or HTTP
status exceptions. Browser forbidden-header rules still apply. Missing host
access opens a scoped permission window; `developer.runSource` uses the same
approval flow for its resolved Source. Execution timeout aborts browser work.
Direct fetching does not verify the complete Source contract.

The private CLI repository owns the executable, daemon, and short-lived Native
Host. Each browser port starts a bridge that forwards length-prefixed stdio to
one per-user daemon over a Unix socket or Windows named pipe. The daemon owns
state; a bridge does not. Shutdown fails pending work and removes socket endpoints;
startup reclaims stale sockets but never replaces an unrelated non-socket file.

Rust `serde` enums own the wire contract. Generated internal projections live in
`apps/extension/src/lib/native-protocol` and are not hand-edited. Browser code
imports them through `@/lib/native-protocol/*`; message parsing lives in
`@/lib/native-messaging`. Only `Worker` and `OfflineWorker`, which occur in public
SDK results, live in `packages/sdk/src/protocol` and are exported through
`@newsnext/sdk/models`. The SDK exposes no `protocol/*` subpath.
Run from the CLI repository:

```sh
bun run protocol:export
```

This clears `bindings/`, exports fresh types with `.js` import extensions,
replaces both generated directories, routes public result types to the SDK and
internal wire types to the extension, and rebuilds the SDK. This development command expects the CLI and web checkouts
to be siblings, as in the NewsNext wrapper repository.
Wildcard package exports expose the generated files directly, without a
maintained export index. SDK builds clear `dist/` to prevent removed types from
remaining in the published package. Commit the generated types with the change.
Ordinary SDK builds use the committed files and do not require Rust or the
private CLI repository. The native-messaging entry point stays browser-safe.
Protocol 21 carries Workspace patches, Instance routing, Actions, cached results,
and Widget Snapshots. Incompatible versions disconnect. Request IDs correlate
completions; timed-out or disconnected executions are not replayed automatically.
Additive features use explicit capability negotiation. The native host advertises
`sdk` when it supports pull-based SDK streams from Widgets. The SDK shares one
client implementation between the Node subprocess transport and browser
MessagePort transport; Widget requests reuse the existing CLI SDK dispatcher.
See [Layers and Widgets](APPLICATION_ARCHITECTURE.md#layers-and-widgets) for the
host boundary and lifecycle.

Workspace commits validate expected revisions and broadcast deterministic patches
with complete entity order and only changed values. Instance `workerId` supplies
routing; there is no second binding store. Worker identity is browser-local and
survives service-worker restarts. Settings can explicitly restore an offline
Worker identity after reinstall; connected identities cannot be claimed.

Development and production have separate host names (`app.newsnext.host.dev` /
`app.newsnext.host`) and IPC prefixes (`app.newsnext.daemon.dev` /
`app.newsnext.daemon`). Runtime selection and data paths belong to
`runtime_environment.rs` in the CLI: `NEWSNEXT_ENV` overrides the debug/release
build default, and data lives under `~/.config/newsnext.dev/` or
`~/.config/newsnext/`, with `newsnext.db` and `widgets/` inside. Explicit database,
Widget, and IPC overrides support isolated runs. Native registration affects only
the selected environment and cannot choose an arbitrary extension-controlled
executable or network endpoint. Installation options live in the
[CLI reference](../skills/newsnext-sdk/references/commands.md).

Messages are UTF-8 JSON with native-endian 32-bit length framing. The host accepts
up to 64 MiB from the extension, keeps host-to-extension frames below 1 MiB, and
splits large messages into 256 KiB UTF-8 chunks. Extension reassembly is bounded
at 64 MiB. Stdout carries protocol data only; stderr carries diagnostics. Unix
peers verify credentials; Windows pipes inherit the creating user's access
control. Browser credentials stay inside extension execution.

## Stream collection diagnostics

The collection chain uses `collection-status.ts`, `parseCollectionStatus`,
`getCollectionStatus`, and `snapshot.collection`. Protocol types are generated from
the daemon: `CollectionStatus` contains per-stream `StreamStatus` records.

The daemon advertises additive `collectionStatus` and `collectionStatusPush` capabilities.
Registered Workers bootstrap with `collectionStatusGet` / `collectionStatusResult`, then
use `collectionStatusSubscribe { enabled }` to receive typed `collectionStatusChanged`
events through Native Messaging. Only changes to scheduler state or committed history
observations trigger pushes; a changing sample timestamp alone does not. The result is a projection of the live scheduler, including in-flight
work, offline Workers, retry deadlines, persistence failures and per-stream learning
metrics; it is not reconstructed from stale database rows or extension query cache.
Only stream/Instance identifiers, counters, timestamps and error text are exposed,
not raw items, parameter values or persisted fingerprints. Native payloads are
validated before resolving the pending request or updating the subscription cache. Unsupported daemons are detected by
capability before sending the request, so older hosts retain their connection.
The development-only diagnostics service reads this endpoint directly and keeps
failures separate from the rest of its application snapshot.

Stream diagnostics also read `history_datasets.observation_count` for each resolved
stream when serving a request or delivering a subscribed update, including observations retained by explicit Jobs and before
daemon restart. Counts use the same Worker/Source/version/resolved-params identity
as scheduling. Unresolved streams report an unknown count. Diagnostics read dataset
summaries without scanning observation items or holding the daemon state lock.
