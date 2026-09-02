# Source discovery, authoring, and testing

Use this workflow when creating or changing a NewsNext Source. A Source belongs under `registry/src` in the NewsNext web repository. If `docs/SOURCE_GUIDELINE.md` is available, read it before editing; it is the canonical schema and authoring contract. Follow the repository's `AGENTS.md` for build and test commands.

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
- Use a stable first-party `icon` or omit it. Use source or loader metadata for `title`, `home`, `desc`, and instance-specific `badge`.
- Model user choices as validated parameters. Prefer one parameterized Source over duplicated variants when their loader and output shape are shared.
- Add Radar rules when a page URL or page state can fully configure a Source. A suggestion must capture all meaningful state already expressed by the page.
- For JSON loaders, use bounded JMESPath expressions and Liquid templates. For HTML loaders, use stable CSS selectors and ordered fallbacks.
- Every item must produce a non-empty `title` and `url`. Use milliseconds for `publishedAt` and `updatedAt`; keep semantic author, stats, attributes, icon, mark, and content fields separate.
- Preserve meaningful upstream order. Use `metadata.type: "ranking"` for ranked results and `sortByTimestamp` only when grouped chronological items need normalization.
- Declare every possible network hostname. Keep request options minimal and never add a request solely to enrich metadata.
- Increase `version` only when a behavioral or result-shape change must invalidate stored results.

Use TypeScript custom loaders as a last resort. They must use `context.fetch`, declare network and cookie capabilities, propagate cancellation, return `{ items, metadata? }`, and normalize multiple response shapes through shared helpers. Collect required website values through declared cookie or local-storage secrets; do not expose or commit actual secret values.

## Investigate with `fetch`

Resolve the CLI invocation from the active instructions. Normally it is `newsnext`; in the private wrapper it is `bun run dev` from the `cli` directory.

Use `fetch` to verify the exact feed, API, or HTML request from the connected extension before encoding it:

```sh
newsnext fetch 'https://example.com/feed.xml' -i
newsnext fetch 'https://example.com/api/items' -H 'Accept: application/json' -i
```

In the private wrapper, equivalent commands run from `cli/`:

```sh
bun run dev fetch 'https://example.com/feed.xml' -i
bun run dev fetch 'https://example.com/api/items' -H 'Accept: application/json' -i
```

Use the response to confirm status, content type, redirects, encoding, and the actual item shape. Begin with the minimum request and add only demonstrated requirements. `fetch` uses the connected browser's cookies but cannot verify Source parameter parsing, capability enforcement, secrets, result normalization, or Radar; it is investigation, not the final test.

For a feed candidate, test the standard parser before building a dedicated provider:

```sh
newsnext run rss:feed --param url='https://example.com/feed.xml'
```

## Validate with `run`

Run the local provider after every meaningful change. Select a source ID when the provider defines more than one and exercise representative non-default parameter values.

From a normal NewsNext web checkout:

```sh
newsnext run registry/src/example.json latest --debug
newsnext run registry/src/example.json latest --param topic=technology
newsnext run registry/src/example.json latest --watch
```

From `cli/` in the private wrapper, point to the sibling web checkout:

```sh
bun run dev run ../web/registry/src/example.json latest --debug
bun run dev run ../web/registry/src/example.json latest --param topic=technology
bun run dev run ../web/registry/src/example.json latest --watch
```

For a TypeScript provider, first build the registry and run the registered Source ID unless the installed CLI version explicitly supports that local format. For a local provider that uses stored secrets, pass `--use-provider-secrets`; never print or commit the secret values.

Use `--worker <ID_PREFIX>` when several Workers are connected or the run must be non-interactive. Use `--verbose` for extension-side stacks after an ordinary run fails. Use `--debug` only while diagnosing requests because its output can contain sensitive headers and response bodies.

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

After live behavior is correct:

1. Build generated registry artifacts with `bun --filter=@newsnext/registry run build` from the web repository.
2. Review generated changes; never hand-edit them.
3. Run the repository-required typecheck and tests, plus `git diff --check`.
4. Confirm no credentials, session identifiers, transient request headers, or debug response data entered the diff.
5. Report the chosen transport, the higher-priority options considered, the existing Source used as a model, live `fetch`/`run` coverage, and any browser-only or authenticated behavior that could not be tested.
