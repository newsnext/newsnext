# Source Authoring Guide

This is the canonical reference for adding and maintaining NewsNext sources.
For registry generation, runtime resolution, execution, and security internals,
see the [source architecture](SOURCE_ARCHITECTURE.md).

## Quick start

Add providers under `registry/src`:

- Use JSON for declarative JSON, HTML, and RSS loaders.
- Use TypeScript for custom loaders, browser APIs, imported helpers, or computed
  configuration.
- A top-level filename, or the parent directory of a nested `index.ts`, becomes
  the provider ID.
- Source IDs have the form `<provider>:<source>`.

Do not split one provider between JSON and TypeScript files; a provider and all
of its Sources must use one format. Do not edit
`registry/registry.json` or `registry/sources.ts`; they are
generated. JSON providers are emitted only to `registry.json`; TypeScript
providers are emitted as complete executable Runtime Sources only to
`sources.ts`. This keeps JSON registry updates independent from TypeScript
Source versions.

Minimal TypeScript provider:

```ts
import type { ProviderConfig } from "@newsnext/source-kit/registry"

export default {
  title: "Example",
  color: "blue",
  defaults: {
    baseUrl: "https://example.com/",
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
cannot be set or overridden by individual sources, Radar rules, or LiveCard
instances. Every source descriptor receives the provider's `icon` and `color`.

`defaults` may contain `baseUrl`, `version`, `capabilities`, `loader`, `metadata`,
`vars`, `params`, `radar`, `requestRules`, and `secrets`. Defaults recursively
fill missing object properties. Source values win, and source arrays replace
default arrays.

Prefer streams whose membership follows an explicit user choice, such as
followed accounts, lists, or selected topics. Do not register opaque
personalized recommendation timelines whose contents can change independently
of the source parameters and the user's subscriptions.

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
`author.home`, `icon` and `mark` image values, and content pictures and
iframes. The same result normalization applies to RSS and custom loaders.
Absolute and protocol-relative URLs continue to work.

NewsNext does not rewrite URLs embedded inside `content.html` or arbitrary
text. Use `absolute_url` there, or when a value must resolve against a
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

Use ` | ` to separate an Instance identity or query from its selected variant,
such as `NewsNext | Latest`. Reserve compact separators such as `·` for inline
item attributes rather than Source or Instance titles.

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
| `forum` | Topic-based discussion organized around threads, replies, or Q&A | Reddit, Hacker News, Tieba, Zhihu |
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
the ID to `CATEGORY_IDS` in `packages/source-kit/src/types/source.ts`, document its
matching rule and examples here, update affected providers, rebuild the
registry, and run type-checking and tests.

Do not declare a source presentation type. Loaders return items in their
meaningful display order. The extension presents the result as a timeline only
when every item has a finite `publishedAt` and those values are ordered from
newest to oldest, or, when that check fails, every item has an equivalently
ordered finite `updatedAt`. Otherwise it presents the result as a ranking. An
empty loader result is rejected as a load error.

JSON and HTML loaders preserve the selected item order by default. When a page
groups chronological items instead of ordering them globally, opt into sorting
items from newest to oldest by `publishedAt`, falling back to `updatedAt` when
an item has no publication time:

```ts
sortByTimestamp: true
```

Items without either time remain last. Prefer upstream order for ranked or
popularity-based results even when every item includes a time. Other
intentional ordering belongs in the upstream request, the JSON `items` JMESPath
expression, or custom loader code.

The RSS loader preserves feed order and independently retains every parseable
publication and update time. RSS and Atom map `published`, `pubDate`, or
`created` to `publishedAt` and `updated` to `updatedAt`; JSON Feed maps
`date_published` and `date_modified`. Feed order still determines whether the
frontend treats the result as a ranking or timeline.

Write human-facing strings in the website's primary interface language. Keep
brand names, IDs, parameter keys and values, and selectors unchanged.

Leave provider `icon` unset when it would point to a third-party favicon
service. The extension derives the favicon URL from each source's
`metadata.home` at render time using the user's selected icon source and URL
template. Favicon.im is the default; Google, Vemetric, DuckDuckGo, and custom
templates are also available. Set `icon` only for a stable first-party image or
an embedded standard `data:image/...` URL; use the `data:` scheme without `//`
and percent-encode SVG markup. Choose one provider `color` from the shared
palette: `red`, `pink`, `fuchsia`, `purple`, `indigo`, `blue`, `cyan`, `teal`,
`green`, `amber`, `orange`, or `slate`. Use `metadata.badge` for
instance-specific identity such as a channel or user avatar. Source metadata is
static and must not contain Liquid; use a Radar metadata patch for dynamic
values. Defining `icon` or `color` in source metadata is invalid.

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
type coercion and validation. Add a serializable `validate` rule when a value
has a stricter string contract than its parameter type:

```ts
params: {
  userId: {
    type: "text",
    title: "User ID",
    default: "42",
    required: true,
    validate: { format: "digits" },
  },
  optionalFolderId: {
    type: "text",
    title: "Folder ID",
    default: "",
    validate: { format: "digits" },
  },
  keyword: {
    type: "text",
    title: "Keyword",
    default: "news",
    required: true,
  },
}
```

Set `required: true` when an empty value is invalid. Validation rules apply only
to non-empty values: `format: "digits"` handles decimal IDs, while bounded
`regex` handles uncommon site-specific contracts. Prefer a format and use regex
only when no structured format expresses the contract. Validation runs after
normal type coercion for defaults, user edits, CLI execution, loading, and Radar
patches. URL parameters accept only absolute HTTP(S) URLs, number parameters
require finite values in their declared range, switch inputs accept only boolean
or standard `0`/`1` forms, and select values must be declared options. Custom
loaders receive these normalized, validated values and should not repeat
single-parameter trimming or validation.

Validation rules are data rather than JavaScript functions because parameter
definitions cross the background-to-UI serialization boundary. The shared
`validateSourceParamValue` and `validateSourceParamPatch` helpers execute the
same rules wherever immediate validation feedback is needed. Parameter patches
are sparse: validation examines only keys explicitly present with a defined
non-null value. Missing, `undefined`, and `null` values do not fail `required`,
add defaults to the patch, or overwrite existing values. Empty strings, zero,
false, and arrays remain explicit overrides. Full Source execution applies
defaults and checks the resulting parameter record before invoking the loader.

Every value in a Radar `patch.params` object may be either its existing Liquid
string or a JavaScript function. The function runs in the matched browser tab
and may return a value or a Promise. Keep it closure-free because the browser
serializes the function for page execution:

```ts
patch: {
  params: {
    identity: () => globalThis.localStorage.getItem("userId"),
  },
},
```

The returned value follows normal defaults and parameter validation.

For a source whose results depend on the current signed-in user, expose an
`identity` text parameter and obtain it through the matching Radar rule's
parameter function. The value need not be a public account ID; it may be any
stable, non-secret value that uniquely separates users. Instance
creation stores the Radar result as an ordinary parameter, so instances,
caches, and retained History from different accounts do not share the same
normalized parameters. The loader must accept the parameter, determine the
actual account used by its content request, and throw when the configured
identity is empty or differs. Prefer an identity already present in the content response or the
credential used by that request; do not add a separate identity request. Radar
and the loader must return the same canonical identity. Never persist a raw
credential as the ordinary parameter. Do not return the identity in loader
metadata or items. If no stable, non-secret identity is available without an
extra request, do not use an account-scoped identity parameter.

Prefer one source with a `select` parameter when feed variants share their
loader and presentation and differ only by a request value. Separate sources
remain appropriate when variants need different static metadata.
Use a separate source when one variant needs additional parameters that do not
apply to the others, such as a ranked feed with its own time window.
Do not expose a variant parameter when the source intentionally promises one
fixed feed semantic, such as latest posts. Keep that request value in the
loader so every LiveCard follows the source contract.

## Liquid templates

Liquid is available only in schema fields documented as template slots:

| Slot | Available values |
| --- | --- |
| Loader URL and `fetchOptions` | `source.vars`, `scope.params` |
| JSON field | `source.vars`, `scope.value`, `scope.item`, `scope.params`, `scope.index`, `scope.request.url`, `scope.response.json` |
| HTML field | `source.vars`, `scope.value`, `scope.item`, `scope.params`, `scope.index`, `scope.request.url` |
| Radar parameters | `source.vars`, `scope.path`, `scope.query` |
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
| `compact_number` | Format a finite number with compact English notation |
| `parse_compact_number` | Parse a number with an optional `K`, `M`, `B`, or `T` suffix |
| `date_to_ms` | Parse a date as milliseconds |
| `relative_date_to_ms[: timezone]` | Parse absolute or relative date text |
| `regex_extract: pattern, group` | Return a capture group or an empty string |
| `regex_replace: pattern, replacement` | Replace all matches |

Examples:

```liquid
{{ scope.value | absolute_url: scope.request.url }}
{{ scope.value | first_line | truncate: 160, "…" }}
{{ scope.value | relative_date_to_ms: "Asia/Shanghai" }}
{{ scope.value | parse_compact_number }}
```

Values inserted into `content.html` are HTML-escaped. File
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

Loader URLs and nested `fetchOptions` strings may use Liquid. `fetchOptions`
uses Ky's `Options` shape, including its `json` and `searchParams` helpers:

```ts
loader: {
  type: "json",
  url: "/api/{{ scope.params.topic | url_path }}",
  fetchOptions: {
    method: "POST",
    headers: {
      authorization: "Bearer {{ scope.params.token }}",
    },
    json: {
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
    publishedAt: {
      select: "published_at",
      template: "{{ scope.value | date_to_ms }}",
    },
    author: {
      name: "author.name",
      home: "author.url",
    },
    stats: {
      likes: "metrics.likes",
      comments: "metrics.comments",
    },
    content: {
      text: "summary",
      pictures: "images[].url",
    },
  },
  itemTemplate: {
    inline: "{{ scope.item.author.name }}",
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

JMESPath can select semantic picture fields:

```ts
mark: {
  src: "card_label.icon",
  kind: "'promotion'",
  label: "card_label.text",
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
Exclude nested quote, reply, or related-content elements when they reuse the
same class as a primary field; otherwise the first nested match can replace the
current item's title. When nested content belongs in a secondary field, use an
ordered selector fallback to select it explicitly before the primary content.
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

Use HTML extraction only for `content.html`. With `baseUrl`,
URL-bearing result fields are resolved automatically. Use `absolute_url` for
embedded HTML URLs or values that need another base.

Set `decoding`, for example `"gb2312"`, for non-UTF-8 pages. Use `fetchOptions`
for standard requests and a custom `request` only for unusual request handling.
These options are mutually exclusive: a custom request owns its complete request
configuration, while the loader still owns response parsing and HTML decoding.

## RSS, custom loaders, and loader results

The RSS loader accepts RSS, Atom, and JSON Feed and needs only a URL:

```ts
loader: {
  type: "rss",
  url: "/feed.xml",
}
```

The RSS loader returns RSS channel or Atom feed metadata when present. For
JSON Feed 1.0 and 1.1 it maps `title`, `description`, `home_page_url`, and
`icon` or `favicon`; it also maps the first author name and avatar to item
semantic fields. Because JSON Feed item titles are optional, the loader derives
a bounded title from `summary`, `content_text`, or `content_html` when needed.
RSS and Atom text fields decode HTML character references once after XML
parsing, including references preserved literally inside CDATA sections.
Entries without a usable title or URL are ignored; an invalid date leaves the
corresponding item time unset instead of failing the complete feed.

Use a custom loader only when declarative loaders cannot express the source:

```ts
loader: {
  type: "custom",
  load: async (params, context) => {
    const session = context.secrets?.session
    const items = await context.fetch.get("https://api.example.com/items", {
      headers: { authorization: `Bearer ${session}` },
    }).json<NewsItem[]>()
    return { items }
  },
},
capabilities: {
  network: ["api.example.com"],
  cookies: [],
}
```

When a timeline API groups related items into modules or conversations, inspect
both top-level entries and nested module items. Normalize both shapes through
one shared parser before mapping them to news items; otherwise list and thread
timelines can appear to load successfully while returning no items.

When one page represents multiple independent sources, give each source its own
Radar rule for that page. Radar can then return every matching source instead of
forcing discovery to choose one stream.

When a source offers original and translated text, expose the choice as a
parameter. Use the selected variant as the item title and place the other
available variant in `content.text`. Fall back to the original when a
translation is unavailable.

A loader always returns a `SourceLoaderResult` object:

```ts
{
  items,
  itemTemplate: {
    inline: "{{ scope.item.author.name }}",
  },
  metadata: {
    badge: response.user.avatarUrl,
    desc: response.description,
    home: response.profileUrl,
    title: response.name,
  },
}
```

Dynamic loader metadata always supports the complete source metadata shape:
`title`, `badge`, `desc`, and `home`. It travels with the items through
persistence and the in-memory Query cache and has the
highest display priority, overriding static metadata and persisted Radar or
Instance metadata patches field by field. It is unavailable until the first
successful request and is never persisted into the Instance. A loader
title may provide the effective title for a LiveCard created through Radar.

When authoring a source, prefer loader metadata when a request already required
to load the items returns the authoritative metadata. Loader metadata must
never increase the request count: do not add a profile, channel, community, or
other companion request only to obtain `title`, `badge`, `desc`, or `home`.
When the required item request does not contain a field, use stable static
metadata or a Radar metadata patch instead, or leave the optional field unset.

Every item needs a non-empty `title` and `url`. Optional fields store facts,
not preformatted presentation strings:

```ts
{
  title: "Example",
  url: "https://example.com/article",
  publishedAt: 1767225600000,
  updatedAt: 1767312000000,
  author: {
    name: "Ada",
    home: "https://example.com/authors/ada",
  },
  stats: {
    likes: 12,
    comments: 3,
    reposts: 1,
  },
  attributes: {
    category: "Research",
  },
  icon: {
    src: "https://example.com/ada.png",
    kind: "author",
    label: "Ada",
  },
  mark: {
    src: "https://example.com/hot.svg",
    kind: "heat",
    label: "Trending",
  },
  content: {
    text: "Summary",
    pictures: "https://example.com/image.jpg",
  },
}
```

Custom loaders should write this semantic shape directly and may leave
unavailable nested values as `undefined`. The shared loader-result boundary
removes those values, empty nested objects, and empty picture arrays while
preserving meaningful `0` and `false` values. Do not assemble optional fields
with conditional object spreads in each source.

Times are milliseconds. `publishedAt` is the original publication time;
`updatedAt` is the last content update time. `author` retains identity,
`stats` uses the shared `likes`, `comments`, `reposts`, `views`, `stars`, and
`score` keys, and `attributes` stores source-specific string, number, or
boolean facts. `score` may be negative; the shared count fields must not be.
Both `icon` and the singular `mark` require `src`; their optional `kind` is
machine-readable and `label` is human-readable. Use `icon` for the regular
picture shared by the source's items and `mark` only for an exceptional visual
distinction. Image size, shape, and interaction belong to the frontend and
cannot be configured by a source. `content` holds text or HTML plus optional
pictures or iframe; `pictures` accepts one URL string or an array of URL
strings.

For an aggregate source that mixes entries from multiple feeds, use each
feed's own image as the item `icon` with `kind: "source"` and a feed-title
label. Omit that repeated item icon from a single-feed source when the LiveCard
badge already establishes the same identity.

Presentation belongs to the loader result, not each item. `itemTemplate.inline`
is a plain-text Liquid template scoped only to `scope.item`; use it to compose
author and source-specific attributes for a compact row. The frontend always
renders shared `stats` separately as icon-and-count pairs, so do not include
stats in this template. When the template is absent, the frontend composes a
readable fallback from author and attributes. Templates are cached
with the source result but are not item facts and therefore are not stored in
item history. Do not repeat context already established by the Instance:
for example, a topic-specific source should retain the topic in each item's
semantic `attributes`, but omit it from that source's inline template. Likewise,
when `icon.kind` is `author`, omit the author's name from inline presentation;
the avatar already identifies the author, while `author` remains available as
semantic data.

NewsNext validates loader results at the shared runtime boundary for extension
app and CLI execution. Empty item arrays, malformed item objects, non-finite
times or stats, invalid semantic fields or item templates, empty dynamic
metadata strings, and unsupported dynamic metadata keys fail the load. Custom
loaders receive the same validation as structured loaders. Returning a bare `NewsItem[]` is not
supported; use `{ items }` even when metadata is absent.

Minimize request count as part of the source contract. When one listing request
can return both items and metadata, directly or through expansion, include, or
field-selection options, the loader must use that single request. Metadata
enrichment never justifies a companion request or batch request. Additional
requests are allowed only when they are required to produce the items
themselves. This is especially important for authenticated sources because
unnecessary API traffic can trigger rate limits, anti-abuse systems, or account
suspension.

## Version, request protection, capabilities, and secrets

Sources do not configure TanStack Query freshness or the request-protection
interval, and there is no user freshness setting. Persisted results provide
immediate placeholder content and survive
extension restarts.

Every Source has a positive integer `version`, defaulting to `2`. Set or
increase it only when a behavioral or result-shape change must invalidate
stored results and mark a new version boundary in retained observations:

```ts
version: 3
```

Validated Source results are cached once by the extension background in
IndexedDB as a derived key, real fetch time, and result snapshot. The key is
computed from Source ID, Source version, and normalized parameters without
duplicating that target in the record. The same record supports request
protection and startup placeholders. Instances bound to the same browser may
reuse the same protected Loader record, while page-side results remain isolated
by Instance ID. The App restores cache records through Instance routing and
renders directly from their Source snapshots without listing registry
descriptors. Page queries become stale after two minutes, so
remounting or regaining focus can revalidate them, while active Sources also
revalidate on a fixed five-minute interval. Manual Request is a page-side user
intent that bypasses page freshness. It sends the same load action as automatic
revalidation, without a manual-request flag, so the background does not
distinguish the two paths. Neither path may issue a new Loader request when the same
Source and normalized parameters completed a real load less than one minute
ago. After that fixed protection interval, NewsNext publishes the stored result
as a placeholder while the new request runs.

The manual-request indicator remains visible for at least 500ms when a protected
Manual Request action reuses the preceding result, so the action still has
perceptible feedback. It returns `fetchProtected: true` and updates caller-visible
`loadedAt` without changing stored `fetchedAt`, rewriting the stored state, or extending the protection interval. Concurrent
requests for the same Source and normalized parameters remain deduplicated.

Persisted Source results expire after 30 days. Increasing `version` changes
persisted-result identity immediately; superseded versions remain isolated and
expire normally.

Structured loaders infer the hostname of a static URL. Declare every additional
or dynamically selected hostname:

```ts
capabilities: {
  network: ["api.example.com", "*.images.example.com"],
  cookies: [],
}
```

Network entries may be an exact hostname, a wildcard subdomain, or `*`. Only
HTTP and HTTPS requests are accepted. Custom loaders must declare every network
and cookie capability they use; loaders that use neither may omit
`capabilities`.

The built-in `rss:feed` source is also permission-specialized. Although its
runtime network capability is `*` so it can validate a user-selected feed, the
extension requests host access only for the hostname in the LiveCard's effective
`url` parameter. Changing that parameter recalculates the required origin. Keep
this source-ID mapping aligned with the extension permission resolver when
adding another bundled source that targets a user-selected host.

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
refreshed values with `context.updateSecrets`. Use the required `context.fetch`
client for every network request. It has the active request's `AbortSignal`
pre-bound and applies the shared credentials, timeout, retry, hostname queue,
rate-limit behavior, and declared network capability checks. The underlying
signal remains available through `context.signal` for non-fetch asynchronous
work and explicit cancellation checks. Do not catch and convert an abort into a
normal loader error.

`context.fetch` is a signal-bound Ky instance. Prefer method shortcuts,
`searchParams`, `json`, and chained body parsing:

```ts
const items = await context.fetch.post("https://api.example.com/search", {
  searchParams: { limit: 30 },
  json: { query: "news" },
}).json<NewsItem[]>()
```

GET requests retry transient failures; mutation requests are not retried
automatically. Non-success HTTP responses reject after the retry policy is
exhausted. Retries use exponential backoff with full jitter, honor
`Retry-After` for rate limits and service unavailability, and cap any retry
delay at the shared request timeout. Use the provided instance directly; do not
call `create()` and lose the bound request lifecycle and security policy.

Provider-specific response recovery may derive a client with `extend()` and an
`afterResponse` hook. Guard retries with `retryCount`, return
`context.fetch.retry()` instead of recursively calling the loader, and use the
original `context.fetch` for token-refresh requests so the derived hook does not
intercept its own refresh. Derived requests retain the execution signal,
hostname queue, and capability checks.

NewsNext requests use the browser's logged-in session by default. The shared
Source HTTP client and the built-in structured loaders set Ky's
`credentials: "include"` option.
Use `credentials: "omit"` only when a request must be explicitly anonymous.
Do not declare cookie secrets merely to authenticate a request; cookie secrets
are for reading a specific value that the loader must inspect.

The client behind `context.fetch` serializes requests per hostname and spaces
their start times to avoid bursts when multiple Instances target the same
service. Custom loaders must use `context.fetch` instead of importing the shared
client or using global `fetch`; the context client keeps request policy and
cancellation attached to the current source execution. Requests to different
hostnames may run in parallel. A structured-loader custom `request` callback
receives the resolved URL, bound Ky client, and execution signal in one context.
It must return a `Response`; the structured loader parses the JSON or HTML body:

```ts
request: async ({ url, fetch }) => {
  await fetch.get("https://example.com/bootstrap")
  return fetch.get(url)
}
```

When an API requires a cookie issued or refreshed by a page visit, a TypeScript
structured loader may use a custom `request` that first requests the bootstrap
page and then fetches the API. Both context requests inherit the logged-in browser
session. Declare the bootstrap hostname as a network capability in addition to
the loader URL's inferred hostname; do not read cookies or construct a `Cookie`
header when the browser cookie jar is sufficient.

## Radar discovery

Radar detects a source from the active page:

Radar's UX contract is one-click Instance creation. Treat the matched page as
the user's fully configured view, not merely evidence that a Source exists. A
suggestion should resolve every parameter that the page already expresses,
including account or resource identity, search terms, content type, filters,
sorting, and time range. The expected user flow is to review the preview and
click `Create`; do not require the user to reopen the editor and repeat choices
that are already visible on the page.

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
}]
```

Each Radar suggestion previews one LiveCard. Creating it persists a new Instance
with the resolved parameter and presentation patches, plus Board membership
for the selected destination Boards. Radar does not modify an existing
LiveCard. Moving a LiveCard later changes only its Board membership.
At least one destination Board is always required.

Match rules:

- `hosts` are lowercase and ignore a leading `www.`.
- `location` selects which URL-like location supplies `paths`, `query`, and
  their template scopes. It defaults to `"url"`; use `"hash"` for a Hash
  Router or fragment parameters. Hash locations accept `#/path?key=value`,
  `#?key=value`, and `#key=value`. Plain anchors such as `#comments` are not
  matchable locations.
- A `paths` array is an include shorthand and uses `path-to-regexp` syntax.
- Use `paths.include` and `paths.exclude` when both are needed. Exclusions are
  checked before parameter patches are rendered.
- `query` is an array of required query keys. Radar checks only that each key is
  present; their values remain available through `scope.query` and are validated
  by the Source parameter schema after the patch is resolved. Keys read only by
  a patch do not need to appear in `query`.
- Omitting `paths`, or using an empty include array, matches every path on the
  listed hosts.
- Radar rule IDs must be unique within a source.

When several suggestions match the same page, Radar orders them by the matched
location's granularity: query, path, then host-only. Within
the path level, exact paths outrank parameterized paths, which outrank
wildcards. More static segments, greater path depth, and more required query
keys increase specificity; fewer dynamic and wildcard segments win the remaining
ties. When several include patterns match, Radar uses the most specific one.

Radar derives specificity as an ordered set of structural fields rather than a
weighted score. This makes ordering deterministic and explainable without
author-tuned weights.

The optional rule `priority` is a safe integer used only as a tie-breaker
between suggestions with equal structural specificity. It cannot override a
more specific location match. It is not required; omit it unless two
structurally equivalent rules need an intentional order.

Map each parameter explicitly in `patch.params`. Values can read
`scope.path`, `scope.query`, and `source.vars`. Both scopes refer to the
selected `location`. Match structure and required query keys decide eligibility
and populate captures; patches map those captures to Source parameters. Missing
values fall back to parameter defaults. Radar applies every declared parameter
type and `validate` rule after resolving the complete patch; any invalid value
discards the suggestion. Do not repeat parameter defaults or validation in
Liquid or JavaScript Radar patches. When page state is unavailable, let a
template render empty or return `undefined` from a script so the parameter
schema supplies its default.

Prefer URL-derived state because it is stable and directly testable. Many
single-page applications do not serialize every choice into the URL. When a
meaningful parameter exists only in page state, use a JavaScript Radar parameter
function to inspect a stable semantic attribute or the active control. If the
controls have a fixed order but no useful value attribute, map the active
control's position to the Source's canonical parameter value:

```ts
patch: {
  params: {
    sort: () => {
      const page = globalThis as unknown as {
        document: {
          querySelectorAll: (selector: string) => ArrayLike<{
            classList: { contains: (className: string) => boolean }
          }>
        }
      }
      const controls = Array.from(page.document.querySelectorAll(".sort-option"))
      const activeIndex = controls.findIndex(
        control => control.classList.contains("is-active"),
      )
      return (["latest", "popular", "oldest"] as const)[activeIndex] ?? "latest"
    },
  },
},
```

Prefer stable attributes over CSS position, and CSS position over localized
visible labels. Use the parameter default only as a deliberate fallback when
the page does not expose the state. Verify every meaningful interactive state,
including states that leave the URL unchanged, and confirm that each produces a
ready-to-create suggestion with the complete normalized parameter patch.

`patch.metadata.title` is optional, including for parameterized sources. Omit it
when the item request already returns the authoritative title through loader
metadata. Before the first successful load, or when loading fails, the LiveCard
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

Do not add engine-specific generic sources for forums that expose RSS, Atom, or
JSON Feed.
The built-in `rss:feed` source accepts arbitrary feed URLs without coupling the
registry to forum routes, templates, or JSON APIs. Users add the feed URL
explicitly; Radar does not scan pages for feeds. Add a dedicated forum provider
only for a site-specific contract that RSS, Atom, or JSON Feed cannot represent.

Use `badge` for secondary instance identity. Reuse a stable image URL from the
required item request whenever it is available. Page-derived Radar badges must
also be stable because their resolved URLs are persisted with the Instance; do
not capture signed, expiring, session-bound, or transiently transformed image
URLs from the DOM. When the required item request has no stable badge and the
page exposes only a transient one, omit the badge instead of adding a
metadata-only request.

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

Use the separately distributed NewsNext App CLI to validate live behavior.
Enable **Settings → Connection**. Development builds connect only to the
development Native Messaging host. Register the installed executable, then
start the daemon:

```sh
newsnext install-native-host
newsnext start
newsnext status
```

The installer presents detected browsers only and selects all of them by
default. Pass one or more browser names, such as `install-native-host chrome
firefox`, to skip the interactive selector. In non-interactive environments,
omitting browser names installs for every detected browser. Development Firefox
uses `dev@newsnext.app`; the packaged extension and app use
`addon@newsnext.app` through a separate production host. Ego Lite, Dia, and Arc
registration is supported on macOS and uses each browser's own Chromium
user-data root; pass `ego-lite`, `dia`, or `arc` explicitly when needed. Browser
processes must be restarted after host registration. While the daemon is running, the tray's
**Browser Integration** submenu lists detected browsers and provides the same
controls: selecting a browser installs its host registration, and clearing it
removes the manifest and any platform registration. The commands below use the
Rust control client and Native Messaging transport.

For a browser whose installation path is not known to NewsNext, write a manifest
to the current directory for manual placement:

```sh
newsnext install-native-host --current-dir
newsnext install-native-host --current-dir chromium-based
newsnext install-native-host --current-dir firefox-based
```

This mode does not modify browser directories or the Windows registry.

Run a registered source:

```sh
newsnext run github:trending
```

Run a local provider, optionally choosing a source and parameters:

```sh
newsnext run registry/src/hackernews.json top
newsnext run registry/src/telegram.json \
  --param channel=telegram
```

Useful options include `--params`, `--watch`, `--browser`, `--timeout`,
`--provider-id`, `--use-provider-secrets`, `--debug`, and `--verbose`. See the complete
list with:

```sh
newsnext run --help
```

When `--browser` is omitted, the CLI prompts you to select a connected browser.
Pass a browser name, full connection ID, or unique ID prefix to skip the prompt.

The command prints the source result as `data`, `metadata`, and `itemTemplate`,
with normalized parameters and timing under `execution`. Pass `--debug` to also
include every underlying request and response under `fetches`. Each fetch entry
includes its duration, the request URL and method, and the response URL, status,
headers, and text body. Debug output may contain sensitive response data.

Fetch an endpoint directly from the connected extension when investigating
authentication, headers, or raw responses:

```sh
newsnext fetch https://example.com/api
newsnext fetch https://example.com/api \
  -H 'Accept: application/json' -i
```

The request runs in the extension background and uses the browser's cookie jar.
When the target does not already have host permission, NewsNext opens a scoped
extension window where the user can review and authorize the exact site before
the request continues.

`-X` selects a method, `-H` adds a repeatable header, `-d` supplies a text body,
and `-i` includes response status and headers. Browser-managed cookies cannot be
overridden with a `Cookie` header. Use this command for raw endpoint debugging,
then run `run` to verify the complete source behavior.

Background Jobs retain newly executed Source results in the daemon-owned local
database. Reusing a protected result does not create a duplicate observation:

```sh
newsnext history datasets --source-id github:trending
newsnext history datasets --node-id NODE_ID --source-version 3
newsnext history observations DATASET_ID
newsnext history get DATASET_ID 1786212000000
newsnext history compare DATASET_ID \
  1786212000000 1786215600000
```

Discover and use the canonical application control surface:

```sh
newsnext action list
newsnext action execute source.list
newsnext action execute source.get --input \
  '{"sourceId":"github:trending"}'
newsnext action execute board.list
newsnext action execute board.getContext --input \
  '{"boardId":"BOARD_ID"}'
newsnext action execute board.getConfiguration --input \
  '{"boardId":"BOARD_ID"}'
newsnext action execute nowLayer.getLiveCards --input \
  '{"boardId":"BOARD_ID"}'
newsnext action execute board.create --input \
  '{"name":"Research","color":"blue","sortMode":"addedAt"}'
newsnext action execute board.update --input \
  '{"boardId":"BOARD_ID","name":"Research queue","color":"purple"}'
newsnext action execute instance.create --input \
  '{"sourceId":"github:trending","boardIds":["BOARD_ID"],"patch":{"params":{"language":"typescript"}}}'
```

Catalog listings include each Action's `mutation`, `query`, or `command` kind,
description, and JSON input/output schemas. Every execute input must be a JSON
object. Each Action owns TypeBox parameter and result schemas next to its
handler; the extension performs runtime shape and domain validation from that
single definition, then invokes the same registered Action used by the typed
UI client.
Enabling the NewsNext App connection permits CLI operations, including
destructive ones such as `board.delete` and `instance.delete`; inspect
`action list` before automation and use stable Data identities rather than
Board labels.
Passing `deleteInstances: true` to `board.delete` also deletes Instances
used only by that Board. Passing `targetBoardId` instead transfers
the deleted Board's Instances to the selected Board without
duplicating memberships. Instances shared with other Boards remain.

Use the direct `color`, `defaultLayer`, and `sortMode` fields when creation
includes Board preferences. `board.create` also accepts an `instances` array of Source IDs and
patches when a Board and its configured Instances must be created in one
atomic import. Use `board.update` when one intent changes Board data
and Board preferences together. These composite Actions persist once and
cannot be interleaved with another UI or Agent mutation.

Use `action execute board.getContext --input '{"boardId":"BOARD_ID"}'` when
starting from a known Board, then `action execute board.listInstances --input
'{"boardId":"BOARD_ID"}'` for a custom Board. Use `action execute
instance.list` when the Board is irrelevant. History commands intentionally use
the opaque ID returned by `history datasets`; they do not resolve extension
Instance state. Filter dataset discovery by Node, Source version, Source, or
provider when selecting a retained execution environment and parameter
configuration.

Query Actions return canonical Boards and Instances without a
parallel CLI-only Board representation. An Instance may be returned by several
Board queries when it has several memberships. Ordinary Now Layer loads remain
browser-local and do not create History. Observation times may be Unix
milliseconds or ISO 8601 values. List `observations` before using exact
timestamps with `get` or `compare`. Add `--compact` when consuming JSON
programmatically. History reads require the daemon but not a connected browser.
Creating new observations requires an active Job and its connected browser
because Source execution remains browser-owned.

Direct `fetch` requests are useful for endpoint investigation, but they do not verify
parameter parsing, extension permissions, capability enforcement, secrets, or
the background runtime.

Before submitting:

- Prefer a stable structured API over HTML parsing.
- Prefer parameters over duplicate sources with the same output shape, unless
  variants have distinct discovery semantics and default identities.
- Use JMESPath and CSS selectors before writing a custom loader.
- Declare every possible network hostname.
- Use milliseconds for `publishedAt` and `updatedAt`, and text instead of HTML
  when possible.
- Add Radar rules for parameterized sources when appropriate.
- Confirm each Radar suggestion captures all parameters expressed by the page
  and needs no post-creation editing.
- Regenerate registry artifacts.
- Validate the source through `newsnext run`.
- Run `bun run typecheck`, `bun run test`, and `git diff --check`.
- Update this guide whenever source authoring behavior changes.
