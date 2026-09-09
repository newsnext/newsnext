# NewsNext

The next official version of [ourongxing/newsnow](https://github.com/ourongxing/newsnow)

**NewsNext is in early development. Expect frequent breaking changes.**

The browser extension works on its own. Use it with the CLI and SDK for the full
experience. The CLI is currently closed source, but will be open-sourced when
the time is right.

## Documentation

- [Product requirements and current baseline](docs/PRD.md)
- [Application architecture](docs/APPLICATION_ARCHITECTURE.md)
- [Source authoring guide](docs/SOURCE_GUIDELINE.md)
- [Source architecture](docs/SOURCE_ARCHITECTURE.md)
- [Proposed data stream processing](docs/DATA_STREAM_ARCHITECTURE.md)
- [Design guideline](docs/DESIGN_GUIDELINE.md)
- [Performance guideline](docs/PERFORMANCE_GUIDELINE.md)
- [CLI command reference](skills/newsnext-sdk/references/commands.md)

Historical references: [Source request research](docs/SOURCE_REQUESTS.md) and
[Chrome Web Store review](docs/CHROME_WEB_STORE_READINESS.md). Their dated findings
are not current implementation or release status.

## Landing deployment

For Cloudflare Workers Builds, use the repository root and these settings:

- Build variables: `SKIP_DEPENDENCY_INSTALL=1`, `BUN_VERSION=1.4.0`.
- Build command: `bun run landing:install && bun run landing:build`.
- Deploy command: `bun run --cwd apps/landing wrangler deploy`.

`landing:install` temporarily limits workspace resolution to landing, UI, shared,
cmdk, and TypeScript configuration. It uses the existing lockfile as a version seed,
disables lifecycle scripts, and restores the manifest and lockfile afterward.
It excludes the extension, SDK, and CLI. Run it in a fresh build checkout;
local development can continue using `bun run landing:deploy` with existing dependencies.
