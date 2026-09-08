# NewsNext CLI SDK

`@newsnext/sdk` is the public TypeScript package in `web/packages/sdk`. It invokes
the Rust CLI over versioned JSONL stdin/stdout. It neither reads SQLite nor imports
private implementation code. `@newsnext/cli` distributes the standalone Rust
executable through platform-specific optional npm packages built with
`@napi-rs/cli --bin`; no Node-API addon or Rust compiler is needed at runtime.

## Installation

After publication, install both packages:

```sh
npm install @newsnext/sdk @newsnext/cli
npx newsnext status
```

Node.js 22+ and Bun are supported. CLI packages target macOS, Linux glibc and
Windows, on x64 and arm64. The SDK first resolves the installed `@newsnext/cli`
binary, then uses `newsnext` on PATH if the package is absent. A broken installed
package is an error. Optional dependencies must remain enabled when installing the
CLI. Packages are not published merely by building the repository.

## Client and environment

```ts
import { createClient } from "@newsnext/sdk"

const client = createClient({ environment: "production" })
const status = await client.status()
```

The default environment is production, independently of ambient `NEWSNEXT_ENV`.
Choose development explicitly for repository data. To use the development CLI:

```ts
const client = createClient({
  environment: "development",
  command: ["bun", "run", "dev"],
  cwd: "/absolute/path/to/newsnext/cli",
})
```

The executable and prefix arguments are an array, never a shell command string.
Clients hold no persistent process and need no close call. Each request owns its
process; early iterator return or an AbortSignal terminates it. Unix cancellation
also terminates the process group (including development wrappers); on Windows,
prefer the installed binary rather than a custom wrapper for cancellation.

`timeoutMs` is 1–600000, default 60000, per daemon request. The SDK additionally
bounds inactive CLI output waits, allowing two seconds for startup. Time spent
processing a yielded observation is excluded. Exports have no fixed total timeout;
use AbortSignal for a total deadline. Killing a request does not undo an Action
already sent to the Worker.

## History

```ts
const datasets = await client.history.datasets({ sourceId: "weibo:hot-search" })
const candidates = datasets.filter(dataset => dataset.params.type === "search")
if (candidates.length !== 1) throw new Error("Select a dataset by Worker and Source version")
const dataset = candidates[0]!

const titles = new Set<string>()
for await (const snapshot of client.history.export({
  datasetId: dataset.id,
  from: "2026-09-08T00:00:00+08:00",
  to: "2026-09-08T23:59:59.999+08:00",
})) {
  for (const item of snapshot.items) {
    if (typeof item.value.title === "string") titles.add(item.value.title)
  }
}
```

- `history.datasets(filter)` collects metadata pages. Filters are `workerId`,
  `providerId`, `sourceId` (full qualified ID), and `sourceVersion`.
- `history.datasetPage(query)` exposes explicit `cursor` / `limit` pagination.
- `history.observations({ datasetId, from?, to?, cursor?, limit? })` returns one
  metadata page with completeness diagnostics.
- `history.get(datasetId, observedAt)` returns one exact reconstructed observation.
- `history.compare({ datasetId, before, after })` returns additions, missing items,
  edits and movements, together with completeness diagnostics.
- `history.export({ datasetId, from?, to? })` yields full observations in ascending
  order through one CLI process. It throws on incomplete/missing data; any records
  yielded before an error are only a partial export. Finish iteration successfully
  before treating an analysis as complete.

All methods accept a final `{ timeoutMs?, signal? }` argument. Times accept safe,
nonnegative Unix milliseconds, Date objects, YYYY-MM-DD (midnight UTC), or RFC 3339
with an explicit timezone. Both range bounds are inclusive. Page limits are 1–250.
An omitted export upper bound is fixed from the dataset's latest timestamp on the
first page. Exports are not transactional snapshots: late/backfilled observations
can still change earlier intervals. Dataset discovery is also a live listing.

Observation items contain `identity: { providerId, url }`, `position` and `value`.
Positions represent retained list order. Do not treat ranking as a numeric heat
score, or count repeated appearances as distinct topics.

## Source execution, fetch and Actions

```ts
const workerId = status.workers[0]?.id
const result = await client.run({
  sourceId: "weibo:hot-search",
  params: { type: "search" },
}, { workerId })

const response = await client.fetch({ url: "https://example.com/feed.xml" }, { workerId })
const catalog = await client.actions.list({ workerId })
```

Use the full Worker ID returned by status. With no Worker ID the daemon selects
only when there is exactly one connected Worker; it never prompts. `run` accepts
a registered Source, or `{ providerId, provider, sourceId, params?, debug?,
useProviderSecrets? }` for an in-memory provider. Provider JSON is not read from a
path by the SDK. `fetch` accepts URL, method, header pairs and a string body; the
Worker validates requests and owns cookies.

For other operations discover `actions.list()` first, then call
`actions.execute(name, input, { workerId })`. Inputs and outputs follow the runtime
catalog's JSON schemas. Mutating Actions require the same user authorization as
terminal commands. `NewsNextError.code` preserves structured daemon/Worker errors;
transport failures may also be native process or stream errors.

## Package builds

In the private CLI repository, platform support is maintained only in
`npm/targets.json` (Rust target and CI runner). One script handles distribution:

```sh
bun run package build                # Build the current platform
bun run package build RUST_TARGET    # Build a configured target
bun run package sync                 # Regenerate npm manifests and dependencies
bun run package check                # Read-only check for generated metadata drift
```

`build` synchronizes metadata before invoking napi-rs and writes the executable to
`npm/<platform>/`. Run `bun install` after changing targets or package versions to
refresh the lockfile. CI derives its matrix using `package matrix`, checks metadata,
builds each platform, and uses standard `npm pack` to assemble the tarballs. Generated
platform manifests and `optionalDependencies` are committed but never edited by hand.
The CLI package allowlist includes only its launcher and binary resolver. Rust
sources are excluded from npm tarballs. Each platform package contains only its
manifest and executable. Linux CI builds on Ubuntu 22.04 (glibc 2.35 baseline).

The private `npm CLI packages` workflow is currently disabled and stored as
`.github/workflows/npm.yml.disabled`. Rename it to `npm.yml` to enable manual
dispatch. When enabled, it builds and packs all platforms and defaults
to artifact generation; npm publication occurs only when its explicit `publish`
input is enabled and `NPM_TOKEN` is configured. Platform packages publish before
the launcher, and prereleases use the `next` tag. Build the public SDK with
`bun run --filter @newsnext/sdk build` in web; its standard npm prepack hook also
builds JavaScript and declarations. Keep SDK/CLI package versions aligned.
