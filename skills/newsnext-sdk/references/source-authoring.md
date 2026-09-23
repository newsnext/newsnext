# Source discovery, authoring, and testing

Use this workflow when creating or changing a NewsNext Source. Writing registry
files requires a NewsNext web repository checkout, where Sources live under
`registry/src`. With only the installed skill and CLI and no checkout, stop
after discovery: report the requested stream, the verified feed, API, or HTML
evidence, and the recommended transport instead of writing registry files.

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

1. **RSS, Atom, or JSON Feed.** Prefer a stable feed because it has a standard parser and minimal site coupling. Confirm that it contains useful item titles and URLs and represents the requested stream. Do not create a site-specific generic forum Source when the built-in `rss:feed` already covers the use case.
2. **Public structured API.** Prefer a stable JSON endpoint that does not depend on private account state, copied session tokens, or transient browser headers. Map it with a declarative JSON loader.
3. **HTML.** Use a declarative HTML loader when the meaningful items are present in fetched HTML and stable selectors can extract them. Do not use HTML parsing for a client-rendered shell with no item data.
4. **Private API.** Use only when the requested stream requires the signed-in session or no earlier option is adequate. Minimize requests and rely on NewsNext's browser session, declared secrets, and bounded capabilities. Never hard-code cookies, access tokens, signatures, build IDs, or transient DevTools headers.

Record why each higher-priority option was unavailable or insufficient. This makes the chosen contract reviewable and prevents an accidental dependency on a fragile private endpoint.

Transport choice and source-file format are separate decisions. Prefer a JSON provider file for declarative `rss`, `json`, and `html` loaders. Use TypeScript only when the Source genuinely needs a custom loader, custom request callback, imported helper, browser API, computed configuration, request signing, token refresh, or response normalization that declarative fields cannot express.

## Reference existing Sources first

Before writing a new provider, inspect `registry/src` and select the closest existing Source by transport, parameter shape, metadata, and discovery behavior. Prefer JSON examples:

- RSS: `registry/src/rss.json`
- Public JSON API: `registry/src/36kr.json`, `registry/src/zhihu.json`, or `registry/src/netease-music.json`
- HTML: `registry/src/hackernews.json`, `registry/src/github.json`, or `registry/src/telegram.json`
- Authenticated custom API, only when required: `registry/src/x/index.ts`, `registry/src/jike/index.ts`, or the relevant nested TypeScript provider

Reuse established shapes and field semantics; do not copy provider-specific selectors, tokens, headers, or workarounds. Search for a closer example when the repository has evolved beyond this list.

## Implement the smallest declarative Source

For a new declarative provider, create `registry/src/<provider-id>.json`. A provider and all of its Sources must use one format; do not split it between JSON and TypeScript. Do not edit generated `registry/registry.json` or `registry/sources.ts` directly.

Keep the configuration focused:

- Set provider `title`, `color`, and a matching `category`; set `baseUrl` when URLs share a stable base.
- Use a stable first-party `icon` or omit it. Use source or loader metadata for `title`, `home`, `desc`, and card-specific `badge`.
- Keep a Source's static default `metadata.title` generic and do not include either the ASCII `|` or full-width `｜` separator. For a LiveCard title, prefer ASCII ` | ` between its resolved identity or query and the selected variant, such as `NewsNext | Latest`.
- Model user choices as validated parameters. Prefer one parameterized Source over duplicated variants when their loader and output shape are shared.
- Add Radar rules when a page URL or page state can fully configure a Source. A suggestion must capture all meaningful state already expressed by the page.
- For JSON loaders, use bounded JMESPath expressions and Liquid templates. For HTML loaders, use stable CSS selectors and ordered fallbacks.
- Every item must produce a non-empty `title` and `url`. Use milliseconds for `publishedAt`; keep semantic author, stats, attributes, icon, mark, and content fields separate.
- Preserve meaningful upstream order. Use `metadata.type: "ranking"` for ranked results and `sortByTimestamp` only when grouped chronological items need normalization.
- Declare every possible network hostname. Keep request options minimal and never add a request solely to enrich metadata.
- Increase `version` only when a behavioral or result-shape change must invalidate stored results.

Runnable provider examples live at `references/examples/`: `rss-provider`
(minimal RSS feed), `json-provider` (JSON API with a `number` parameter,
JMESPath fields, and a Liquid-conditional URL), and `html-provider` (HTML
scraping with CSS selectors and ranking metadata). Copy the closest example to
`registry/src/<provider-id>.json`, substitute a real stream, and run it after
every meaningful change with the script under **Validate Sources**.

Use TypeScript custom loaders as a last resort. They must use `context.fetch`, declare network and cookie capabilities, propagate cancellation, return `{ items, metadata? }`, and normalize multiple response shapes through shared helpers. Collect required website values through declared cookie or local-storage secrets; do not expose or commit actual secret values.

## Investigate requests

Use `client.fetch` to verify the feed, API, or HTML request through a connected
browser:

```sh
newsnext eval -e '
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
newsnext eval -e '
const result = await client.run({
  sourceId: "rss:feed",
  params: { url: "https://news.ycombinator.com/rss" }
})
return { execution: result.execution, sample: result.data.slice(0, 3) }
'
```

## Validate Sources

Run the local provider after every meaningful change. Select a source ID when
the provider defines more than one and exercise representative non-default
parameter values:

```sh
newsnext eval -e '
const { readFile } = await import("node:fs/promises")
const provider = JSON.parse(await readFile("/absolute/path/to/registry/src/<provider-id>.json", "utf8"))
const result = await client.run({
  providerId: "<provider-id>", provider, sourceId: "latest",
  params: { topic: "technology" }
})
return { execution: result.execution, itemCount: result.data.length, sample: result.data.slice(0, 3) }
'
```

Use the checkout's absolute file path: `eval` runs in the daemon's runtime
directory.

For a TypeScript provider, build the registry and run its registered Source ID.
For a local provider that uses stored secrets, set `useProviderSecrets: true` in
the `client.run` input.

If a run requires authentication, open its login URL and rerun the script.
Pass large numeric identifiers as strings in `params` to preserve every digit.

Pass `{ workerId }` with the full ID from `client.status()` when browser choice
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

After live behavior is correct, hand off to the repository workflow that owns
the registry: regenerate generated artifacts with the repository's own build
(never hand-edit them), and run the repository-required typecheck, tests, and
diff hygiene checks per that repository's `AGENTS.md`. Then:

1. Confirm no credentials, session identifiers, transient request headers, or debug response data entered the diff.
2. Report the chosen transport, the existing Source used as a model, live
   `client.fetch` / `client.run` coverage, and remaining browser or
   authentication constraints.
