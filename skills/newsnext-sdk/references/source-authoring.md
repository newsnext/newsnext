# Source discovery, authoring, and testing

Use this workflow when creating or changing a NewsNext Source. Create local
Providers by default in `~/.config/newsnext/sources/` (`newsnext.dev` for the
development CLI, or `NEWSNEXT_SOURCES_PATH` when configured). A web repository
checkout is only needed when explicitly contributing a bundled Provider to
`registry/src`. Local and bundled Providers share the same authoring contract.

## Start from the user's intent

Determine the stream the user actually wants: latest articles, a ranking, a topic, an account, a playlist, followed content, or another stable collection. Prefer streams whose membership follows an explicit user choice. Do not substitute an opaque personalized recommendation feed unless the user specifically requests it.

When the user supplies only a website or page URL, load the environment's browser-control skill and open that URL before proposing or writing a Source. Reuse the user's signed-in browser state when relevant. Do not ask the user to identify an endpoint that can be discovered from the page.

In the browser:

1. Identify the page's content stream, meaningful variants, filters, pagination, item fields, canonical URLs, and whether sign-in is required.
2. Look for RSS, Atom, or JSON Feed links in visible navigation and document metadata such as `link[rel~="alternate"]`.
3. Inspect Fetch/XHR traffic while loading the page and changing relevant filters. Record stable request URLs, methods, minimal required headers or bodies, response shapes, and which UI state should become Source parameters.
4. Inspect server-rendered HTML and stable semantic selectors if feeds and suitable public APIs are unavailable.
5. Consider authenticated or undocumented private APIs only after the earlier options are unsuitable.

If browser automation is unavailable, say which browser-only evidence could not be verified. Do not claim that a private endpoint, login flow, or client-rendered selector was tested from a plain HTTP response alone.

## Choose the transport in strict priority order

Evaluate candidates in this order and use the first one that can faithfully provide the requested stream:

1. **RSS, Atom, or JSON Feed.** Prefer a stable feed because it has a standard parser and minimal site coupling. Confirm that it contains useful item titles and URLs, represents the requested stream, and updates promptly enough for the use case. Use another transport when the feed is materially delayed. Do not create a site-specific generic forum Source when the built-in `rss:feed` already covers the use case.
2. **Public structured API.** Prefer a stable JSON endpoint that does not depend on private account state, copied session tokens, or transient browser headers. Map it with a declarative JSON loader.
3. **HTML.** Use a declarative HTML loader when the meaningful items are present in fetched HTML and stable selectors can extract them. If the HTML contains a strict JSON data element, use a JSON loader with `embeddedJson: { select: "script#__NEXT_DATA__" }` (or the page's actual CSS selector); it parses the selected element once and reuses the usual JMESPath items and fields. This still fetches HTML, without an extra API request. Do not use HTML parsing for a client-rendered shell with no item data.
4. **Private API.** Use only when the requested stream requires the signed-in session or no earlier option is adequate. Minimize requests and rely on NewsNext's browser session, declared secrets, and bounded capabilities. Never hard-code cookies, access tokens, signatures, build IDs, or transient DevTools headers.

Record why each higher-priority option was unavailable or insufficient. This makes the chosen contract reviewable and prevents an accidental dependency on a fragile private endpoint.

Transport choice and source-file format are separate decisions. Prefer a JSON provider file for declarative `rss`, `json`, and `html` loaders. Use JavaScript only when the Source genuinely needs a custom loader, custom request callback, imported helper, browser API, computed configuration, request signing, token refresh, or response normalization that declarative fields cannot express. Read the authoritative [Source manifest schema](schemas/source.json) and [parameter schema](schemas/params.json) for accepted JSON fields and constraints.

JavaScript Providers use standard ESM with explicit relative file extensions (`./shared.js`). Copy a multi-file Provider directory together with its helpers. Import shared HTML parsing (`parseHtml`) and relative-date parsing (`parseRelativeDate`) from `@newsnext/source-kit/utils`; these helpers are available in both bundled and local runtimes. Local modules also expose `fieldTransforms` and `SourceLoginRequiredError` from `@newsnext/source-kit/core`; configuration resolution, standard loaders, and result normalization belong to the extension. Provider configuration must be JSON-serializable except for `loader.load`, `loader.request`, and `loader.annotation` functions, including defaults. Put request hooks and non-JSON request options inside a custom `request` or `load` callback. Radar page parameters use portable `query`, `date-range`, or `selected` rules from the Source schema rather than page-executed functions.

## Reference existing Sources first

Before writing a new provider, inspect the installed examples and, when a web
checkout is available, `registry/src`. Select the closest existing Source by
transport, parameter shape, metadata, and discovery behavior. Prefer JSON examples:

- RSS: `registry/src/rss.json`
- Public JSON API: `registry/src/36kr.json` or `registry/src/netease-music.json`
- HTML: `registry/src/hackernews.json`, `registry/src/github.json`, or `registry/src/telegram.json`
- Authenticated custom API, only when required: `registry/src/x/index.js`, `registry/src/jike/index.js`, or the relevant nested JavaScript provider

Reuse established shapes and field semantics; do not copy provider-specific selectors, tokens, headers, or workarounds. Search for a closer example when the repository has evolved beyond this list.

## Implement the smallest declarative Source

For a new declarative Provider, create `sources/<provider-id>.json`. For
JavaScript, use `sources/<provider-id>.js`, `.mjs`, or
`sources/<provider-id>/index.js` / `index.mjs` with imported helpers. Changes
reload automatically. A Provider and all its Sources use one format. Local
Providers take priority over plugin and bundled Providers as a whole; choose
a distinct Provider ID unless replacing an existing Provider is intended.
For an explicitly requested bundled contribution, use `registry/src` and
regenerate its artifacts; never edit `registry.json` or `sources.js` directly.

Keep the configuration focused:

- Set provider `title`, `color`, and a matching `category`; set `baseUrl` when URLs share a stable base.
- Use a stable first-party `icon` or omit it. Use source or loader metadata for `title`, `home`, `desc`, and card-specific `badge`.
- Keep a Source's static default `metadata.title` generic and do not include either the ASCII `|` or full-width `｜` separator. For a LiveCard title, prefer ASCII ` | ` between its resolved identity or query and the selected variant, such as `NewsNext | Latest`.
- Model user choices as validated parameters. Prefer one parameterized Source over duplicated variants when their loader and output shape are shared.
- Add Radar rules when a page URL or page state can fully configure a Source. A suggestion must capture all meaningful state already expressed by the page.
- For JSON loaders, use bounded JMESPath expressions for selection, fallbacks, and array projection/join. For HTML loaders, use stable CSS selectors and ordered fallbacks.
- Use `loader.query` for query parameters (values are encoded once; empty/null values are omitted), and field `transform` for text, number, date, and regex conversions. A transform can be one operation or an ordered array; it runs before `template`. Templates support path/literal interpolation, `??`/`||` fallback, and one trailing `url_path` or `url_query` encoder; `{% ... %}` tags are rejected. Use JavaScript for conditional logic.
- Templates produce strings except in `loader.fetchOptions.json`: a whole-expression value preserves its JSON type; mixed text stays a string. `??` replaces only missing/null values and preserves empty text, `false`, `0`, and empty arrays. `||` replaces falsy values, including empty text, `false`, `0`, and `NaN`; both operators short-circuit and return the chosen value. Each expression can chain one operator kind; mixing `??` and `||` or using parentheses is unsupported. Missing inputs render as empty text and preserve surrounding text. Optional query values are omitted naturally; empty request URLs and complete JSON bodies are checked at the request boundary.
- Use `loader.annotation` for presentation: a template string in JSON/JavaScript Sources, or an `(item) => string | undefined` formatter (optionally async) in JavaScript Sources. Formatters receive the normalized `NewsItem` and produce `annotations` separately from item data. Local formatters execute in the same module session as the loader. Annotations are trimmed; missing template inputs render as empty text. Use `??` for explicit fallback text; no empty fallback is needed. Other rendering failures are reported and isolated to the affected annotation. Keep `attributes` semantic; do not store formatted display text there.
- Every item must produce a non-empty `title` and `url`. Use milliseconds for `publishedAt`; keep semantic author, stats, attributes, icon, mark, and content fields separate.
- Preserve meaningful upstream order. Use `metadata.type: "ranking"` for ranked results and `sortByTimestamp` only when grouped chronological items need normalization.
- Declare every possible network hostname. Keep request options minimal and never add a request solely to enrich metadata.
- Increase `version` only when a behavioral or result-shape change must invalidate stored results.

Runnable provider examples live at `references/examples/`: `rss-provider`
(minimal RSS feed), `json-provider` (JSON API with a `number` parameter,
JMESPath fields, and structured query parameters), and `html-provider` (HTML
scraping with CSS selectors and ranking metadata). Copy the closest example to
the local `sources/<provider-id>.json`, substitute a real stream, and run it after
every meaningful change with the script under **Validate Sources**.

Use JavaScript custom loaders as a last resort. They must use `context.fetch`, declare network and cookie capabilities, propagate cancellation, return `{ items, metadata? }`, and normalize multiple response shapes through shared helpers. Collect required website values through declared cookie or local-storage secrets; do not expose or commit actual secret values.

## Investigate requests

Use `client.fetch` to verify the feed, API, or HTML request through a connected
browser:

```sh
newsnext eval '
const response = await client.fetch({
  url: "https://jsonplaceholder.typicode.com/posts/1",
  headers: [["Accept", "application/json"]]
})
return {
  status: response.status,
  url: response.url,
  contentType: response.headers.find(([name]) => name.toLowerCase() === "content-type")?.[1] ?? null,
  bodyPreview: response.body.slice(0, 1000)
}
'
```

Use the response to confirm status, content type, redirects, encoding, and the
item shape. Begin with the minimum request and add demonstrated requirements.
`client.fetch` uses the connected browser's cookies. Verify Source parameters,
capabilities, secrets, and result normalization with `client.run`.

For a feed candidate, test the standard parser before building a dedicated provider:

```sh
newsnext eval '
const result = await client.run({
  sourceId: "rss:feed",
  params: { url: "https://news.ycombinator.com/rss" }
})
return { execution: result.execution, sample: result.data.slice(0, 3) }
'
```

## Validate Sources

Run its registered Source ID after every meaningful change. Select a source ID when
the provider defines more than one and exercise representative non-default
parameter values:

```sh
newsnext eval '
const result = await client.run({
  sourceId: "<provider-id>:latest",
  params: { topic: "technology" }
})
return { execution: result.execution, itemCount: result.data.length, sample: result.data.slice(0, 3) }
'
```

Local JSON and JavaScript use this same validation path; no registry build is
needed. JavaScript loads directly as ESM in the Node.js 24+ module host, while `ctx.fetch` and
`ctx.updateSecrets` use the originating browser. Use these context APIs;
`window`, `document`, and extension APIs are unavailable in the local worker.
Registered Sources use their Provider's stored secrets automatically.
For a temporary JSON preview, pass `providerId`, `provider`, and an unqualified
`sourceId` to `client.run`; `useProviderSecrets: true` opts that preview into the
stored Provider secrets. File imports in `eval` need absolute paths.

If a run requires authentication, open its login URL and rerun the script.
Pass large numeric identifiers as strings in `params` to preserve every digit.

Pass `{ workerId }` as the second options argument to `client.run` or
`client.fetch`, using the full ID from `client.status()`, when browser choice
matters. Set `debug: true` in `client.run` while diagnosing requests; its
`fetches` can contain sensitive headers and response bodies.

Check the complete result, not just the exit status:

- The result is non-empty and contains no more than 50 items.
- Every item has a meaningful title and an absolute, stable URL.
- Timestamps, ordering, ranking/list semantics, authors, stats, images, and content match the page.
- Dynamic metadata describes the selected account, channel, topic, or feed without an extra metadata-only request.
- Default and representative parameter combinations select the intended stream.
- Relative URLs, redirects, non-ASCII text, missing optional fields, and authentication failures behave cleanly.
- Debug fetches use only declared hosts and the minimum number of requests.

If Radar is present, revisit every matching page and meaningful URL or in-page state with the browser skill. Confirm the suggestion captures all parameters and metadata needed to create the configured Source without follow-up editing.

## Finish repository verification

After live behavior is correct, run the applicable syntax/type checks and diff
hygiene checks. For bundled contributions, regenerate registry artifacts with
the repository's build and follow its `AGENTS.md`. Then:

1. Confirm no credentials, session identifiers, transient request headers, or debug response data entered the diff.
2. Report the chosen transport, the existing Source used as a model, live
   `client.fetch` / `client.run` coverage, and remaining browser or
   authentication constraints.
