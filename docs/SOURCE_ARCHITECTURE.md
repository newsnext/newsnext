# Source Architecture

This document describes how NewsNext source definitions move from provider
files to executable browser-extension sources. For configuration syntax and
authoring examples, see the [source authoring guide](SOURCE_GUIDELINE.md).

## System boundaries

Source support is split across three packages:

```text
registry
  owns provider definitions and generated registry artifacts

packages/source-kit
  owns source contracts, validation, resolution, and structured loaders

apps/extension
  owns browser integration, permissions, secrets, caching, and execution
```

Extension library code is grouped behind responsibility-level entry points:

```text
apps/extension/src/lib/
├── background/  background services and the frontend service client
├── board/       board models and sorting
├── radar/       page discovery, matching, and suggestion conversion
├── settings/    persisted user data, preferences, and settings helpers
└── source/      LiveCards, loading, caching, permissions, and history
```

App code imports these directory entry points. Modules inside a responsibility
use direct relative imports so their dependencies remain explicit and do not
loop back through their own barrel.

`@newsnext/source-kit` does not import concrete providers. It receives resolved
sources through an `ExternalSourcesLoader`, which keeps the source runtime
independent from the bundled registry and its wire format.

The main source package is organized by responsibility:

```text
packages/source-kit/src/
├── core/       defaults, parameters, templates, loaders, and capabilities
├── registry/   provider expansion and registry parsing
├── runtime/    source lookup and request preparation
├── types/      shared contracts
└── utils/      source-facing fetch, crypto, and JWT helpers
```

## Build pipeline

Providers live under `registry/src`. The registry build discovers
top-level TypeScript files, nested `index.ts` files, and top-level JSON files.
It then produces:

```text
registry/registry.json
registry/sources.ts
```

`registry.json` is a flat object keyed by complete source IDs such as
`example:latest`. It contains only JSON providers: serializable provider
metadata, expanded source configuration, structured loaders, and resolved
capabilities.

`sources.ts` contains complete resolved Runtime Sources for TypeScript
providers, including configuration, Source version, Radar, and loader behavior.
TypeScript Sources have no projection in `registry.json`.

The build follows this sequence:

```text
provider files
    │
    ├─ JSON providers
    │      ├─ expand and validate serializable configuration
    │      └─ registry.json
    │
    └─ TypeScript providers
           ├─ resolve complete executable Runtime Sources
           └─ sources.ts

registry.json + executable Runtime Sources
    └─ reject provider IDs that mix JSON and TypeScript Sources
```

Duplicate provider or source IDs fail the build. A provider ID also cannot
appear in both formats, even when its local Source IDs differ. Generated files
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

Required source values, including the loader, come from defaults or individual
source configuration. Source version defaults to `2` and may be overridden by
a positive integer. Provider color is required and registry
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
Boards and Instances in one normalized envelope. An Instance never stores a
Board identifier. Each Board directly owns its color, default layer, sort mode,
membership, and membership order. Extension pages read synchronous `localStorage`
snapshots first, then reconcile them with canonical copies in
`browser.storage.local`; background storage wins when both copies exist.
A versioned `newsnext-user-data` envelope validates and combines the portable
slices for import and export. Import accepts only the current version 3 envelope.
Current Board selection, CLI connectivity, browser permissions, and caches are
device-local and are not part of that envelope.
The Settings data reset restores every persisted slice to its default, deletes
the device-local source-secret and IndexedDB source-result caches, clears active
source queries, and revokes user-granted optional browser and host permissions.
Required development permissions remain controlled by the extension manifest
and cannot be removed at runtime.

This prevents a source definition, Radar rule, or Instance patch from changing
the identity and visual treatment shared by its provider.

Provider category is a static registry attribute. Provider expansion copies it
into every flattened source descriptor, and registry parsing validates it
against the shared `CategoryId` taxonomy. Runtime resolution does not infer a
category from source content, parameters, URLs, or loader behavior. An omitted
category remains absent. Source metadata, Radar patches, loader metadata, and
persisted Instance patches cannot add or replace it. See the
[provider category taxonomy](SOURCE_GUIDELINE.md#provider-category-taxonomy) for
authoring and matching rules.

## Registry resolution

The extension bundles `registry.json` and the generated `resolveSources`
function. Background startup configures the source runtime with a loader that
resolves both artifacts:

```text
bundled registry.json
        │
        └─ resolveSourceRegistry ── JSON Runtime Sources

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

The extension page memoizes its descriptor-list request for the lifetime of the
page. LiveCard loads therefore reuse the same descriptors instead of listing,
serializing, and sorting the complete registry for every request. A failed
descriptor request clears the memoized promise so a later request can retry.
The app's board route also primes the descriptor query with
`ensureQueryData` before rendering LiveCards. Descriptor query options are shared
between the route and React consumers and run independently of network status.
The underlying descriptor-list request remains memoized for the page lifetime
because the bundled registry cannot change without an extension reload.

Static source presentation remains nested as
`RuntimeSource.metadata: SourcePresentationMetadata`. Runtime resolution
normalizes `metadata.home` and `metadata.badge` but does not flatten presentation
fields onto the operational source object. Public `SourceDescriptor` and
extension `BoardSource` preserve the same nested shape, so static metadata,
instance patches, and loader results share one merge boundary.

Registry parsing validates the entire JSON wire format before resolving entries.
Every registry entry owns its structured JSON, HTML, or RSS loader; missing or
custom executable loaders are rejected. TypeScript Sources bypass the JSON
registry parser because provider expansion already resolves their complete
trusted runtime definition. Their JavaScript Radar parameter values remain
available to the background Radar service.
Public descriptors strip those functions before extension messaging; the Radar
popup asks the background service to execute matching functions in the active
tab and receives only serializable suggestions.

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
        ├─ build a TanStack query key from source ID, version, and normalized parameters
        ├─ restore the persisted Query state when available
        ├─ skip a user-triggered request during the one-minute protection interval
        ├─ resolve required secrets in the background
        ├─ execute the source loader
        ├─ validate the result, every NewsItem, item template, and response metadata
        ├─ reject an empty or malformed item result
        ├─ publish and persist the complete successful Query state
        └─ infer the LiveCard presentation from effective item times and order in the UI
```

In-flight loads are deduplicated by TanStack Query using a key containing the
source ID, Source version, and normalized parameters. Source query keys and complete options are
created together so React observers, imperative Fetch Latest calls, and future
prefetch consumers share the same identity and lifecycle policy. Both
individual LiveCard and board-wide user refreshes execute enabled TanStack queries
that fetch the latest source data; disabled and unmounted queries are not
fetched implicitly. Automatic revalidation follows TanStack freshness, while
Fetch Latest is a separate user intent that bypasses freshness for active queries.
A protected Fetch Latest returns the current Query data without executing its
query function or changing `dataUpdatedAt`, and keeps UI feedback visible for a
minimum 500ms. App query timing and the Source request protection interval are centralized in
`apps/extension/src/lib/source/query-policy.ts`.

TanStack's per-query persister serializes each successful Source Query state under
its query hash in a Dexie-backed IndexedDB key-value table. Restoring a state
preserves its original `dataUpdatedAt`, so memory and persistent storage share
one freshness clock. TanStack remains the owner of cached data,
freshness, and in-flight deduplication; IndexedDB is only its
durable storage adapter. Persisted entries expire after 30 days. Increasing the
Source version changes the query identity immediately, while old versions age
out independently. Cache failures remain fail-open and never prevent Source
execution.

Source history is stored separately from this result cache in the local
Turso database owned by the desktop daemon. Now Layer cache hits and remote
refreshes never create observations. The first explicit retention entry point
is `newsnext run --retain`: the extension executes and normalizes the Source,
then the daemon commits the returned items and metadata. The database receives
no Source credentials, fetch response bodies, or browser session state.

A dataset is the unique pair of Source ID and canonical normalized parameter
JSON. Each dataset receives an opaque UUID exposed by `history datasets` and
used by the other history commands. Source version remains observation
metadata rather than part of dataset identity, preserving continuity while
making version boundaries inspectable.

Account-scoped Sources include an explicit, non-secret `identity` parameter in
that normalized JSON. Radar obtains it from the active browser tab using a
JavaScript parameter function before creation persists the ordinary parameter.
After fetching personalized content, the loader independently resolves the
user actually represented by the request in the same canonical representation
as Radar and rejects a mismatch. Resolution reuses the content response or a
stable, non-secret identifier already available to that request rather than
issuing an identity-only request. Raw credentials never enter params. A Source
without such an identifier remains unbound. The loader result does not expose
the identifier; its persisted role remains dataset separation. An empty
identifier represents an unbound legacy Instance and bypasses identity
resolution and comparison.

The schema normalizes retained values into `history_datasets`,
`history_observations`, provider-scoped `history_items`, content-addressed
`history_revisions`, and ordered `history_observation_items`. A revision UUID is
derived from provider ID, exact URL, and canonical item JSON, so Sources and
parameter sets under the same provider reuse unchanged item values. Observation
position remains dataset-specific and one-based. Timeline versus ranking
semantics are inferred from the normalized item order using the same timestamp
rule as presentation code.

The daemon owns one Turso engine and one mutex-protected write connection.
Migrations run before IPC begins accepting clients. Retention uses an immediate
transaction that creates or reuses the dataset and revisions, inserts the
observation and ordered item links, and updates dataset counters atomically.
Read operations open independent bounded-wait connections and use keyset
pagination. A dropped or failed transaction rolls back instead of exposing a
partial observation.

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

The daemon-backed CLI exposes these repository operations as four read-only
commands: `newsnext history datasets`, `newsnext history observations`,
`newsnext history get`, and `newsnext history compare`. Dataset discovery does
not require a connected extension. Source execution and new retention still
require the extension because the daemon never receives browser authority or
credentials.

The same transport exposes canonical application and runtime control through
`newsnext action list` and `newsnext action execute`. Catalog listing returns
stable names, `mutation`, `query`, or `command` kinds, descriptions, and JSON
input/output schemas. Execute requests carry a name and JSON object; the
extension resolves one `defineAction` registration, validates that object with
its TypeBox parameter schema, and invokes the same handler used by the typed UI
Action Client. The published JSON schemas are the TypeBox schemas themselves,
not separately maintained projections. Agent
Source discovery and frontend Source picker discovery both execute
`source.list` through this boundary; there is no parallel Registry or Native
listing service. Native and frontend Action writes enter the same background
queue, are normalized and
persisted to `browser.storage.local`, and propagate to open extension pages
through read-only storage subscriptions. Bulk import and reset use the same
queued background repository replacement rather than setting frontend atoms.
Composite Board create/update and NowLayer manual-order Actions apply
their changes to one in-memory envelope and perform one storage write. The
manual-order Action requires every Board Instance exactly once.

Board `instanceIds` store membership in recently-added-first order. The
NowLayer renders every member even when its Source is no longer in the current
registry. A successful Source load caches the result together with the Source
provider, static metadata, parameter schema, capabilities, and version. An
unavailable Instance therefore renders from its cached presentation snapshot,
or from a generic `sourceId` fallback when no cache remains. It stays in drag
ordering and cannot be silently removed by saving a visible subset.
Action transports return only compact receipts; the updated envelope reaches
each frontend through its own subscription state rather than a duplicate proxy
payload.
The Application Data mirror never initializes or normalizes browser storage
from a frontend page; the background runtime is the only persistent writer.
`board.getContext` resolves the current Board identity, while
`nowLayer.getLiveCards` returns every LiveCard logically displayed by that
Board with its Instance and membership identities, independent of registry
availability.

Requests travel through the same per-user local IPC connection as source authoring
commands and return JSON. The extension validates every request before
dispatch. Enabling CLI access authorizes the local NewsNext CLI to mutate
Boards and Instances, including destructive Actions; it does not grant
web content or arbitrary processes direct extension access. History reads do
not enter the extension: the companion daemon queries its own Turso database by
the opaque dataset IDs returned from `history datasets`. Only an explicit
`source.run` request with `retain: true` crosses the extension boundary before
the daemon commits the normalized result. Board and Instance queries still
execute in the extension background and read the Application Data envelope from
`browser.storage.local` because frontend Jotai atoms are unavailable there.

The Rust CLI daemon owns the local-socket framed-JSON control listener. Shutdown
closes connected Native Messaging bridges, fails pending commands, removes any
filesystem-backed socket endpoint, and exits the detached process. Startup also
reclaims a stale filesystem socket left by an ungraceful previous exit, but it
does not replace a non-socket file at that path.

LiveCard queries mount when their container enters the preload margin of the app's
root scroll container. The observer must use that scrolling element as its root;
using the browser viewport lets the overflow container clip LiveCards before the
viewport root margin is applied and effectively disables preloading. After a
LiveCard leaves that margin, its query remains active for one minute to avoid churn
during short scrolls, then unmounts. Re-entering during that interval cancels
the pending unmount. Successful query data remains fresh in memory for two
minutes; this avoids redundant loader and persistent-cache reads during that
window. Regaining focus or remounting can revalidate
stale queries. Active LiveCard queries also revalidate once every five minutes,
but interval revalidation is skipped while the app is in the background.
Inactive query data follows TanStack Query's default garbage-collection policy
and remains independently available through the per-query persister. Source
queries use offline-first network mode. An active Source Query restores lazily
when first used. Search explicitly restores persisted Source queries when it
opens because its disabled observers must never start Source execution. Stale
restored queries follow the same focus, remount, and interval revalidation
policy as queries produced in the current session.
The Now Layer requests one rerender after its bulk persisted-query restoration
completes so unavailable Sources can resolve their cached presentation snapshot.
It does not subscribe the Board projection to ongoing Query Cache events; active
LiveCards own their query updates locally. When a query-key change temporarily
displays placeholder data, the LiveCard preserves that result's last successful
`dataUpdatedAt` instead of replacing it with the component mount time.

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

Instance-facing consumers resolve `instanceId` through the saved Instance and
active Source descriptor before accessing stored results. The resulting target
contains `sourceId`, Source version, and normalized effective parameters. Both persistent Cache
reads and History reads consume this target, so default parameters cannot make
the two stores address different data. The Instance remains the Board and
Widget reference; the resolved Source target remains the execution and storage
identity.

Next Layer does not read the Now Layer TanStack cache. Its future Widgets display
persisted results produced through the CLI and daemon by Agent-owned asynchronous
tasks. A task may refresh selected Sources, consume retained History inputs,
process them, and save a provenance-bearing result.
Opening Next Layer must not repeat Agent-owned refresh or processing, mount
offscreen LiveCards, or start Source execution solely to populate the presentation.

Loader metadata is response-scoped and remains part of the cached load result.
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
loader metadata directly from their active source query. Search subscribes to
the same normalized source query keys with disabled observers, so an existing
loader result can update searchable titles and result labels without starting
loads merely because the Search dialog opened. Search restores persisted Source
queries when its content mounts with their original TanStack `dataUpdatedAt`, so
stale presentation data cannot become artificially fresh or suppress normal
LiveCard revalidation. Until a loader has published and cached its
first successful result, Search follows the normal static, instance, and
provider-title fallback behavior.

Loader metadata reuses responses already required to produce the items. Source
loaders must not issue profile, community, channel, batch, or other companion
requests only to enrich metadata. If the required item requests do not expose a
field, authoring falls back to static or page-derived Radar metadata instead.

The background and source runtime do not send a declared LiveCard type. They
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
compact LiveCard row and may access only `scope.item`, but shared stats are excluded
because the frontend renders them consistently as icon-and-count pairs. It
travels with cached and transported loader results, while history snapshots continue to store only the
items so presentation changes do not become historical fact changes. The UI
uses a deterministic author/attribute fallback when no template exists.
Source-specific templates omit facts already conveyed by the Instance,
while those facts remain on the item for history and analysis.
The default inline composer also omits the author name when an
`icon.kind: "author"` picture is present. Explicit source templates follow the
same rule and fall back to the name when that semantic icon is absent.
Semantic pictures carry only `src`, optional `kind`, and optional `label`;
frontend components own their uniform height, intrinsic width, crop, and corner
treatment. Content pictures remain URL strings rather than presentation
objects.
The LiveCard presentation layer scans the first mark from each Instance for
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
The semantic item migration advances the default Source version to `2`;
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
Radar renders in the extension action popup.

Badge updates use a URL-only match to advertise possible suggestions; they do
not claim that page extraction has completed. The action popup performs the
authorized page extraction and receives each resolved suggestion together with
its exact serializable Source descriptor in one response. It never follows a
completed scan with a separate complete-registry request before rendering the
LiveCard.

Successful full-scan responses are cached in background memory for 15 seconds
by tab ID, URL, and title. This reuses both concurrent requests and a result
when the short-lived action popup is immediately reopened. A changed URL or
title bypasses the entry, failures remove it, and expiration deliberately
allows same-URL page state to be extracted again. The cache never persists
page-derived values or extends beyond the Manifest V3 service worker lifetime.

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
Accepting a Radar suggestion creates one Instance and adds it to one or more
Boards. The Instance owns its Source ID and patch; each Board owns its
membership. New Instance IDs combine the Source ID and a
12-character Nano ID with `::`;
Board IDs, including the initial `My Board`, use the Nano ID directly. Both
remain opaque strings.
Moving a LiveCard updates only Board membership; Source parameters,
presentation metadata, and cache identity remain unchanged. Every Instance has
at least one Board membership. First-run data contains one
ordinary Board named `My Board`; it can be renamed or deleted after another
Board exists, and all Board routes resolve real Board IDs.
The LiveCard editor writes the same instance patch shape and exposes every declared
source parameter plus each editable source-owned presentation metadata field.
The inferred LiveCard presentation is read-only. Provider
title, icon, color, and category remain read-only. Editing preserves patches as
sparse overrides: only explicitly changed parameter and metadata fields are
persisted. Parameter defaults are resolved for display and loading, while
inherited source metadata is resolved for display, without copying either into
the instance patch.

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

`newsnext run` sends a request through the local daemon to a connected
extension. The extension executes the same provider expansion, parameter
normalization, registry validation, capabilities, secrets, and background loader
path as normal source loading. For CLI runs only, the background fetch wrapper
clones each response before the loader consumes it and returns request metadata
and duration plus the response status, headers, and text body alongside the
complete loader result, normalized parameters, and execution timing. Normal
extension source loads do not pay this capture cost.

`newsnext fetch` uses the same command transport and shared source fetch
infrastructure in the extension background, including browser credentials and
per-host request scheduling. It disables source retries and HTTP status errors
so the command preserves the requested one-shot raw response. It returns the
status, response headers, and decoded text body to the CLI. The command accepts
HTTP(S) URLs without embedded credentials and never serializes browser cookies
into the command or response. Browser host permissions still govern access. If
the exact target has not been granted, the extension opens a dedicated approval
window and waits for the user to authorize that origin before continuing. The
same approval flow runs before `source.run` when the resolved Source and params
require permissions that are not already granted. Request headers remain subject
to the browser Fetch API's forbidden-header rules. The CLI execution timeout
also aborts the browser-side network request.

The CLI runtime is built and distributed from the separate private NewsNext App
repository. It is intentionally not part of this open-source workspace. One
executable provides CLI control commands, the long-lived daemon and tray icon,
and the short-lived Native Messaging host mode. The browser starts one host
process per `runtime.connectNative()` port. That process only translates the
browser's length-prefixed stdio messages to the daemon's per-user local IPC; it
does not own daemon state. This separation preserves one daemon and one tray
icon across multiple browsers and profiles.

Rust `serde` enums in the private App repository are the canonical wire
contract. Their released `ts-rs` projections are checked into
`packages/extension-connection/src/generated`; do not edit those files manually.
Browser runtime code imports protocol types and validation from the browser-safe
`@newsnext/extension-connection` package.
Extension messages carry an explicit protocol version. The daemon associates
commands and completions by request ID, rejects
ambiguous browser selection, expires pending executions, and never replays a
command after reconnection because source execution is not guaranteed to be
idempotent. Settings exposes the daemon version as connection metadata only.
Protocol version 2 added canonical Application Action and Query discovery and
execution. Protocol version 3 adds the `app.open` command used by the desktop
tray. The command is routed to an exact connected extension instance, which
opens its own packaged `app.html` URL through the browser tabs API. An existing
NewsNext app tab is navigated to the requested Board and focused; a new tab is
created only when none exists. Incompatible daemon and extension versions
disconnect instead of silently accepting a partial control surface. Protocol
version 4 makes History daemon-owned and adds the explicit `retain` flag to
`source.run`. Protocol version 5 publishes each
connected extension's Board summaries to the menu-bar app, keeps them current
after Board changes, and makes `app.open` target an explicit Board route. The
same Action can open the extension Settings dialog without changing the Native
Messaging transport; CLI and menu-bar entry points target its CLI connection
tab.
Protocol version 6 replaces the parallel Application Action, Application Query,
open, fetch, and Source-run request variants with one `action.list` and
`action.execute` transport. The catalog classifies every capability as a
Mutation, Query, or Command; existing `run`, `fetch`, and `open` CLI commands are
convenience frontends over their canonical Actions.

Native Messaging registration is the browser-facing security boundary.
Development and production use distinct host identities so their executables
and extension permissions cannot overwrite or authorize each other. A regular
CLI executable registers `app.newsnext.host.dev` for the development Chromium
ID or `dev@newsnext.app` Firefox ID. An executable inside the packaged app
registers `app.newsnext.host` for the Chrome Web Store ID or the stable
`addon@newsnext.app` Firefox ID. The extension selects the matching host from
its WXT build mode. Chrome, Chromium, Edge, and Firefox are supported across
desktop platforms. Ego Lite, Dia, and Arc use their dedicated Chromium
user-data roots and are currently registered on macOS only.
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
local application-data location. Development CLI processes use
`com.newsnext.daemon.dev`, while packaged app processes use
`com.newsnext.daemon`, preventing a correctly bound Native Messaging host from
crossing into the other environment's daemon. `NEWSNEXT_IPC_NAME` can override
the name for isolated test runs. Both sides verify Unix peer credentials before
exchanging protocol messages. Windows named pipes retain the access control
derived from the creating user's process token. Filesystem-backed Unix sockets
are removed during normal shutdown and reclaimed on the next startup after an
ungraceful exit.

The Rust CLI implements daemon lifecycle and tray status plus the `run`,
`fetch`, `action`, and `history` commands and command families. All
extension-backed commands use the same typed execute/result IPC path. `run`
supports registered sources, provider files, standard input, parameter
overrides, provider-secret selection, compact output, verbose remote errors,
watch mode, and explicit retention through `--retain`.

The same Rust executable is packaged as the NewsNext desktop companion. A
normal CLI invocation continues through Clap, while launching the executable
without arguments from a macOS application bundle starts the tray daemon
directly. The bundle is a background application, so macOS exposes it through
the menu bar without adding a Dock icon. The tray keeps an icon-only menu bar
presence; its tooltip and menu actions use `NewsNext Dev` for a CLI daemon and
`NewsNext` for the packaged app so both can run without becoming ambiguous.
Packaging preserves one executable for the CLI, daemon, tray, and Native
Messaging host rather than introducing a second runtime or protocol boundary.
On bundle launch, existing production
Native Messaging registrations are repaired to reference the executable at the
current bundle location. Development registrations use a separate manifest and
remain untouched. Registration state validates the executable recorded in the
environment-specific manifest, so moving or upgrading the app cannot leave a
stale registration reported as active. Browsers without an existing production
registration remain disabled. App developers register the stable debug
executable with `newsnext install-native-host`.

The Native Host replaces the extension build target with the launching parent
process executable name when it is available. The name remains unchanged except
that Windows strips a trailing `.exe`. This keeps Chromium derivatives distinct
while retaining the build target as a cross-platform fallback. The extension
persists a generated connection instance ID in profile-local storage so the tray
identity remains stable across Manifest V3 service-worker restarts. Chrome does
not expose its local profile display name to extensions, so the connection does
not claim to identify it or request account identity permissions as a substitute.

The tray exposes Open NewsNext only while an extension is connected. Every
connected instance has one menu containing its Boards and a separated Settings
action. With multiple connections, those instance menus are grouped and sorted
by browser and instance ID. Each instance displays the detected browser and a
short unique instance ID, and targets the exact instance rather than using the
CLI's potentially ambiguous browser-name selector.

Local provider runs use an isolated `cli:<provider-id>` secret namespace unless
`--use-provider-secrets` is supplied. CLI execution does not install the
provider, change the bundled registry, populate the normal source cache, or
grant additional browser permissions. It does use the same loader-result
validation as registered extension app loads.

This is why direct HTTP requests are useful for investigation but are not a
substitute for extension-backed source verification.

Source-history commands read the daemon-owned Turso repository directly.
Dataset discovery accepts source and provider filters plus opaque pagination
cursors and returns an opaque dataset ID. Observation listing accepts that ID,
time bounds, and timestamp pagination. Exact reads and comparisons require the
same dataset ID plus observation timestamps returned by the listing command.
CLI history access is read-only and preserves completeness warnings.
