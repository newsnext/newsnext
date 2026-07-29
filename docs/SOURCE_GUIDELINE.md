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
  defaults: {
    cache: "5m",
    metadata: {
      home: "https://example.com",
      color: "blue",
    },
  },
  sources: {
    latest: {
      metadata: {
        title: "Latest",
        type: "timeline",
      },
      loader: {
        type: "json",
        url: "https://api.example.com/articles",
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

A provider has only `title`, optional `category`, `defaults`, and `sources`.
`title` and `category` identify the provider and cannot be overridden by
individual sources, Radar rules, or card instances.

`defaults` may contain `cache`, `capabilities`, `loader`, `metadata`, `vars`,
`params`, `radar`, `requestRules`, and `secrets`. Defaults recursively fill
missing object properties. Source values win, and source arrays replace default
arrays.

Source metadata supports:

```ts
metadata: {
  title: "Latest",
  icon: "https://example.com/icon.png",
  badge: "https://example.com/account.png",
  desc: "Example news",
  home: "https://example.com/latest",
  color: "blue",
  type: "timeline",
}
```

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
| `forum` | Topic-based discussion organized around threads, replies, or Q&A | Linux.do, V2EX, Hacker News, Tieba, Zhihu |
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

`type: "hottest"` preserves loader order. `type: "timeline"` and an omitted
type sort by descending timestamp when the first item has a non-zero timestamp.

Write human-facing strings in the website's primary interface language. Keep
brand names, IDs, parameter keys and values, and selectors unchanged.

`metadata.icon` defaults to the favicon derived from the final `metadata.home`.
Use `metadata.badge` for instance-specific identity such as a channel or user
avatar. Source metadata is static and must not contain Liquid; use a Radar
metadata patch for dynamic values.

## Parameters

Supported types are `text`, `url`, `number`, `switch`, `select`, and
`multiselect`:

```ts
params: {
  topic: {
    type: "text",
    title: "Topic",
    default: "technology",
    pattern: "^[a-z-]+$",
  },
  page: {
    type: "number",
    title: "Page",
    default: 1,
    min: 1,
    max: 10,
    step: 1,
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

String-like parameters also support `startsWith`, `notIn`, and `description`.
All string inputs are trimmed before templates, type coercion, and validation.

Prefer one source with a `select` parameter when feed variants share their
loader and presentation and differ only by a request value. Separate sources
remain appropriate when variants need different static metadata or card types.

Use `template` to normalize a raw value:

```ts
{
  type: "text",
  title: "Channel",
  default: "example",
  template: "{{ scope.value | remove_first: '@' }}",
  pattern: "^[A-Za-z][A-Za-z0-9_]+$",
}
```

Parameter templates can read `scope.value` and `source.vars`.

## Liquid templates

Liquid is available only in schema fields documented as template slots:

| Slot | Available values |
| --- | --- |
| Parameter | `source.vars`, `scope.value` |
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
| `favicon_url` | Return the configured favicon service URL |
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
  url: "https://api.example.com/{{ scope.params.topic | url_path }}",
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
}
```

JSON loader metadata is selected from the complete response. It is cached with
the items and temporarily overrides the source title, description, or badge
while that result is displayed.

Loader metadata is unavailable until the first successful request. It does not
satisfy the Radar title requirement and cannot replace discovery-time metadata.

## HTML loader

`items` and `filter` are CSS selectors:

```ts
loader: {
  type: "html",
  url: "https://example.com/news",
  items: ".article",
  filter: ":not(.advertisement)",
  fields: {
    title: ".article__title",
    url: {
      select: ".article__title",
      attr: "href",
      template: "{{ scope.value | absolute_url: scope.request.url }}",
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

Use HTML extraction only for `inline.html` or `preview.html`. Resolve relative
URLs with `absolute_url`.

Set `decoding`, for example `"gb2312"`, for non-UTF-8 pages. Use `fetchOptions`
for standard requests and a custom `fetch` only for unusual request handling.

## RSS and custom loaders

RSS needs only a URL:

```ts
loader: {
  type: "rss",
  url: "https://example.com/feed.xml",
}
```

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
    title: response.name,
  },
}
```

Dynamic loader metadata supports `title`, `desc`, and `badge`. It is cached with
the items and overrides static or Radar metadata while displayed. Use it for
response-derived values, not for an icon repeated by every item.

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

Do not declare cookie secrets merely to authenticate a request when
`credentials: "include"` supplies the browser cookie jar.

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
- `paths` use `path-to-regexp` syntax.
- Omitting `paths` matches every path on the listed hosts.
- `includes` requires one of its strings to occur in the full URL.
- Radar rule IDs must be unique within a source.

Map each parameter explicitly in `patch.params`. Values can read
`scope.path`, `scope.query`, `scope.hashQuery`, and `source.vars`. Missing
values fall back to parameter defaults; invalid values discard the suggestion.

Every Radar rule that discovers a parameterized source instance must provide a
non-empty `patch.metadata.title`. This remains required when the loader also
returns a dynamic title: Radar owns the title before loading and provides the
fallback when loading fails.

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

Radar metadata can override every source presentation field: `title`, `icon`,
`badge`, `desc`, `home`, `color`, and `type`. Use
`type: "hottest"` or `type: "timeline"` when a discovered instance needs a
different card presentation from its source default. Radar metadata uses the
same selector, traversal, extraction, and template behavior as HTML loader
fields.

When a source has no parameters or explicit `radar`, an HTTP(S)
`metadata.home` creates a same-host rule automatically. Set `radar: []` to opt
out. Parameterized sources need explicit rules.

Use `badge` for secondary instance identity and `icon` when Radar should replace
the source icon. For signed or expiring images, return loader metadata instead
of persisting the URL through Radar.

## Validation and verification

The registry build validates source IDs, schemas, templates, JMESPath,
selectors, request rules, network capabilities, and security limits. Prefer
declarative loaders, keep selectors and expressions bounded, and never rely on
JavaScript execution from configuration.

Author-facing limits:

| Input | Limit |
| --- | --- |
| Runtime registry | 1,000 sources and 2 MiB parsed JSON |
| Source ID | 200 characters |
| Request rules | 10 per source |
| Request domains | 20 per rule |
| Header modifications | 5 per rule |
| JMESPath expression | 2,000 characters |
| HTML selected items | 2,000 per request |
| CSS selector | 500 characters |
| Extracted field value | 20,000 characters |
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
