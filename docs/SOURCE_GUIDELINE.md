# Source Authoring Guide

This guide is the canonical reference for adding and maintaining NewsNext sources.
Keep it synchronized with the source schema and runtime behavior.

## Architecture

A provider groups related sources and supplies shared metadata. A source defines
parameters, discovery rules, permissions, caching, and a loader that returns news
items.

```text
provider
├── shared metadata
└── sources
    ├── parameters
    ├── radar rules
    ├── capabilities and secrets
    ├── cache policy
    └── loader
```

The configuration follows four pipelines:

```text
parameters  raw → trim strings → Liquid template → type coercion → validation
radar       URL → explicit parameter Liquid → metadata Liquid
JSON field  JMESPath select → Liquid template
HTML field  CSS select → text/attr/content → Liquid template
```

Structured loaders are declarative. Use a custom loader only when these
pipelines cannot express the source.

The source package is organized by responsibility:

```text
src/
├── core/       source resolution, loaders, params, templates, and capabilities
├── registry/   provider expansion and registry parsing and validation
├── runtime/    source lookup, caching, and request preparation
├── types/      shared source contracts
└── utils/      generic crypto, fetch, and JWT helpers with one public entry
```

The registry package owns all concrete providers and can be developed, built,
and published independently from the source runtime:

```text
packages/registry/
├── src/
│   ├── *.json      declarative provider definitions
│   ├── *.ts        executable TypeScript provider definitions
│   └── */index.ts  nested executable provider definitions
├── registry.json   generated configuration for every source
└── loaders.ts      generated executable loader map and source composition
```

## Adding a provider

Create TypeScript and declarative JSON providers under `packages/registry/src`.
The registry build discovers top-level TypeScript files plus nested `index.ts`
files and generates
the executable loader map. JSON providers are flattened with their declarative
loaders. TypeScript providers are also flattened, but their `loader` property is
omitted. Consequently, `registry.json` contains the provider, metadata, params,
radar, capabilities, secrets, cache, and other serializable configuration for
every source. A registry entry with no `loader` uses the generated executable
loader with the same complete source ID. The extension injects that loader map
when resolving the registry, then passes the resulting source collection to
`@newsnext/source/runtime`.

A TypeScript provider ID comes from its top-level filename or the parent
directory of a nested index file. A JSON provider ID comes from its filename;
the JSON package build uses `flattenProviderConfig` from
`@newsnext/source/registry` to inherit provider defaults and writes a flat
`packages/registry/registry.json`. Registry keys are complete source IDs such
as `example:latest`; the generated file contains no provider containers. Each
flattened source carries its fixed provider identity separately from source
metadata:

```json
{
  "example:latest": {
    "provider": {
      "title": "Example"
    },
    "metadata": {
      "title": "Latest",
      "icon": "https://example.com/latest.png"
    }
  }
}
```

`metadata.icon` becomes the source `icon` displayed by clients. When omitted,
it defaults to the favicon derived from the source's final `metadata.home`
value.

Prefer JSON whenever the provider is fully declarative. Use TypeScript only
when it needs custom loader functions, imported runtime helpers, browser APIs,
or computed configuration that cannot be expressed with source templates.
JSON providers use the same provider and source schema:

```json
{
  "title": "Example",
  "defaults": {
    "cache": "5m",
    "metadata": {
      "home": "https://example.com",
      "color": "blue"
    }
  },
  "sources": {
    "latest": {
      "metadata": {
        "title": "Latest",
        "type": "timeline"
      },
      "loader": {
        "type": "rss",
        "url": "https://example.com/feed.xml"
      }
    }
  }
}
```

Do not define the same complete source ID in both TypeScript and JSON. The
registry build rejects duplicate source IDs.

```ts
import type { ProviderConfig } from "@newsnext/source/registry"

export default {
  title: "Example",
  defaults: {
    cache: "5m",
    metadata: {
      home: "https://example.com",
      color: "blue",
      category: "tech",
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

After adding or changing providers, regenerate the registry artifacts:

```sh
bun --filter=@newsnext/registry run build
```

The extension build and development watcher run this build automatically.
During `wxt` development, a provider change regenerates the artifacts, rebuilds
the affected extension entrypoint, and reloads the extension.

Do not edit `packages/registry/registry.json` or
`packages/registry/loaders.ts` manually. They are generated by the registry
build. Source configuration has one generated representation in
`registry.json`; `loaders.ts` contains only the executable loader functions
needed by TypeScript providers. Both are owned by `@newsnext/registry`;
`@newsnext/source` contains no concrete providers.

## Registry loading

`@newsnext/source/runtime` accepts resolved sources through an asynchronous
`ExternalSourcesLoader` and does not import a registry package or understand the
registry wire format. The extension owns the `@newsnext/registry` imports,
resolves the bundled registry with the executable loader map, and configures
the loader during background startup. Runtime source loading never fetches a
registry over HTTP and does not read registry configuration from extension
storage. Registry changes therefore require rebuilding and releasing the
extension.

The resolved result is cached within the current runtime context and concurrent
requests share one in-flight promise. Structured loaders run directly. An entry
without `loader` resolves only when the extension bundles an executable loader
for that exact source ID.

## Provider metadata

Provider `title` is the fixed identity field. Every shared source property
belongs in `defaults` and can be overridden by a source. The only
provider-level keys are `title`, `defaults`, and `sources`.

```ts
export default {
  title: "Example",
  defaults: {
    metadata: {
      desc: "Example news sources",
      home: "https://example.com",
      color: "blue",
      category: "tech",
    },
  },
  sources: {
    // ...
  },
} satisfies ProviderConfig
```

Supported categories are:

```text
tech
finance
china
world
others
```

An omitted category defaults to `others` during provider defaults expansion.

A source keeps its display metadata under `metadata`. It may override `title`,
`icon`, `desc`, `home`, `color`, and `category` there. Provider `title`
identifies the provider and cannot be overridden by a source:

```ts
metadata: {
  title: "Latest",
  icon: "https://example.com/icon.png",
  home: "https://example.com/latest",
  type: "timeline",
}
```

Write every human-facing source string in the website's primary interface
language. This includes the provider title, metadata title and description,
parameter title and description, select option labels, and human-facing
fallbacks inside templates. Preserve official brand names and keep parameter
keys, option values, IDs, selectors, and other implementation details
unchanged. For multilingual websites, follow the locale represented by the
source URL or the website's default locale when the source is locale-neutral.

The optional `metadata.type` controls ordering:

- `hottest` preserves the loader's original order.
- `timeline` sorts by timestamp descending when the first item has a non-zero timestamp.
- An omitted type uses the same timestamp sorting behavior as `timeline`.

## Source defaults

Use `defaults` for source properties repeated within the same provider. A
source only needs to declare values that differ from those defaults:

```ts
export default {
  title: "Example",
  defaults: {
    cache: "5m",
    capabilities: {
      network: ["api.example.com"],
      cookies: [],
      browser: [],
    },
    loader: {
      type: "custom",
    },
    metadata: {
      color: "blue",
      type: "timeline",
    },
  },
  sources: {
    latest: {
      metadata: {
        title: "Latest",
      },
      loader: {
        load: fetchLatest,
      },
    },
    popular: {
      metadata: {
        title: "Popular",
        type: "hottest",
      },
      loader: {
        load: fetchPopular,
      },
      cache: "15m",
    },
  },
} satisfies ProviderConfig
```

Defaults recursively fill missing object properties. Source values take
precedence, and source arrays replace default arrays instead of being
concatenated. An empty source array therefore disables an inherited `radar`,
`requestRules`, or `secrets` array. Loader objects use the same recursive
inheritance, so providers with identical selectors can put the shared loader
shape in `defaults.loader` and override only fields such as `url`.

`cache`, `capabilities`, `loader`, `metadata`, `vars`, `params`, `radar`,
`requestRules`, and `secrets` can all be placed in `defaults`. The fully
expanded source is validated after defaults are assigned.

## Parameters

Parameters make a source reusable. Supported parameter types are `text`, `url`,
`number`, `switch`, `select`, and `multiselect`.

```ts
params: {
  topic: {
    type: "text",
    title: "Topic",
    description: "Topic slug used by the API.",
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

String-like parameters support declarative validation:

```ts
{
  pattern: "^\\d+$",
  startsWith: "https://",
  notIn: ["admin", "search"],
}
```

All string inputs are trimmed automatically before templates, type coercion,
and validation.

Use a Liquid template to normalize a parameter before type coercion and
validation. The raw value or default is available as `scope.value`:

```ts
{
  type: "text",
  title: "Channel",
  default: "example",
  template: "{{ scope.value | remove_first: '@' }}",
  pattern: "^[A-Za-z][A-Za-z0-9_]+$",
}
```

Parameter templates are serializable and use the same restricted LiquidJS
environment and filters as other source templates. They can access the raw
value as `scope.value` and shared template variables as `source.vars`.

## Liquid templates

Liquid is used wherever the source schema explicitly accepts a template,
including parameters, loader URLs, fetch options, Radar patches, metadata icons,
and fields. It is not used to select JSON data.

Source registration parses templates, validates their filters and available
paths, and creates slot-specific bindings. The parsed Liquid program is shared
by identical templates, while each binding retains its own source location for
runtime errors. Both layers use bounded caches.

Every template has exactly two external roots:

- `source` contains source-definition data. Its currently available branch is
  `source.vars`.
- `scope` contains data produced for the current rendering stage.

Each schema slot explicitly fixes its available paths and output mode, so a
template cannot gain access to data from another stage and output escaping does
not depend on a field-name heuristic.

| Slot | Available paths | Output |
| --- | --- | --- |
| Parameter | `source.vars`, `scope.value` | Plain text |
| Metadata icon | `source.vars`, `scope.params` | Plain text |
| Loader URL and `fetchOptions` | `source.vars`, `scope.params` | Plain text |
| JSON field | `source.vars`, `scope.value`, `scope.item`, `scope.params`, `scope.index`, `scope.request.url`, `scope.response.json` | Plain text, except `inline.html` and `preview.html` |
| HTML field | `source.vars`, `scope.value`, `scope.item`, `scope.params`, `scope.index`, `scope.request.url` | Plain text, except `inline.html` and `preview.html` |
| Radar parameters | `source.vars`, `scope.path`, `scope.query`, `scope.hashQuery` | Plain text |
| Radar metadata | Radar parameter paths plus `scope.params` and `scope.page` | Plain text |

Only schema fields documented as template slots are rendered. Other source
strings remain literal even when they contain Liquid syntax.

### Rendering time

Compilation and rendering are separate:

- Parameter templates render after trimming the raw value or default and before
  type coercion and validation.
- Loader URL and nested `fetchOptions` templates render after all parameters are
  parsed and immediately before capability checks and the request.
- JSON field templates render after JMESPath selection.
- HTML field templates render after selector, traversal, and content extraction.
  Every field is extracted before any field template renders.
- Radar parameter templates render after a URL rule matches. Their values are
  parsed and validated before Radar metadata templates render.
- Metadata icon templates render when a source card needs its icon.

Registration rejects invalid templates with their exact source location.
Runtime rendering errors retain the same location. Loader and parameter errors
propagate to the caller; optional Radar suggestions and icons fail closed and
emit a diagnostic instead of breaking the surrounding UI.

### Output and control flow

```liquid
{{ scope.params.topic }}

{% if scope.item.category %}
  {{ scope.item.category }}
{% else %}
  Unknown
{% endif %}

{% for tag in scope.item.tags %}
  {{ tag }}
{% endfor %}
```

### Filters

LiquidJS built-in filters such as `strip`, `default`, `upcase`, `downcase`,
`replace`, `remove`, `prepend`, `append`, `split`, `first`, `join`, `truncate`,
`times`, and `date` are available. Prefer these filters for string formatting
instead of building an equivalent field-transform pipeline.

NewsNext also registers:

```liquid
{{ scope.value | required }}
{{ scope.value | url_path }}
{{ scope.value | url_query }}
{{ scope.value | normalize_whitespace }}
{{ scope.value | normalize_lines }}
{{ scope.value | normalize_lines: 2 }}
{{ scope.value | first_line }}
{{ scope.value | absolute_url: scope.request.url }}
{{ scope.value | favicon_url }}
{{ scope.value | css_url }}
{{ scope.value | date_to_ms }}
{{ scope.value | relative_date_to_ms: "Asia/Shanghai" }}
{{ scope.value | regex_extract: "Item (\\d+)", 1 }}
{{ scope.value | regex_replace: "\\s+", " " }}
```

- `required` throws when a value is `null`, `undefined`, or an empty string.
- `url_path` encodes one URL component with `encodeURIComponent`.
- `url_query` currently performs the same component encoding.
- `normalize_whitespace` collapses whitespace to single spaces.
- `normalize_lines` trims lines, removes empty lines, and joins them with one
  newline. Its optional spacing argument accepts an integer from 1 through 4.
- `first_line` returns the first non-empty trimmed line.
- `absolute_url` resolves a URL against its base.
- `favicon_url` returns the configured favicon service URL for a page URL.
- `css_url` extracts the first `url(...)` value from a CSS declaration.
- `date_to_ms` parses a date and returns its Unix timestamp in milliseconds.
- `relative_date_to_ms` parses absolute or relative date text in an optional
  IANA timezone and returns its Unix timestamp in milliseconds.
- `regex_extract` returns a numbered capture group, or an empty string when the
  pattern does not match.
- `regex_replace` replaces every match with the provided replacement.

Regex filters accept patterns up to 500 characters and input values up to
20,000 characters. Nested quantified groups are rejected.

Filters compose naturally:

```liquid
{{ scope.value | first_line | truncate: 160, "…" }}
{{ scope.value | normalize_whitespace | prepend: "✰ " }}
{{ scope.value | absolute_url: scope.request.url }}
```

Templates use strict variables and strict filters. Guard optional data with
`if` or `default`:

```liquid
{{ scope.item.subtitle | default: "" }}
```

### Restrictions

User-controlled templates must not read files or bypass HTML escaping. NewsNext
rejects these tags and filters:

```text
include
layout
liquid
raw
render
raw filter
```

Liquid rendering also enforces parse, render, memory, template-count, and cache
limits. It does not use `eval` or `new Function`.

## URL and option templates

Structured loader URLs are strings and may contain Liquid templates.

```ts
url: "https://api.example.com/{{ scope.params.topic | url_path }}?page={{ scope.params.page | url_query }}"
```

When templates need static lookup tables or other shared constants, declare a
serializable `vars` container on the source. Access it through
`source.vars` with Liquid's dynamic object indexing instead of using a long
`case` expression:

```ts
vars: {
  endpoint: {
    latest: "items/latest",
    popular: "rankings/popular",
  },
},
loader: {
  type: "json",
  url: "https://api.example.com/{{ source.vars.endpoint[scope.params.type] }}",
  // ...
}
```

URL and nested `fetchOptions` templates can access:

```text
source.vars
scope.params
```

Source `vars` accepts JSON-compatible objects, arrays, strings, finite
numbers, booleans, and `null`. Templates access it through `source.vars`,
which is available to every source template slot:
parameters, metadata icons, loader URLs, nested `fetchOptions`, JSON and HTML
fields, and Radar patches. Vars in provider `defaults` are inherited by every
source; source-level keys override default keys. Put shared origins, endpoint
paths, and lookup maps in provider vars when multiple source templates reuse
them.

Nested strings in `fetchOptions` may also use parsed parameters:

```ts
fetchOptions: {
  headers: {
    authorization: "Bearer {{ scope.params.token }}",
  },
}
```

For JSON APIs that accept an unsigned POST body, pass a JSON-compatible object.
`ofetch` serializes the body and applies templates to nested strings:

```ts
fetchOptions: {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: {
    channel: "{{ scope.params.channel }}",
    pageSize: 30,
  },
}
```

Keep browser-derived request options minimal. Stable headers such as `Accept`
and `X-Requested-With`, `credentials`, and `referrer` may be declared when an
endpoint requires them. Do not copy transient values such as XSRF tokens,
browser version client hints, priorities, or deployment version headers into a
source configuration. A browser extension may ignore `referrer` or a manually
set `Referer` header. When an endpoint requires a protected `Referer` or
`Origin` header, declare a narrowly scoped `requestRules` entry. The extension
translates these declarations into Manifest V3 `declarativeNetRequest` session
rules:

```ts
requestRules: [
  {
    action: {
      type: "modifyHeaders",
      requestHeaders: [
        {
          header: "Referer",
          operation: "set",
          value: "https://example.com/",
        },
      ],
    },
    condition: {
      requestDomains: ["api.example.com", "cdn.example.com"],
      resourceTypes: ["image", "xmlhttprequest"],
    },
  },
],
```

`requestRules` uses `Omit<Browser.declarativeNetRequest.Rule, "id">` directly.
The extension assigns session rule IDs automatically. `condition.requestDomains`
is required and must be covered by the source's `capabilities.network`.
Request rules may be shared at provider level or declared on an individual
source. Provider rules are inherited by every source, so every inheriting
source must declare the covered network hosts. Keep rules limited to the
domains and resource types that require the header.

When several variants represent the same source capability, prefer a validated
parameter over separate source IDs. A templated URL and a shared item selector
can often cover endpoint variants that return the same logical item shape.
When a page path exposes the parameter directly, prefer one Radar rule such as
`/section/:type` over one rule per allowed value. Parameter validation will
discard unsupported path values.

## JSON loaders

Use a JSON loader for APIs returning JSON.

```ts
loader: {
  type: "json",
  url: "https://api.example.com/articles",
  items: "data.items",
  fields: {
    title: "title",
    url: "url",
  },
}
```

### Selecting items with JMESPath

The `items` string is evaluated against the complete response:

```ts
items: "data.items"
items: "items[?id && title && url]"
items: "reverse(sort_by(data.items[?score > `10`], &score))"
items: "(result.tracks || playlist.tracks)[:100]"
```

JMESPath truthiness differs from JavaScript: numbers, including `0`, are
truthy. For numeric flags, compare explicitly instead of using negation:

```ts
items: "data.items[?is_ad != `1`]"
```

If `items` is omitted, the complete response must be an array.

### Selecting fields with JMESPath

A string field is always a JMESPath expression evaluated against the current
item:

```ts
fields: {
  title: "title || brief",
  url: "links.web",
  timestamp: "created_at",
}
```

JMESPath can also conditionally construct structured values such as pictures,
icons, marks, and iframe options:

```ts
inline: {
  mark: "card_label.icon && {src: card_label.icon, radius: `0`}",
}
```

The expression returns `null` when `card_label.icon` is missing and returns a
picture object when it exists. Prefer JMESPath object construction for
structured JSON output; Liquid templates are intended to produce strings.

Do not put a Liquid template directly in a JSON string field. Use an explicit
field object when formatting is required:

```ts
fields: {
  url: {
    select: "id",
    template: "https://example.com/articles/{{ scope.value | url_path }}",
  },
}
```

JSON field resolution order is:

```text
select → template
```

If `select` is omitted, `scope.value` starts as the complete current item.

### JSON template scope

A JSON field template can access:

```text
source.vars       shared template variables
scope.value          selected field value
scope.item           current response item
scope.response.json  complete response body
scope.params         parsed source parameters
scope.index          zero-based item index
scope.request.url    resolved request URL
```

```ts
title: {
  template: "{{ scope.response.json.label }}: {{ scope.item.title }}",
},
url: {
  select: "id",
  template: "https://example.com/{{ scope.params.topic | url_path }}/{{ scope.value | url_path }}",
},
inline: {
  text: {
    template: "{{ scope.item.source }}{% if scope.item.category %} · {{ scope.item.category }}{% endif %}",
  },
},
```

### Full JSON example

```ts
import type { ProviderConfig } from "@newsnext/source/registry"

export default {
  title: "Example API",
  defaults: {
    metadata: {
      home: "https://example.com",
      color: "blue",
      category: "tech",
    },
  },
  sources: {
    latest: {
      metadata: {
        title: "Latest",
        type: "timeline",
      },
      params: {
        topic: {
          type: "text",
          title: "Topic",
          default: "technology",
          pattern: "^[a-z-]+$",
        },
      },
      loader: {
        type: "json",
        url: "https://api.example.com/{{ scope.params.topic | url_path }}",
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
          inline: {
            text: {
              select: "score",
              template: "Score: {{ scope.value }}",
            },
          },
          preview: {
            html: {
              select: "summary",
              template: "<strong>{{ scope.value }}</strong>",
            },
            picture: "image.url",
          },
        },
      },
      cache: "5m",
    },
  },
} satisfies ProviderConfig
```

## HTML loaders

Use an HTML loader when data is extracted from a document.

```ts
loader: {
  type: "html",
  url: "https://example.com/news",
  items: ".article",
  fields: {
    title: ".article__title",
    url: {
      select: ".article__title",
      attr: "href",
    },
  },
}
```

### Items and filters

`items` is a CSS selector:

```ts
items: ".news-list > article"
```

`filter` can be another selector matched against each selected item:

```ts
filter: ":not(.advertisement)"
```

### Fields

A string HTML field is a CSS selector, relative to the current item, whose first
match's text content is trimmed:

```ts
fields: {
  title: ".title",
}
```

Use an object to control selection, extraction, and Liquid formatting:

```ts
fields: {
  url: {
    select: ".title",
    attr: "href",
    template: "{{ scope.value | absolute_url: scope.request.url }}",
  },
  timestamp: {
    select: "[data-timestamp]",
    attr: "data-timestamp",
    template: "{{ scope.value | times: 1000 }}",
  },
}
```

HTML field resolution order is:

```text
select → content/attr extraction → template
```

All fields are extracted before any field template is rendered. This two-phase
model means a template can compose values from the complete extracted item
regardless of field declaration order.

HTML field templates can access:

```text
source.vars     Shared template variables
scope.value        Current extracted field value
scope.item         Complete extracted item
scope.params       Resolved source parameters
scope.index        Zero-based item index
scope.request.url  Resolved loader URL
```

The `scope.item` object follows the `NewsItem` field structure:

```ts
fields: {
  title: {
    select: ".title",
    template: "{{ scope.value }} — {{ scope.item.inline.text }}",
  },
  url: {
    select: ".title",
    attr: "href",
    template: "{{ scope.value | absolute_url: scope.request.url }}",
  },
  inline: {
    text: ".category",
  },
}
```

Here, `scope.item.title`, `scope.item.url`, `scope.item.inline.text`, and other
values refer to their pre-template values. Templates do not depend on one
another, so template cycles and declaration-order differences cannot change
the result.

### Selection fallbacks

Provide an array of selectors when websites use different markup across pages
or deployments. The first selector with at least one match wins:

```ts
title: {
  select: [
    ".article-title",
    "h2 > a",
    "[data-role='title']",
  ],
}
```

Use CSS selector lists such as `".tag, .label"` when all alternatives should be
part of one result set. Use a `select` array only for ordered fallback behavior.

### Item and document scope

Selectors use the current item as their root by default. Use document scope for
page-level metadata shared by every item:

```ts
preview: {
  text: {
    scope: "document",
    select: "meta[property='og:site_name']",
    attr: "content",
  },
}
```

An omitted or empty `select` targets the current item itself. This is useful for
reading an item attribute:

```ts
url: {
  attr: "data-url",
  template: "{{ scope.value | absolute_url: scope.request.url }}",
}
```

### DOM traversal

Use `traverse` when a field lives in a related element instead of inside the
item. Traversal happens after choosing the item or document scope and before
applying `select`:

```ts
timestamp: {
  traverse: { type: "next", selector: "tr.metadata" },
  select: "time",
  attr: "datetime",
  template: "{{ scope.value | date_to_ms }}",
}
```

Available traversal operations are:

```ts
{ type: "parent" }
{ type: "closest", selector: ".card" }
{ type: "next" }
{ type: "next", selector: ".metadata" }
{ type: "previous" }
{ type: "previous", selector: ".heading" }
{ type: "siblings" }
{ type: "siblings", selector: ".related" }
```

Provide an array for a traversal chain:

```ts
traverse: [
  { type: "parent" },
  { type: "next", selector: ".metadata" },
]
```

Traversal handles common table, card, heading/content, and sibling-metadata
layouts declaratively.

### Text, attributes, and HTML

Fields extract trimmed text by default. Use `attr` for an attribute, or
`content` for explicit content extraction:

```ts
fields: {
  title: {
    select: ".title",
    content: "text",
  },
  preview: {
    html: {
      select: ".summary",
      content: "html",
    },
  },
}
```

Supported content modes are:

```text
text       Trimmed text content; this is the default
html       Inner HTML
outerHtml  The selected element and its HTML
```

`attr` takes precedence over `content`.

Use `brSeparator` when `<br>` elements carry meaningful line breaks:

```ts
preview: {
  text: {
    select: ".message",
    brSeparator: "\n",
    template: "{{ scope.value | normalize_lines: 2 }}",
  },
}
```

`brSeparator` applies only to text extraction. Other element boundaries retain
their normal Cheerio text behavior.

Only use HTML extraction when the output field actually accepts HTML. Liquid
values inserted into `inline.html` and `preview.html` templates remain escaped;
the template controls trusted markup, while extracted page content is treated
as untrusted text.

### Multiple matches

By default, only the first matched element is extracted. Set `all` to join every
match:

```ts
inline: {
  text: {
    select: ".tag",
    all: true,
    separator: " · ",
  },
}
```

The separator defaults to an empty string. Missing attributes are omitted from
the joined result.

### Relative URLs

Use `absolute_url` to resolve protocol-relative, root-relative, and
path-relative URLs against the final loader request URL:

```ts
url: {
  select: ".title",
  attr: "href",
  template: "{{ scope.value | absolute_url: scope.request.url }}",
}
```

Provide an explicit base when the page's links use a different origin or base
path:

```ts
template: "{{ scope.value | absolute_url: 'https://www.example.com/archive/' }}"
```

### Character decoding and custom fetch

For non-UTF-8 pages:

```ts
decoding: "gb2312"
```

For requests that need signatures or unusual handling:

```ts
fetch: async (url) => {
  return myFetch(url, {
    headers: {
      Referer: "https://example.com",
    },
  })
}
```

Prefer `fetchOptions` over a custom `fetch` when only standard request options
are required.

## RSS loaders

RSS sources require only a URL:

```ts
loader: {
  type: "rss",
  url: "https://example.com/feed.xml",
}
```

RSS items are mapped to `title`, `url`, and an optional parsed `timestamp`.

## News item output

Every loader returns `NewsItem[]`. A valid item requires non-empty `title` and
`url`. The simplified output shape is:

```ts
interface NewsItem {
  title: string
  url: string
  mobileUrl?: string
  timestamp?: number
  inline?: ({
    text?: string
    html?: string
    mark?: string | Picture | Array<string | Picture>
    icon?: string | Picture
  }) // Must contain text, html, mark, or icon.
  preview?: ({
    text: string
  } | {
    html: string
  }) & {
    picture?: string | Picture | Array<string | Picture>
    iframe?: string | AdvancedIframe
  }
}
```

`preview` uses either `text` or `html`. `inline` may use either text format or
decorations alone, but it must contain at least one of `text`, `html`, `mark`,
or `icon`. Prefer `text` unless markup is necessary.

Picture objects accept optional `scale` and `radius` values. Use `scale`
sparingly for compact inline icons and marks because transforms do not reserve
additional layout space.

For `inline.html` and `preview.html`, Liquid values are HTML-escaped
automatically:

```ts
preview: {
  html: {
    select: "summary",
    template: "<strong>{{ scope.value }}</strong>",
  },
}
```

Literal markup in the template remains markup; inserted values are escaped.

Timestamp values must be milliseconds. Timestamp fields are normalized to finite
numbers, and timeline-like sources are sorted descending by timestamp.

## Cache policy

Cache duration supports seconds, minutes, hours, and days:

```ts
cache: "30s"
cache: "5m"
cache: "2h"
cache: "1d"
```

The shorthand expands to:

```ts
cache: {
  version: 1,
  maxAge: "5m",
}
```

Use an explicit version when a loader behavior change should invalidate old
cached results:

```ts
cache: {
  version: 2,
  maxAge: "15m",
}
```

## Capabilities

Structured loaders infer the hostname of the default resolved URL as a network
capability. Declare additional or dynamic hosts explicitly:

```ts
capabilities: {
  network: ["api.example.com", "*.images.example.com"],
  cookies: [],
  browser: [],
}
```

Supported network declarations are:

```text
api.example.com
*.example.com
*
```

Only HTTP and HTTPS requests are accepted. A resolved structured-loader URL is
rejected when its hostname is not declared.

Custom loaders must declare their capabilities because the runtime cannot infer
their behavior:

```ts
loader: {
  type: "custom",
  load: async params => {
    // ...
  },
},
capabilities: {
  network: ["api.example.com"],
  cookies: [],
  browser: [],
},
```

When one source parameter selects official endpoints with incompatible response
schemas, use a custom loader to branch on the resolved parameter and normalize
each response into `NewsItem[]`. Keep the endpoint mapping explicit and test
the request selection and response normalization as pure functions.

Browser capabilities currently include features such as `history`, `bookmarks`,
and `favicon`.

Do not declare cookie secrets only to authenticate a request when the browser
automatically supplies its cookie jar through `credentials: "include"`.

## Secrets

Secrets describe values collected from a website rather than hard-coded in a
loader. Put shared secrets in provider defaults:

```ts
export default {
  title: "Example",
  defaults: {
    metadata: {
      color: "blue",
    },
    secrets: [
      {
        key: "session",
        type: "cookie",
        origin: "https://account.example.com",
        itemKey: "session_id",
        required: true,
        cache: true,
      },
    ],
  },
  sources: {
    // ...
  },
} satisfies ProviderConfig
```

Supported secret types are:

```text
cookie
localStorage
```

Provider secrets are available to its sources. Cookie secret origins also
contribute their hostnames to each source's cookie capabilities.

Put a secret on an individual source when only that source needs it, or when
the same website value has different requirements between sources:

```ts
sources: {
  public: {
    // ...
    secrets: [
      {
        key: "session",
        type: "cookie",
        origin: "https://account.example.com",
        itemKey: "session_id",
        required: false,
      },
    ],
  },
}
```

Source secrets are appended to provider secrets. Keep a key in only one scope
unless the loader intentionally needs both definitions.

A custom loader receives resolved secrets through its loader context:

```ts
load: async (_params, context) => {
  const session = context?.secrets?.session
  // ...
}
```

Use `context.updateSecrets` when a loader refreshes a stored value.

## Radar discovery

Radar rules detect supported sources from the active page.

Radar rules, resolved suggestions, draft cards, and saved source instances use
the same patch shape: `patch.params` for source parameters and
`patch.metadata` for display metadata.

When a source omits `radar`, has no parameters, and has an HTTP(S) `home`,
NewsNext automatically creates a default radar rule that matches every page on
the same host as `home`. A leading `www.` is ignored. Set `radar: []` to opt out
of this default. Generated origin rules have confidence `0`, while explicit
rules default to `1`; suggestions are ordered by descending confidence so a
specific explicit match appears before generic same-origin matches.
Parameterized sources must declare explicit radar rules so their URL values can
be mapped to source parameters.

```ts
radar: [
  {
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
  },
]
```

### Match rules

```ts
match: {
  hosts: ["example.com"],
  paths: ["/topics/:topic", "/category/:topic"],
  includes: ["mode=latest"],
}
```

- `hosts` are normalized to lowercase and ignore a leading `www.`.
- `paths` use `path-to-regexp` syntax.
- A wildcard such as `/*rest` requires at least one segment. List the resource
  root separately when both `/resource/:id` and its child routes should match.
- Capture stable resource IDs embedded in route segments, such as
  `list-:listId`, and map them explicitly to the corresponding source
  parameter.
- When a finite set of website routes maps to select option values, declare an
  explicit rule for each official route and map its slug to the stored option
  value. Do not assume the website slug and API value are interchangeable.
- When the same feed has both index and catalog routes, include every official
  route shape so Radar discovery works from each listing page.
- A bare index or detail route may omit a parameter value when the parameter's
  declared default represents that route.
- An omitted `paths` matches every path on the declared hosts.
- `includes` requires one of the strings to occur in the full URL.

### Radar parameters

Map every Radar source parameter explicitly, even when the source parameter and
URL variable have the same name. This keeps the parameter origin visible in the
configuration. Parameter mapping templates can access only
`scope.path`, `scope.query`, and
`scope.hashQuery` from the matched URL, plus `source.vars`:

```ts
patch: {
  params: {
    topic: "{{ scope.path.topic }}",
    page: "{{ scope.query.page }}",
    id: "{{ scope.query.id | default: scope.hashQuery.id }}",
    mode: "latest",
  },
}
```

Missing extracted values are omitted and the parameter schema supplies its
default. Extracted string values are trimmed, then run through the parameter
Liquid template, type coercion, and validation.

Radar resolves `patch.params` first. It trims, templates, coerces, and validates
those values against the source parameter schema. Radar metadata then receives
the final values as `scope.params`. An invalid parameter discards the suggestion
before metadata renders.

### Radar metadata

Radar metadata values are Liquid strings:

```ts
patch: {
  metadata: {
    title: "{{ scope.page.title | normalize_whitespace | regex_extract: '^(.+?)\\\\s+-\\\\s+Example$', 1 | default: scope.params.topic }}",
    home: "https://example.com/topics/{{ scope.params.topic | url_path }}",
  },
}
```

Metadata templates can access:

```text
source.vars
scope.path
scope.query
scope.hashQuery
scope.params
scope.page.title
```

When a stored select value is an implementation code, map it to its
human-facing option label in parameterized Radar titles instead of exposing the
raw value.

An invalid parsed parameter discards the suggestion.

## Source icons

A static icon URL can be assigned directly:

```ts
icon: "https://example.com/icon.png"
```

A parameterized icon uses Liquid and can access `scope.params` and
`source.vars`:

```ts
vars: {
  assets: "https://cdn.example.com",
},
icon: "{{ source.vars.assets }}/users/{{ scope.params.user | required | url_path }}.png"
```

Template failures return no source icon rather than breaking the card.

## Validation and security

Providers are validated during registration.

Runtime source registries:

- must be a JSON object keyed by complete `provider:source` IDs
- accept at most 1,000 sources and 2 MiB of parsed JSON
- limit source IDs to 200 characters
- reject prototype-related ID segments
- allow only declarative `json`, `html`, and `rss` loaders
- reject provider containers and custom executable loaders
- allow at most 10 request rules per source, 20 domains per rule, and 5 header
  modifications per rule
- scope installed request rules to extension-initiated requests and require
  every request domain to be declared by the source's network capabilities

The same registry validation runs during the registry build and when the
bundled artifact is resolved at runtime.

Liquid validation checks:

- syntax
- unknown filters
- allowed `source` and `scope` paths
- prohibited tags and raw output

JMESPath validation checks:

- syntax
- a maximum expression length of 2,000 characters
- prohibited prototype properties: `__proto__`, `constructor`, and `prototype`

HTML template values are escaped. Template and expression engines do not execute
JavaScript source text. An HTML loader processes at most 2,000 selected items
per request.

Network capabilities are enforced after URL template resolution and before a
structured loader sends its request.

## Testing

Meaningful loader, template, transform, validation, or radar changes require
tests.

### CLI source execution

The NewsNext extension can execute an authoring-format JSON provider directly in
its background runtime and return the resulting news items over a local
WebSocket. It does not install the provider, update the configured registry, or
use the source cache.

Use `newsnext source run` as the primary way to validate a source against its
live website or API. Do not substitute direct `curl` requests, ad hoc fetch
scripts, or direct runtime loader calls for this validation. Those paths bypass
the extension's parameter parsing, host permissions, capability enforcement,
secret resolution, and background execution environment. Direct requests may
still be used for read-only endpoint investigation, but a source is not
considered verified until it succeeds through the CLI and a connected
extension.

CLI connections are disabled by default in all builds. Open
**Settings → General → CLI Connection** and enable **Enable CLI connection**
before starting the CLI server. Disabling the setting immediately closes the
socket and stops heartbeat and reconnect activity.

The extension connects to `ws://127.0.0.1:43110` only while the setting is
enabled. To use a different loopback server URL, set
`WXT_SOURCE_CONNECTION_WS_URL` when building or starting the extension. The
settings panel shows whether the connection is disabled, connecting, connected,
or disconnected, along with the configured local WebSocket URL.

Start the persistent CLI server before running source commands:

```sh
bun run newsnext start
bun run newsnext status
```

`start` launches the server in the background and returns after it is ready.
`status` reports the server PID and all connected extension instances. The
server remains available across CLI invocations. Use `restart` after updating
the CLI, or stop it explicitly when it is no longer needed:

```sh
bun run newsnext restart
bun run newsnext stop
```

With the server and extension running, execute a source already registered in
the extension by its full `provider:source` ID:

```sh
bun run newsnext source run github:trending
```

List the source IDs available in the connected extension when the exact ID is
not known:

```sh
bun run newsnext source list
```

The list command writes one source ID per line to standard output. Use
`--browser` to select an instance when multiple extensions are connected and
`--timeout` to change how long the command waits for a connection.

Registered sources use the provider secrets already stored by the extension.
To execute a local provider definition instead, pass its JSON file from the
repository root:

```sh
bun run newsnext source run packages/registry/src/zhihu.json
```

The CLI infers the source ID when a provider defines exactly one source. Pass the
source ID after the provider path when a provider defines multiple sources:

```sh
bun run newsnext source run packages/registry/src/hackernews.json top
```

Set source parameters with repeatable `--param` flags or a JSON object:

```sh
bun run newsnext source run packages/registry/src/telegram.json \
  --param channel=telegram

bun run newsnext source run packages/registry/src/telegram.json \
  --params '{"channel":"telegram"}'
```

Use `--watch` to rerun the source whenever its provider file changes. Each watch
result is emitted as one line of JSON. Result JSON is written to standard
output; connection messages, execution summaries, and errors are written to
standard error, so the output remains pipe-friendly.

```sh
bun run newsnext source run packages/registry/src/zhihu.json --watch
```

Pass `-` instead of a provider path to read provider JSON from standard input.
Standard-input providers use `stdin` as their provider ID. `--watch` is not
available with standard input. Use `--provider-id` to override the provider ID,
`--browser` to select a browser when multiple extensions are
running, `--timeout` to change the connection and execution timeout, and
`--verbose` to include extension-side stacks in errors. Run the following
command for the complete option list:

```sh
bun run newsnext source run --help
```

The persistent server binds only to the configured loopback host. Source
commands submit execution requests to that local server, which waits for a
connected extension, sends a `source.run` request,
prints the returned `NewsItem[]`, and exits non-zero with actionable validation,
login, connection, or loader errors when execution fails.

CLI source execution uses the same defaults expansion, registry validation,
parameter normalization, templates, JMESPath, loaders, capabilities, and
background secret resolution as normal source execution. Registered source IDs
resolve directly from the extension registry and use their normal provider
secret cache. For local provider files, run-resolved secrets are stored under an
isolated `cli:<provider-id>` cache namespace by default. Pass
`--use-provider-secrets` only when a local provider run should read and update
the provider's normal stored secret cache. Browser cookies and local storage are
still read according to the source secret definitions.

The connection itself does not grant additional browser or host permissions.
Sources can only use permissions already granted to the extension through the
normal source authorization flow.

Relevant test files include:

```text
packages/source/src/core/template.test.ts
packages/source/src/core/loaders/json.test.ts
packages/source/src/core/loaders/html.test.ts
packages/source/src/core/loaders/rss.test.ts
packages/registry/src/contract.test.ts
apps/cli/src/source-run/options.test.ts
apps/cli/src/source-run/session.test.ts
apps/cli/src/daemon.test.ts
apps/extension/src/lib/background/source-runner.test.ts
apps/extension/src/lib/background/source-connection-websocket.test.ts
apps/extension/src/lib/background/source-connection-service.test.ts
apps/extension/src/lib/radar.test.ts
apps/extension/src/lib/source-loader.test.ts
```

Run:

```sh
bun run typecheck
bun run test
bun run lint
bun run build:cli
bun run build:chrome
git diff --check
```

The Chrome build should not contain `eval(` or `new Function`.

When testing a development extension after source runtime changes, reload the
extension from `chrome://extensions`. Hot reload may not replace an already
running extension service worker or its module graph.

## Authoring checklist

Before submitting a source:

- Use provider metadata for values shared by related sources.
- Prefer JMESPath and CSS selectors over TypeScript functions.
- Keep selection, transformation, and formatting separate.
- Use milliseconds for timestamps.
- Use `text` instead of `html` when markup is unnecessary.
- Escape URL components with `url_path` or `url_query`.
- Prefer the provider's canonical desktop or web origin when equivalent APIs are available.
- Prefer a stable structured API over parsing page HTML, even when the API uses another provider origin.
- Declare image hosts that require extension host access for request-header rules.
- Declare every possible network hostname.
- Add radar rules for parameterized sources when appropriate.
- Use a unique radar rule ID within each source.
- Add tests for meaningful parsing and discovery behavior.
- Regenerate the source index and metadata.
- Validate live source execution with `newsnext source run`; do not replace this
  check with direct endpoint or runtime-loader requests.
- Update this guide when source authoring behavior changes.
