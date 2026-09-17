---
name: newsnext-sdk
description: Use the NewsNext CLI and TypeScript SDK to query history, manage Boards and LiveCards, invoke Actions, and create or test Sources, including discovering a Source from a website URL. Apply to NewsNext operations and Widget SDK usage; do not use it for changing the CLI or SDK implementation itself.
---

# NewsNext SDK

For terminal commands, invoke the executable by command name as `newsnext`. Do not search for its binary, infer an installation path, or replace it with `cargo run` unless the user explicitly asks to locate, build, or debug the CLI implementation.

Treat production as the default runtime environment and make it explicit when executing commands:

```sh
NEWSNEXT_ENV=production newsnext <command>
```

Honor a repository's `AGENTS.md` when it selects another environment. Environment selection applies consistently to the daemon endpoint, database, widget directory, and Native Messaging host, so use the same `NEWSNEXT_ENV` for related commands.

`newsnext <command> --help` is the source of truth for command usage; consult it
before answering a usage question or operating the CLI. [references/commands.md](references/commands.md)
only lists the available commands and the conventions `--help` does not cover.

Use `newsnext eval` for Board/LiveCard operations, structured history analysis, full
snapshot exports, and other typed Actions: the evaluated script receives a
preconfigured `client` global, so no imports or setup are needed. Read
[references/sdk.md](references/sdk.md)
before using it; that reference covers the client, Actions, and history.
Call `client.actions.<domain>.<method>`
directly using the SDK's types; `actions.list()` is diagnostic, not a prerequisite.
The full method catalog lives in [references/actions.md](references/actions.md);
it is generated from the SDK contracts, so prefer it over guessing signatures.
The former `action` and `history` terminal commands no longer exist. Use
`history.export()` for complete observations instead of launching one CLI process
per observation.

When a user identifies a Board or LiveCard by name, resolve it to a unique ID
before mutating it. Apply the requested change through its Action and read back
the affected value to verify the result. Do not change unrelated fields.

When authoring a Widget, follow the widget template and preset contracts in
references/widget-authoring.md. Validate with
`newsnext widget validate --run <widgetId>` before installing.

Installing a Widget mutates a Board. If the user did not name a target Board,
list the Boards and ask which one to install into; do not pick a default.
Resolve the chosen Board to a unique ID, install, then read back the placement
to verify the result.

Read [references/source-authoring.md](references/source-authoring.md) before investigating, creating, changing, or testing a Source. It defines the required browser-led discovery order, JSON-first implementation policy, existing-source references, and `fetch`/`run` verification loop.

Keep authorization boundaries intact. Commands such as `stop` and `install-native-host` mutate state; explaining them does not authorize running them.
