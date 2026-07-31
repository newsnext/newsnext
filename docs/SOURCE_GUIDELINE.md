# Source Authoring Guide

This is the canonical reference for adding and maintaining NewsNext sources.
For registry generation, runtime resolution, execution, and security internals,
see the [source architecture](SOURCE_ARCHITECTURE.md).

## Quick start

Add providers under `packages/registry/src`:

- Use JSON for declarative JSON, HTML, and RSS loaders.
- Use TypeScript for custom loaders, browser APIs, imported helpers, or computed
  configuration.
- A top-level filename, or the parent directory of a nested `index.ts`, becomes
  the provider ID.
- Source IDs have the form `<provider>:<source>`.

Do not define the same source ID in both JSON and TypeScript. Do not edit
`packages/registry/registry.json` or `packages/registry/loaders.ts`; they are
generated.

Minimal TypeScript provider:

```ts
import type { ProviderConfig } from "@newsnext/source/registry"

export default {
  title: "Example",
  color: "blue",
  defaults: {
    baseUrl: "https://example.com/",
    cache: "5m",
    metadata: {
      home: "/",
    },
  },
  sources: {
    latest: {
      metadata: {
        title: "Latest",
      },
      loader: {
        type: "json",
        url: "/articles",
        items: "data.items",
        fields: {
          title: "title",
          url: "url",
        },
      },
    },
  },
} satisfies ProviderConfig
```

JSON providers use the same shape without the import or `satisfies` expression.

Build generated registry artifacts after a change:

```sh
bun --filter=@newsnext/registry run build
```

## Provider and source configuration

A provider has `title`, `color`, optional `icon` and `category`, `defaults`, and
`sources`. `title`, `icon`, `color`, and `category` describe the provider and
cannot be set or overridden by individual sources, Radar rules, or card
instances. Every source descriptor receives the provider's `icon` and `color`.

`defaults` may contain `baseUrl`, `cache`, `capabilities`, `loader`, `metadata`,
`vars`, `params`, `radar`, `requestRules`, and `secrets`. Defaults recursively
fill missing object properties. Source values win, and source arrays replace
default arrays.

Set `baseUrl` when URLs in a source share one stable origin or directory:

```ts
defaults: {
  baseUrl: "https://example.com/",
  metadata: {
    home: "/latest",
    badge: "/account.png",
  },
  loader: {
    type: "json",
    url: "/api/articles",
    fields: {
      title: "title",
      url: "path",
    },
  },
}
```

`baseUrl` must be a static, absolute HTTP(S) URL without credentials. It is
inherited like other defaults and uses standard URL resolution: `/items` starts
at the origin root, while `items` is relative to the base URL's directory. Keep
a trailing slash when the base represents a directory.

When `baseUrl` is present, NewsNext resolves the structured loader request URL,
static, Radar, and response `home` and `badge` metadata, and
URL-bearing `NewsItem` values. These item values include `url`, `mobileUrl`,
image `src` and `href` values, inline icons, preview pictures, and preview
iframes. The same result normalization applies to RSS and custom loaders.
Absolute and protocol-relative URLs continue to work.

NewsNext does not rewrite URLs embedded inside `inline.html`, `preview.html`, or
arbitrary text. Use `absolute_url` there, or when a value must resolve against a
different base. A source that talks to multiple origins should keep secondary
request URLs absolute and declare any capabilities that cannot be inferred.

Source metadata supports:

```ts
metadata: {
  title: "Latest",
  badge: "https://example.com/account.png",
  desc: "Example news",
  home: "https://example.com/latest",
}
```

Static source metadata must describe the source definition and remain correct
for every valid parameter value. Do not put a concrete user, channel, feed,
community, playlist, ranking, or other instance identity into static `title`,
`badge`, `desc`, or `home`, even when it matches the parameter default. Use a
generic static fallback such as `User Posts`, `Channel`, or `Playlist`.
Resolve the concrete identity through Radar metadata or loader metadata from a
request already required to load the items. Parameter-dependent home URLs
belong at the same instance-aware layer; omit the static home when no useful
parameter-independent URL exists.

Provider categories are `social` (social platforms), `forum` (forums), `news`
(news and readers), `finance` (finance), `developer` (developer platforms), and
`entertainment` (entertainment). Set `category` at the top level when the
provider belongs to one of them. Omitting it leaves the provider unclassified.

### Provider category taxonomy

Category describes the provider's primary product and content experience. It
does not describe an individual source, a temporary topic, the provider's
country, or the loader implementation. Every source under one provider inherits
the same category.

Use the following matching rules:

| Category | Match when the provider's primary value is | Current examples |
| --- | --- | --- |
| `social` | Identity-based publishing, following, channels, or creator feeds | X, Weibo, Telegram, Jike, Bilibili |
| `forum` | Topic-based discussion organized around threads, replies, or Q&A | Reddit, Linux.do, V2EX, Hacker News, Tieba, Zhihu |
| `news` | Editorial reporting, news aggregation, or feed subscription and reading | 36Kr, AIHot, Folo, NewsNow, Zaobao |
| `finance` | Financial markets, investing, or finance-specialist reporting and data | CLS, Xueqiu |
| `developer` | Software development, code collaboration, or developer workflows | GitHub |
| `entertainment` | Music, video, games, or other media discovery and playback | NetEase Cloud Music |

When a provider could match more than one category, classify its dominant user
experience rather than isolated features:

1. Prefer a specialist workflow such as `finance` or `developer` over a generic
   feed or social feature.
2. Prefer `forum` when threads and replies are the main content structure, even
   if the provider also aggregates links.
3. Prefer `social` when following identities, creators, or channels is the main
   experience, even if most posts contain video or news.
4. Use `news` for editorial, aggregation, and reader products where consuming
   information is primary.
5. Use `entertainment` for media catalogs whose primary experience is discovery
   or playback rather than creator-following.

For example, Hacker News is `forum` because discussion threads distinguish it
from a news reader. Folo is `news` because the content experience matters more
than its implementation as a reading tool. Xueqiu is `finance` because its
specialist domain takes precedence over its social features.

Leave `category` unset when no category clearly matches. Do not use `others` as
a placeholder and do not create a category named after one provider.

Create a new category only when it represents a stable product class, has a
clear boundary from existing categories, and is expected to apply beyond a
single source configuration. Category IDs must be lowercase English nouns,
remain concise, and use kebab-case only when multiple words are necessary. Add
the ID to `CATEGORY_IDS` in `packages/source/src/types/source.ts`, document its
matching rule and examples here, update affected providers, rebuild the
registry, and run type-checking and tests.

Do not declare a source presentation type. Loaders return items in their
meaningful display order. The extension presents the result as a timeline only
when every item has a finite timestamp and the items are already ordered from
newest to oldest; otherwise it presents the result as a ranking. An empty
loader result is rejected as a load error.

JSON and HTML loaders preserve the selected item order. Express any intentional
ordering in the upstream request, the JSON `items` JMESPath expression, or
custom loader code. In particular, keep ranked or popularity-based results in
their upstream order even when every item includes a timestamp.

Write human-facing strings in the website's primary interface language. Keep
brand names, IDs, parameter keys and values, and selectors unchanged.

Leave provider `icon` unset when it would point to a third-party favicon
service. The extension derives the favicon URL from each source's
`metadata.home` at render time using the user's selected icon source and URL
template. Set `icon` only for a stable first-party image or an embedded standard
`data:image/...` URL; use the `data:` scheme without `//` and percent-encode SVG
markup. Choose one provider `color` from the shared color palette. Use
`metadata.badge` for instance-specific identity such as a channel or user
avatar. Source metadata is static and must not contain Liquid; use a Radar
metadata patch for dynamic values. Defining `icon` or `color` in source
metadata is invalid.

## Parameters

Supported types are `text`, `url`, `number`, `switch`, `select`, and
`multiselect`:

```ts
params: {
  topic: {
    type: "text",
    title: "Topic",
    default: "technology",
  },
  page: {
    type: "number",
    title: "Page",
    default: 1,
    min: 1,
    max: 10,
  },
  mode: {
    type: "select",
    title: "Mode",
    values: [
      { label: "Latest", value: "latest" },
      { label: "Popular", value: "popular" },
    ],
    default: "latest",
  },
}
```

Parameters also support `description`. All string inputs are trimmed before
type coercion and validation. Parameters do not perform arbitrary string
validation or Liquid transformation. Normalize and reject discovered values in
the Radar parameter patch, and use structured parameter types for
user-selectable constraints.

Prefer one source with a `select` parameter when feed variants share their
loader and presentation and differ only by a request value. Separate sources
remain appropriate when variants need different static metadata.
Use a separate source when one variant needs additional parameters that do not
apply to the others, such as a ranked feed with its own time window.
Do not expose a variant parameter when the source intentionally promises one
fixed feed semantic, such as latest posts. Keep that request value in the
loader so every card follows the source contract.

## Liquid templates

Liquid is available only in schema fields documented as template slots:

| Slot | Available values |
| --- | --- |
| Loader URL and `fetchOptions` | `source.vars`, `scope.params` |
| JSON field | `source.vars`, `scope.value`, `scope.item`, `scope.params`, `scope.index`, `scope.request.url`, `scope.response.json` |
| HTML field | `source.vars`, `scope.value`, `scope.item`, `scope.params`, `scope.index`, `scope.request.url` |
| Radar parameters | `source.vars`, `scope.path`, `scope.query`, `scope.hashQuery` |
| Radar metadata | Radar parameter values plus `scope.params` and `scope.page.title` |

Templates use strict variables and filters. Guard optional values:

```liquid
{{ scope.item.subtitle | default: "" }}
```

LiquidJS built-in filters are available. NewsNext adds:

| Filter | Purpose |
| --- | --- |
| `required` | Reject `null`, `undefined`, or an empty string |
| `url_path`, `url_query` | Encode one URL component |
| `normalize_whitespace` | Collapse whitespace |
| `normalize_lines[: spacing]` | Trim non-empty lines and join with 1–4 newlines |
| `first_line` | Return the first non-empty trimmed line |
| `absolute_url: base` | Resolve a URL against a base |
| `favicon_url` | Return the default favicon service URL |
| `css_url` | Extract the first `url(...)` from CSS |
| `date_to_ms` | Parse a date as milliseconds |
| `relative_date_to_ms[: timezone]` | Parse absolute or relative date text |
| `regex_extract: pattern, group` | Return a capture group or an empty string |
| `regex_replace: pattern, replacement` | Replace all matches |

Examples:

```liquid
{{ scope.value | absolute_url: scope.request.url }}
{{ scope.value | first_line | truncate: 160, "…" }}
{{ scope.value | relative_date_to_ms: "Asia/Shanghai" }}
```

Values inserted into `inline.html` and `preview.html` are HTML-escaped. File
access, raw output, and the `include`, `layout`, `liquid`, `raw`, and `render`
tags are unavailable.

Use serializable `vars` for constants and lookup tables:

```ts
vars: {
  endpoint: {
    latest: "items/latest",
    popular: "rankings/popular",
  },
},
loader: {
  type: "json",
  url: "https://api.example.com/{{ source.vars.endpoint[scope.params.mode] }}",
  // ...
}
```

## Requests

Loader URLs and nested `fetchOptions` strings may use Liquid:

```ts
loader: {
  type: "json",
  url: "/api/{{ scope.params.topic | url_path }}",
  fetchOptions: {
    method: "POST",
    headers: {
      authorization: "Bearer {{ scope.params.token }}",
    },
    body: {
      channel: "{{ scope.params.channel }}",
      pageSize: 30,
    },
  },
  // ...
}
```

Keep request options stable and minimal. Do not copy transient tokens, browser
client hints, priorities, or deployment-version headers from DevTools.

If an endpoint requires a protected `Referer` or `Origin`, declare a narrowly
scoped Manifest V3 request rule:

```ts
requestRules: [{
  action: {
    type: "modifyHeaders",
    requestHeaders: [{
      header: "Referer",
      operation: "set",
      value: "https://example.com/",
    }],
  },
  condition: {
    requestDomains: ["api.example.com"],
    resourceTypes: ["xmlhttprequest"],
  },
}]
```

`condition.requestDomains` is required and must be covered by
`capabilities.network`. The extension assigns rule IDs.

## JSON loader

Use JMESPath for item and field selection:

```ts
loader: {
  type: "json",
  url: "https://api.example.com/articles",
  items: "data.items[?enabled]",
  fields: {
    title: "title || name",
    url: {
      select: "id",
      template: "https://example.com/articles/{{ scope.value | url_path }}",
    },
    timestamp: {
      select: "published_at",
      template: "{{ scope.value | date_to_ms }}",
    },
  },
}
```

`items` runs against the full response. If omitted, the response itself must be
an array. A string field is a JMESPath expression evaluated against the current
item.

Use a field object when formatting is needed. Resolution order is:

```text
JMESPath select → Liquid template
```

If `select` is omitted, `scope.value` is the current item. JSON templates may
also read the full response from `scope.response.json`.

JMESPath can construct structured values:

```ts
inline: {
  mark: "card_label.icon && {src: card_label.icon, radius: `0`}",
}
```

Numbers, including `0`, are truthy in JMESPath. Compare numeric flags
explicitly:

```ts
items: "data.items[?is_ad != `1`]"
```

Map response-level display metadata with the same JMESPath field syntax:

```ts
metadata: {
  title: "result.name",
  desc: "result.description",
  badge: "result.avatar",
  home: "result.profileUrl",
}
```

JSON loader metadata is selected from the complete response.

## HTML loader

`items` is a CSS selector:

```ts
loader: {
  type: "html",
  url: "/news",
  items: ".article:not(.advertisement)",
  fields: {
    title: ".article__title",
    url: {
      select: ".article__title",
      attr: "href",
    },
  },
}
```

A string field selects the first matching element and returns trimmed text.
Object fields resolve in this order:

```text
scope/traverse → selector → attr/content extraction → Liquid template
```

All fields are extracted before templates run, so `scope.item` contains the
complete pre-template item and field order does not matter.

HTML loaders support the same dynamic metadata keys with document-level fields:

```ts
metadata: {
  title: "head > title",
  desc: {
    select: "meta[name='description']",
    attr: "content",
  },
  badge: {
    select: "link[rel='icon']",
    attr: "href",
  },
  home: {
    select: "link[rel='canonical']",
    attr: "href",
  },
}
```

Metadata selectors use the complete document as their root. All metadata fields
are extracted before their templates run, so `scope.item` contains the complete
pre-template metadata object.

Use a selector array for ordered fallbacks:

```ts
select: [".article-title", "h2 > a", "[data-role='title']"]
```

Use a selector list such as `".tag, .label"` when all alternatives belong to
one result set.

Fields are relative to the current item by default. Set `scope: "document"` for
page-level data. An omitted or empty `select` targets the current root.

Traversal is available for related elements:

```ts
traverse: [
  { type: "parent" },
  { type: "next", selector: ".metadata" },
]
```

Supported operations are `parent`, `closest`, `next`, `previous`, and
`siblings`; all except `parent` may include a selector.

Text is the default content mode. Other extraction options are:

```ts
{
  attr: "href",       // Takes precedence over content.
  content: "html",    // "text", "html", or "outerHtml".
  brSeparator: "\n",  // Text extraction only.
  all: true,          // Extract every match.
  separator: " · ",   // Join multiple matches.
}
```

Use HTML extraction only for `inline.html` or `preview.html`. With `baseUrl`,
URL-bearing result fields are resolved automatically. Use `absolute_url` for
embedded HTML URLs or values that need another base.

Set `decoding`, for example `"gb2312"`, for non-UTF-8 pages. Use `fetchOptions`
for standard requests and a custom `fetch` only for unusual request handling.

## RSS, custom loaders, and loader results

RSS needs only a URL:

```ts
loader: {
  type: "rss",
  url: "/feed.xml",
}
```

The RSS loader returns the RSS channel title, description, home link, and image
as dynamic loader metadata when present. For Atom, it returns the feed title,
subtitle, and non-self home link.

Use a custom loader only when declarative loaders cannot express the source:

```ts
loader: {
  type: "custom",
  load: async (params, context) => {
    const session = context?.secrets?.session
    // ...
    return items
  },
},
capabilities: {
  network: ["api.example.com"],
  cookies: [],
  browser: [],
}
```

A loader returns `NewsItem[]` or:

```ts
{
  items,
  metadata: {
    badge: response.user.avatarUrl,
    desc: response.description,
    home: response.profileUrl,
    title: response.name,
  },
}
```

Dynamic loader metadata always supports the complete source metadata shape:
`title`, `badge`, `desc`, and `home`. It is cached with the items and has the
highest display priority, overriding static metadata and persisted Radar or
card-instance patches field by field. It is unavailable until the first
successful request and is never persisted into the card instance. A loader
title may provide the effective title for a card created through Radar.

When authoring a source, prefer loader metadata when a request already required
to load the items returns the authoritative metadata. Loader metadata must
never increase the request count: do not add a profile, channel, community, or
other companion request only to obtain `title`, `badge`, `desc`, or `home`.
When the required item request does not contain a field, use stable static
metadata or a Radar metadata patch instead, or leave the optional field unset.

Every item needs a non-empty `title` and `url`. Common optional fields are
`mobileUrl`, `timestamp`, `inline`, and `preview`:

```ts
{
  title: "Example",
  url: "https://example.com/article",
  timestamp: 1767225600000,
  inline: {
    text: "Category",
    mark: "NEW",
  },
  preview: {
    text: "Summary",
    picture: "https://example.com/image.jpg",
  },
}
```

Timestamps are milliseconds. `inline` must contain at least one of `text`,
`html`, `mark`, or `icon`. `preview` uses either `text` or `html` and may also
contain `picture` or `iframe`.

Minimize request count as part of the source contract. When one listing request
can return both items and metadata, directly or through expansion, include, or
field-selection options, the loader must use that single request. Metadata
enrichment never justifies a companion request or batch request. Additional
requests are allowed only when they are required to produce the items
themselves. This is especially important for authenticated sources because
unnecessary API traffic can trigger rate limits, anti-abuse systems, or account
suspension.

## Cache, capabilities, and secrets

Cache duration supports seconds, minutes, hours, and days:

```ts
cache: "5m"
```

Use an explicit version to invalidate old results after a behavioral change:

```ts
cache: {
  version: 2,
  maxAge: "15m",
}
```

Structured loaders infer the hostname of a static URL. Declare every additional
or dynamically selected hostname:

```ts
capabilities: {
  network: ["api.example.com", "*.images.example.com"],
  cookies: [],
  browser: [],
}
```

Network entries may be an exact hostname, a wildcard subdomain, or `*`. Only
HTTP and HTTPS requests are accepted. Custom loaders must declare their
capabilities. Browser capabilities include `history`, `bookmarks`, and
`favicon`.

Secrets collect website values instead of hard-coding them:

```ts
secrets: [{
  key: "session",
  type: "cookie",
  origin: "https://account.example.com",
  itemKey: "session_id",
  required: true,
  cache: true,
}]
```

Secret types are `cookie` and `localStorage`. Put shared definitions in
provider defaults. Source arrays replace default arrays, so keep a secret in
one scope unless the source intentionally overrides the complete list.

Custom loaders receive values through `context.secrets` and may persist
refreshed values with `context.updateSecrets`.

NewsNext requests use the browser's logged-in session by default:
`sessionFetch` and the built-in structured loaders set
`credentials: "include"`.
Use `credentials: "omit"` only when a request must be explicitly anonymous.
Do not declare cookie secrets merely to authenticate a request; cookie secrets
are for reading a specific value that the loader must inspect.

When an API requires a cookie issued or refreshed by a page visit, a TypeScript
structured loader may use a custom `fetch` that first requests the bootstrap
page and then fetches the API. Both requests inherit the logged-in browser
session. Declare the bootstrap hostname as a network capability in addition to
the loader URL's inferred hostname; do not read cookies or construct a `Cookie`
header when the browser cookie jar is sufficient.

## Radar discovery

Radar detects a source from the active page:

```ts
radar: [{
  id: "example-topic",
  match: {
    hosts: ["example.com"],
    paths: ["/topics/:topic"],
  },
  patch: {
    params: {
      topic: "{{ scope.path.topic }}",
    },
    metadata: {
      title: "{{ scope.params.topic }}",
    },
  },
  confidence: 0.95,
}]
```

Each Radar suggestion previews one card. When the user creates it, they select
a destination board and the resolved parameter and presentation patches are
persisted as a new local card instance. Radar is the card-creation entry point;
it does not modify an existing card. A card can be moved to another board later
without changing its source configuration. Inbox is an aggregate view that
always shows every card and is not itself a card destination. Selecting
`Inbox only` leaves the card out of custom boards.

Match rules:

- `hosts` are lowercase and ignore a leading `www.`.
- A `paths` array is an include shorthand and uses `path-to-regexp` syntax.
- Use `paths.include` and `paths.exclude` when both are needed. Exclusions are
  checked before parameter patches are rendered.
- Entries inside `paths.include` or `paths.exclude` can use
  `{ regex: "/users/(?<username>[^/?#]+)$" }`. Named capture groups are exposed
  through `scope.path`. Regex entries match the complete URL, while string
  entries match only `URL.pathname`.
- Prefer an anchored regex for opaque numeric IDs when the same path position
  also accepts reserved words or prefixed IDs; this prevents one Radar rule
  from claiming aggregate or sibling resource routes.
- Omitting `paths`, or using an empty include array, matches every path on the
  listed hosts.
- Radar rule IDs must be unique within a source.

Map each parameter explicitly in `patch.params`. Values can read
`scope.path`, `scope.query`, `scope.hashQuery`, and `source.vars`. Missing
values fall back to parameter defaults; invalid values discard the suggestion.

`patch.metadata.title` is optional, including for parameterized sources. Omit it
when the item request already returns the authoritative title through loader
metadata. Before the first successful load, or when loading fails, the card
falls back to the static source title and then the provider title. Add a Radar
title only when the discovered page provides a better preview or fallback.

Radar resolves and validates parameters before metadata. Metadata strings can
then read `scope.params` and `scope.page.title`:

```ts
metadata: {
  title: "{{ scope.page.title }}",
  home: "https://example.com/topics/{{ scope.params.topic | url_path }}",
}
```

Use an HTML field object for metadata extracted from the active page:

```ts
metadata: {
  desc: {
    select: [".profile .bio", ".bio"],
    template: "{{ scope.value | normalize_whitespace }}",
  },
  badge: {
    select: ".profile img",
    attr: "src",
  },
}
```

Prefer a stable, unique semantic or structural selector for page metadata.
Parse `scope.page.title` only when the value is unavailable from the top-level
DOM, such as content rendered inside an iframe.

Radar metadata can override source-owned presentation fields: `title`, `badge`,
`desc`, and `home`. Radar metadata uses the same selector, traversal,
extraction, and template behavior as HTML loader fields. Provider-owned `icon`
and `color` are not valid Radar metadata fields.

When a source has no parameters or explicit `radar`, an HTTP(S)
`metadata.home` creates a same-host rule automatically. Set `radar: []` to opt
out. Parameterized sources need explicit rules.

Use `badge` for secondary instance identity. For signed or expiring images,
return loader metadata only when the item request already provides the URL.
Otherwise use page-derived Radar metadata rather than adding a loader request.

## Validation and verification

The registry build validates source IDs, provider and source metadata, base
URLs, templates, JMESPath, Radar fields, request rules, network capabilities,
and security limits. Prefer declarative loaders, keep selectors and expressions
bounded, and never rely on JavaScript execution from configuration.

Author-facing limits:

| Input | Limit |
| --- | --- |
| Runtime registry | 1,000 sources and 2 MiB serialized JSON |
| Source ID | 200 characters |
| Request rules | 10 per source |
| Request domains | 20 per rule |
| Header modifications | 5 per rule |
| JMESPath expression | 2,000 characters |
| HTML selected items | 2,000 per request |
| Radar metadata selector | 500 characters |
| Radar metadata attribute | 100 characters |
| Radar page extraction | 20,000 characters |
| Regex pattern/input | 500/20,000 characters |

Runtime registries accept declarative JSON, HTML, and RSS loaders only.
Prototype-related source ID segments and JMESPath properties are rejected.

Use the extension-backed CLI to validate live behavior. Enable
**Settings → General → CLI Connection**, then start the local server:

```sh
bun run newsnext start
bun run newsnext status
```

Run a registered source:

```sh
bun run newsnext source run github:trending
```

Run a local provider, optionally choosing a source and parameters:

```sh
bun run newsnext source run packages/registry/src/hackernews.json top
bun run newsnext source run packages/registry/src/telegram.json \
  --param channel=telegram
```

Useful options include `--params`, `--watch`, `--browser`, `--timeout`,
`--provider-id`, `--use-provider-secrets`, and `--verbose`. See the complete
list with:

```sh
bun run newsnext source run --help
```

Direct requests are useful for endpoint investigation, but they do not verify
parameter parsing, extension permissions, capability enforcement, secrets, or
the background runtime.

Before submitting:

- Prefer a stable structured API over HTML parsing.
- Prefer parameters over duplicate sources with the same output shape, unless
  variants have distinct discovery semantics and default identities.
- Use JMESPath and CSS selectors before writing a custom loader.
- Declare every possible network hostname.
- Use milliseconds for timestamps and text instead of HTML when possible.
- Add Radar rules for parameterized sources when appropriate.
- Regenerate registry artifacts.
- Validate the source through `newsnext source run`.
- Run `bun run typecheck`, `bun run test`, and `git diff --check`.
- Update this guide whenever source authoring behavior changes.
