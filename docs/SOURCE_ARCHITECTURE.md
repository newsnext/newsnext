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
`example:latest`. It contains serializable provider identity, expanded source
configuration, structured loaders, and resolved capabilities.

`loaders.ts` contains the executable loader map for TypeScript providers. The
registry entry for such a source omits its loader function; at runtime the
generated map restores it by complete source ID.

The build follows this sequence:

```text
provider files
    │
    ├─ validate provider and source IDs
    ├─ apply provider and base defaults
    ├─ materialize derived metadata and capabilities
    ├─ flatten providers to complete source IDs
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
2. applies source values over provider defaults and base defaults;
3. recursively fills missing object properties;
4. replaces inherited arrays with source arrays;
5. recursively merges `vars`, with source values taking precedence;
6. derives a favicon from the final `metadata.home` when no icon exists;
7. validates the complete source.

The base defaults currently set `metadata.category` to `others`. Other required
values, including cache policy, color, and loader, must come from the provider
or source.

Provider identity remains separate from source metadata:

```ts
provider: {
  title: "Example",
}
```

This prevents a source override from changing the identity shared by its
provider.

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
        ├─ normalize NewsItem[] to SourceLoaderResult
        └─ cache items and dynamic title, description, and badge metadata
```

In-flight loads are deduplicated by cache key. The key includes the source ID,
cache version, and normalized parameters. A forced refresh bypasses stored
cache data but still participates in in-flight deduplication.

Loader metadata is response-scoped and remains part of the cached load result.
While displayed, it overrides the source title, description, and badge without
persisting those response-derived values into the saved source instance.
Before the first successful load, the card continues to use static or Radar
metadata. Loader metadata cannot satisfy the required Radar title for a
parameterized source instance and does not replace discovery-time
configuration.

The extension prefers background execution so loaders can use extension host
permissions, cookie and local-storage secrets, and request rules. The direct
in-context path exists for environments without a background client.

## Parameter and request pipeline

Parameters use one deterministic pipeline:

```text
raw value or default
    → trim strings
    → parameter Liquid template
    → type coercion
    → schema validation
```

After every parameter is resolved, structured loaders render their URL and
nested `fetchOptions`. Network capabilities are checked against the final URL,
immediately before the request is sent.

Custom loaders receive already-normalized parameters. The source runtime cannot
infer their requests, so custom loader capabilities must be declared.

## Structured loader pipelines

JSON loaders:

```text
request
    → parse JSON response
    → select items with JMESPath
    → select each field with JMESPath
    → render field Liquid templates
    → normalize and validate NewsItem values
```

HTML loaders:

```text
request
    → decode and parse document
    → select and filter item roots
    → traverse and select every field
    → extract text, attribute, or HTML
    → render field Liquid templates
    → normalize and validate NewsItem values
```

All fields are extracted before field templates render. Each template sees the
complete pre-template item, which makes output independent of declaration order
and prevents template cycles.

RSS loaders parse the feed and map entries directly to title, URL, and an
optional timestamp.

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
    → host, path, and substring matching
    → render parameter patches
    → normalize and validate parameters
    → batch page-field extraction
    → render metadata patches
    → order suggestions by confidence
```

Page-field queries required by matching rules are deduplicated and executed in
one active-tab script. Field extraction is isolated from template rendering;
page scripts are not executed and the document object is never exposed to
Liquid.

Rules and compiled matchers are cached. Optional Radar failures are reported as
diagnostics and fail closed instead of interrupting the surrounding UI.

## Capabilities, secrets, and request rules

Capabilities describe effects a source may perform:

- `network` controls permitted HTTP and HTTPS hostnames;
- `cookies` identifies origins used by cookie-backed secrets;
- `browser` controls browser features such as history or bookmarks.

Structured loaders infer a static URL hostname and merge it with explicit
capabilities. Dynamic URLs are checked after template rendering. Custom loaders
must declare all effects because their behavior cannot be inspected.

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
- bounded HTML item selection and extracted values;
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
grant additional browser permissions.

This is why direct HTTP requests are useful for investigation but are not a
substitute for extension-backed source verification.
