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

Extension library code is grouped behind responsibility-level entry points:

```text
apps/extension/src/lib/
├── background/  background services and the frontend service client
├── board/       board models, filtering, sorting, and mixed timelines
├── radar/       page discovery, matching, and suggestion conversion
├── settings/    persisted user data, preferences, and settings helpers
└── source/      source cards, loading, caching, permissions, and history
```

App code imports these directory entry points. Modules inside a responsibility
use direct relative imports so their dependencies remain explicit and do not
loop back through their own barrel.

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
individual source configuration. Provider color is required and registry
validation accepts only values from the shared `COLORS` palette; provider icon
and category are optional. The author-facing palette is documented in the
[Source Guideline](./SOURCE_GUIDELINE.md#provider-and-source-configuration).

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
the fallback. Favicon.im is the default preset, with Google, Vemetric,
DuckDuckGo, and custom templates available. The extension persists the selected
preset and template as a local user setting. This keeps third-party favicon
service URLs out of provider definitions and the generated registry while
allowing instance-specific home overrides to select the matching icon. The
preference is part of the portable Settings slice. Application Data persists
Collections, Collection entries, Collection Views, and source Instances in one
normalized envelope. An Instance never stores a Board identifier. Collection
entries own membership and manual position; Collection Views own Board color,
filtering, and sort mode. Extension pages read synchronous `localStorage`
snapshots first, then reconcile them with canonical copies in
`browser.storage.local`; background storage wins when both copies exist.
A versioned `newsnext-user-data` envelope validates and combines the portable
slices for import and export. Version 2 exports Application Data; version 1
files remain accepted only at the import boundary, where Boards and
`Instance.boardId` values become Collections, Views, and entries. Current board
selection, CLI connectivity, browser permissions, and caches are device-local
and are not part of that envelope.
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
        ├─ validate the result, every NewsItem, item template, and response metadata
        ├─ reject an empty or malformed item result
        ├─ cache items, the item template, and dynamic source presentation metadata
        └─ infer the card presentation from effective item times and order in the UI
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
from the most recent stored result, while fetch-latest tracking keeps UI
feedback visible for a minimum 500ms. The result returned to the active query
receives the protected action's completion time without rewriting the stored
entry or extending the guard interval. Expired cached data is
otherwise published as a temporary query result while a remote load is pending.
Automatic query revalidation uses the normal source cache policy. Fetch-latest
intent is passed directly to the query function rather than stored as state for
a later query execution. App query timing and the Fetch Latest protection
interval are centralized in
`apps/extension/src/lib/source/query-policy.ts`.

The app also reads the last persisted result as presentation-only placeholder
data when a card mounts. This survives an app close and reopen
and may use an expired entry while a fresh request is pending. The loader reads
each cache entry once and injects stale data into the active query before
continuing the request. Placeholder data does not satisfy the request, extend
the entry's freshness, or change fetch-latest behavior.

The persistent cache uses Dexie over an IndexedDB object store containing the
result and `usedAt`. The result's `updatedAt` drives freshness and fetch-latest
protection; successful reads update `usedAt` in the same read-write transaction
that returns the cached record. Clearing and cleanup group their related table
changes in Dexie transactions. The cache record primary key is its only index; cleanup
scans the small cache table around its configured 500-record cap, so indexing
`usedAt` would add write and storage overhead without serving a query. At most
once per day after a write, cleanup removes entries unused for 30 days, superseded cache
versions for the same source and normalized parameters, and least-recently-used
entries beyond 500 records or an estimated 50 MiB. Cache failures remain
fail-open: they never prevent a source request from completing.

Source history is stored separately from this freshness cache. Its dataset
identity is the source ID plus normalized parameters, so cards on different
boards reuse the same observations. Cache version is recorded on each
observation rather than included in dataset identity; this preserves continuity
while allowing analysis to identify behavioral version boundaries.

Every successful remote load appends an observation using the background
result's `updatedAt`. Cache hits, stale placeholder publication, and protected
Fetch Latest actions do not create observations. When a dataset has no history,
the extension may seed it once from its existing persistent cache using that
result's original update time. History writes are fail-open and independent of
the latest-result cache.

The history database uses Dexie over IndexedDB and normalizes results into
provider-scoped items, item revisions, ordered snapshots, and observations.
Datasets and items use numeric primary keys in snapshot and observation records
to avoid repeating source parameters and URLs. A unique compound
`[providerId+url]` index enforces exact-URL item identity within one provider;
the same URL from different providers is never shared. A compound
`[itemId+digest]` index supports batched revision reuse. Candidate revisions are
serialized from their stored `NewsItem` and compared after a digest match, so a
second copy of the complete item JSON is not persisted. Sources and parameter
sets belonging to the same provider may reuse an item revision, while
observations and snapshot order remain dataset-specific.

Only fields used by a lookup or ordered cleanup are indexed: dataset identity,
provider plus URL, item plus digest, dataset plus observation time, and
observation time. Snapshot references and denormalized bookkeeping fields
remain unindexed to avoid IndexedDB write amplification. Multi-table writes,
clears, and reference-count cleanup use transaction-bound Dexie tables; no
network or unrelated asynchronous work runs inside those transactions.

Consecutive identical results reuse an ordered snapshot but retain every real
observation time. The snapshot stores only a short digest alongside the ordered
revision IDs and verifies the full identity before reuse. Snapshot order
represents rank. Timeline and ranking semantics continue to be inferred per
result using the normal presentation rule, so a dataset that changes
interpretation can be reported as mixed without adding an author-facing source
type.

History range reads use keyset pagination over the compound
`[datasetId+observedAt]` index. Observation summaries resolve only their
snapshot metadata, while an exact observation read hydrates its ordered item
revisions in one read-only transaction. This avoids offset scans, per-record
IndexedDB reads, and loading item contents before they are requested. History
cleanup runs at most once per day after a write, or immediately when the
estimated 100 MiB limit is exceeded. It removes expired or globally oldest
observations in bounded batches and uses persisted dataset, snapshot, revision,
and item reference counts to garbage-collect newly unreachable records without
scanning the whole database. The retention window remains 30 days. Deleting one
card does not delete shared history. Clearing all user data clears both the
freshness cache and history.

The external boundary is the neutral source-history repository rather than the
Dexie tables. It normalizes raw source parameters before resolving a dataset
and exposes four operations: dataset discovery, cursor-paginated observation
summaries, one hydrated observation, and a deterministic comparison between two
observations. Public records contain provider-scoped item identity, one-based
snapshot position, the observed `NewsItem`, source version, and collection
metadata; internal dataset, snapshot, revision, and reference-count identifiers
never cross this boundary.

Observation comparison reports only directly supported facts: items added to
the returned snapshot, items missing from it, position changes, and changed
top-level `NewsItem` fields. In particular, `missing` is not labeled as removed
or dropped because a returned list may cover only part of a source. Repository
responses include completeness warnings when a referenced snapshot or revision
is unavailable. Product-specific interpretations are derived by the consumer
and are not part of persistence or repository code.

The extension-backed CLI exposes these repository operations as four read-only
commands: `newsnext history datasets`, `newsnext history observations`,
`newsnext history get`, and `newsnext history compare`. Collection and Instance
discovery goes through the canonical Query catalog, including
`collection.list`, `collection.listInstances`, `instance.list`, and the
`view.*` context Queries. There are no separate Native or CLI Board/Instance
listing protocols; adapters return the same Data identities and View references
as every other Query consumer.

The same transport exposes canonical application control through
`newsnext action list`, `newsnext action execute`, `newsnext query list`, and
`newsnext query execute`. Catalog listing returns stable names, descriptions,
and JSON input/output schemas. Execute requests carry a name and JSON object;
the extension parses that object through the canonical catalog before calling
the same Action executor or Query implementation used by the frontend. Agent
Source discovery and frontend Source picker discovery both execute
`source.list` through this boundary; there is no parallel Registry or Native
listing service. Native and frontend Action writes enter the same background
queue, are normalized and
persisted to `browser.storage.local`, and propagate to open extension pages
through read-only storage subscriptions. Bulk import and reset use the same
queued background repository replacement rather than setting frontend atoms.
Composite Collection create/update and manual-order Actions apply their Data
and View changes to one in-memory envelope and perform one storage write.
Action transports return only compact receipts; the updated envelope reaches
each frontend through its own subscription state rather than a duplicate proxy
payload.
The Application Data mirror never initializes or normalizes browser storage
from a frontend page; the background runtime is the only persistent writer.
`view.getContext` resolves the current Board to its Collection identity, while
`view.getVisibleCards` returns the Cards logically displayed by that Board with
their Instance and membership identities.

Requests travel through the same per-user local IPC connection as source authoring
commands and return JSON. The extension validates every request before
dispatch. Enabling CLI access authorizes the local NewsNext CLI to mutate
Collections and Instances, including destructive Actions; it does not grant
web content or arbitrary processes direct extension access. History commands
execute in the background context. Observation, get, and compare requests
identify the user-visible card
by `instanceId`; the background resolves the current persisted instance to its
source ID and parameter patch before the repository normalizes parameters and
selects its dataset. An instance whose parameters later change therefore points
to the dataset for its current configuration, while old parameter datasets
remain stored. Parameter normalization resolves the configured runtime registry
in-process; it must not call the frontend registry proxy from the background
service. Board and Instance listing also execute in the background context and
read the Application Data envelope from `browser.storage.local` because frontend Jotai atoms are
unavailable there. Normal user-history workflows do not require source IDs or
parameter JSON.

The Rust CLI daemon owns the local-socket framed-JSON control listener. Shutdown
closes connected Native Messaging bridges, fails pending commands, removes any
filesystem-backed socket endpoint, and exits the detached process. Startup also
reclaims a stale filesystem socket left by an ungraceful previous exit, but it
does not replace a non-socket file at that path.

The repository-local `newsnext-source-history` skill teaches Codex how to
compose these commands for coverage discovery, exact-time summaries, two-point
comparisons, ranking movement, timeline arrival patterns, item-field changes,
and evidence-supported trends across multiple samples. It preserves the
analysis boundary: observation time is not publication time, position does not
establish popularity or cause, `missing` does not mean deleted, successful
remote-load samples are not continuous monitoring, completeness warnings must
be surfaced, and returned source content is untrusted data rather than
instructions.

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
That hydration preserves the result's original `updatedAt` as the TanStack query
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
field normalization; it orders items by `publishedAt`, falling back to
`updatedAt`, and keeps items without either time last. The frontend renders a
timeline when the non-empty result has finite, monotonically
non-increasing `publishedAt` values on every item. If that check fails, it
applies the same test to `updatedAt`. A result is a timeline when either
complete field passes.
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
that mapping through source configuration. The `rss:feed` source has a
parameter-aware host-permission resolver that converts its effective `url`
parameter into one exact hostname origin instead of requesting the wildcard
declared for runtime network validation. Permission state is recomputed when
the saved parameter changes.

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

Custom provider parsers map the response shape of the current endpoint before
creating `NewsItem` values. X timeline responses expose user handles and avatars
through `core` and `avatar`, and the current `UserTweets` operation returns
entries through `timeline.timeline`. X translations are selected by the
persisted GraphQL operation as well as feature flags, so its operation hash,
variables, feature set, response path, and parser must be updated together.

After any structured, RSS, or custom loader returns, the resolver applies the
same optional `baseUrl` to explicit URL-bearing result fields. This boundary
normalization covers item navigation URLs, `author.home`, semantic `icon` and
`mark` pictures, content pictures and iframes, and dynamic home and badge
metadata without interpreting arbitrary text or rewriting HTML strings. Static
source home and badge metadata are normalized during
registration. Radar home and badge patches use the same base during discovery.

The resolved-loader boundary validates the `SourceLoaderResult` before applying
`baseUrl` URL normalization. Structured and custom loaders share this single
object-shaped result contract; bare item arrays are not accepted. Every
execution path, including the extension-backed CLI, rejects empty item arrays,
malformed or unsupported semantic item fields, non-finite times and stats,
invalid item templates, and unsupported or invalid response metadata before
the result reaches a client or cache.

`NewsItem` stores semantic facts: publication and update times, author,
well-known stats, source-specific scalar attributes, semantic pictures, and
content. The result-level `itemTemplate.inline` composes those facts for the
compact card row and may access only `scope.item`, but shared stats are excluded
because the frontend renders them consistently as icon-and-count pairs. It
travels with cached and transported loader results, while history snapshots continue to store only the
items so presentation changes do not become historical fact changes. The UI
uses a deterministic author/attribute fallback when no template exists.
Source-specific templates omit facts already conveyed by the source instance,
while those facts remain on the item for history and analysis.
The default inline composer also omits the author name when an
`icon.kind: "author"` picture is present. Explicit source templates follow the
same rule and fall back to the name when that semantic icon is absent.
Semantic pictures carry only `src`, optional `kind`, and optional `label`;
frontend components own their uniform height, intrinsic width, crop, and corner
treatment. Content pictures remain URL strings rather than presentation
objects.
The card presentation layer scans the first mark from each source instance for
symmetric top and bottom transparent padding, derives a scale targeting 14px of
visible content inside the 16px image box, and caches it for the remaining
marks. Width and height are sampled independently so wide assets retain enough
vertical resolution. The frontend applies the value as a centered CSS transform
without changing the fixed image height or clipping the image; horizontal
proportions remain intrinsic. Decode, CORS, or size-limit failures fall back to
the original image layout.
The shared loader-result boundary removes nullish nested item values and empty
semantic groups after any loader returns. This keeps normalization out of
individual providers and preserves numeric zero and boolean false.
The semantic item migration advances the default source cache version to `2`;
sources with explicit versions advance independently. This prevents legacy
`timestamp`, `inline`, and `preview` observations from sharing a dataset with
the new item schema.

## Structured loader pipelines

JSON loaders:

```text
request
    → parse JSON response
    → select items with JMESPath
    → select each field with JMESPath
    → render field Liquid templates
    → normalize and validate NewsItem values
    → optionally sort by updatedAt or publishedAt newest first
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
    → optionally sort by updatedAt or publishedAt newest first
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
A missing JSON Feed item title is derived from its summary, text content, or
stripped HTML and bounded to 200 characters. Entries without a usable title or
URL are discarded. After filtering, the loader independently retains parseable publication and
update times on each entry without using feed order to discard either fact.
RSS metadata uses the same normalization, URL resolution, caching, and
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
also scans the active HTTP(S) document for RSS, Atom, and JSON Feed alternate
links or a directly opened feed. Direct detection recognizes RSS or Atom
document roots, the browser's built-in unstyled XML document view, and bounded
JSON Feed documents served as `application/feed+json` or `application/json`.
Generic JSON is parsed and structurally validated before it is accepted. The
bounded scan deduplicates absolute URLs and adds one built-in suggestion per
feed, up to 20 per page. Each suggestion keeps the page URL as its home, uses
the page hostname favicon as its initial instance badge, and prefers the
discovered feed title over the source's static title. After loading, dynamic
RSS metadata may replace that badge. RSS suggestions use lower built-in
confidence than generated origin-only and default explicit rules, so a
dedicated source normally remains the primary suggestion.
This engine-agnostic path is also the generic integration for forums that
publish RSS, Atom, or JSON Feed. Radar does not inspect forum generator metadata
or couple discovery to engine-specific routes. Field and feed metadata
extraction is
isolated from template rendering; page scripts are not executed and the
document object is never exposed to Liquid.
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
New instance IDs combine the source ID and a 12-character Nano ID with `::`;
custom Board IDs use the Nano ID directly. Both remain opaque strings so data
persisted with older ID formats continues to resolve without migration.
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

`newsnext run` sends a request through the local daemon to a connected
extension. The extension executes the same provider expansion, parameter
normalization, registry validation, capabilities, secrets, and background loader
path as normal source loading.

`newsnext fetch` uses the same command transport but calls the browser's native
`fetch` in the extension background with `credentials: "include"`. It returns the
status, response headers, and decoded text body to the CLI. The command accepts
HTTP(S) URLs without embedded credentials and never serializes browser cookies
into the command or response. Browser host permissions still govern access; the
command neither requests nor expands them. Request headers remain subject to the
browser Fetch API's forbidden-header rules. The CLI execution timeout also
aborts the browser-side network request.

The CLI runtime is a Rust binary in `apps/cli-rs`. One executable
provides CLI control commands, the long-lived daemon and tray icon, and the
short-lived Native Messaging host mode. The browser starts one host process per
`runtime.connectNative()` port. That process only translates the browser's
length-prefixed stdio messages to the daemon's per-user local IPC; it does not own
daemon state. This separation preserves one daemon and one tray icon across
multiple browsers and profiles.

Rust `serde` enums are the canonical wire contract. `ts-rs` exports their
TypeScript projections into `packages/extension-connection/src/generated`; do
not edit those files manually. Browser runtime code imports protocol types and
validation from the browser-safe `@newsnext/extension-connection` package.
Extension messages carry an explicit protocol version. The daemon associates
commands and completions by request ID, rejects
ambiguous browser selection, expires pending executions, and never replays a
command after reconnection because source execution is not guaranteed to be
idempotent. Settings exposes the daemon version as connection metadata only.
Protocol version 2 adds canonical Application Action and Query discovery and
execution. Protocol version 3 adds the `app.open` command used by the desktop
tray. The command is routed to an exact connected extension instance, which
opens its own packaged `app.html` URL through the browser tabs API. Incompatible
daemon and extension versions disconnect instead of silently accepting a
partial control surface.

Native Messaging registration is the browser-facing security boundary. The
host uses the reverse-domain name `app.newsnext.host` for `newsnext.app`.
Chromium family uses manifests that restrict `allowed_origins` to the installed
extension IDs. The development ID is always included; the optional production
Chrome Web Store ID is configured by `PRODUCTION_CHROMIUM_EXTENSION_ID` in the
installer's `browser` module. Firefox uses `allowed_extensions` and the stable
`addon@newsnext.app` Gecko ID. Chrome, Chromium, Edge, and Firefox are
supported across desktop platforms. Ego Lite, Dia, and Arc use their dedicated
Chromium user-data roots and are currently registered on macOS only.
Interactive registration lists detected browser installations and defaults the
selection to all of them. Explicit browser arguments bypass selection for
automation; non-interactive registration uses all detected browsers. Detection
does not inspect browser profiles, so an explicit argument can still register a
browser missed by detection. Windows stores a separate manifest per browser
because Firefox and Chromium-family manifests use different authorization
fields. A current-directory mode writes either manifest family without platform
registration, supporting manual installation for browsers outside the detection
table. The `native_messaging::installer` module owns browser metadata, manifest
generation, installation, and platform-specific filesystem or registry
integration, including registration-state detection and uninstall. The
`cli::commands::install_native_host` module only owns command arguments,
interactive selection, validation, and user-facing output. The tray's browser
integration menu lists detected installations only, calls the same installer
API, and refreshes each checkbox from the resulting registration state after an
operation. The binary `main.rs` is a thin entry point into the Rust library;
`lib.rs` owns the module tree, `cli` owns Clap parsing and dispatch,
`cli::service` owns daemon lifecycle commands, and `tray` owns the desktop event
loop and menu. Other CLI commands are split by capability under `cli::commands`,
with shared connection and output behavior in `common`. Native Messaging process
invocation detection and its tests live with the bridge runtime in
`native_messaging::host`. The extension cannot choose an arbitrary executable or
network endpoint.
Native messages are UTF-8 JSON framed by a native-endian 32-bit byte length. The
host caps every incoming and outgoing
browser message at 1 MiB, writes protocol data only to stdout, and reserves
stderr for diagnostics. The internal daemon listener uses a Unix domain socket
on Unix platforms and a named pipe on Windows instead of opening a TCP port.
Default endpoint names are scoped to the effective Unix user or the Windows
local application-data location; `NEWSNEXT_IPC_NAME` can override the name for
isolated development runs. Both sides verify Unix peer credentials before
exchanging protocol messages. Windows named pipes retain the access control
derived from the creating user's process token. Filesystem-backed Unix sockets
are removed during normal shutdown and reclaimed on the next startup after an
ungraceful exit.

The Rust CLI implements daemon lifecycle and tray status plus the `run`,
`fetch`, `action`, `query`, and `history` commands and command families. All
extension-backed commands use the same typed execute/result IPC path. `run`
retains
registered sources, provider files, standard input, parameter overrides,
provider-secret selection, compact output, verbose remote errors, and watch
mode.

The Native Host replaces the extension build target with the launching parent
process executable name when it is available. The name remains unchanged except
that Windows strips a trailing `.exe`. This keeps Chromium derivatives distinct
while retaining the build target as a cross-platform fallback. The extension
persists a generated connection instance ID in profile-local storage so the tray
identity remains stable across Manifest V3 service-worker restarts. Chrome does
not expose its local profile display name to extensions, so the connection does
not claim to identify it or request account identity permissions as a substitute.

The tray exposes Open NewsNext only while an extension is connected. With one
connection the item targets that instance directly. With multiple connections
it becomes a submenu sorted by browser and instance ID. Each child displays the
detected browser and a short unique instance ID, and targets the exact instance
rather than using the CLI's potentially ambiguous browser-name selector.

Local provider runs use an isolated `cli:<provider-id>` secret namespace unless
`--use-provider-secrets` is supplied. CLI execution does not install the
provider, change the bundled registry, populate the normal source cache, or
grant additional browser permissions. It does use the same loader-result
validation as registered extension app loads.

This is why direct HTTP requests are useful for investigation but are not a
substitute for extension-backed source verification.

Source-history commands use the same daemon and connected extension to read the
extension's IndexedDB-backed observation repository. Dataset discovery accepts
source and provider filters plus opaque pagination cursors. Observation listing
accepts normalized source parameters, time bounds, and timestamp pagination.
Exact reads and comparisons require observation timestamps returned by the
listing command. CLI history access is read-only and preserves repository
completeness warnings.
