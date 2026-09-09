---
name: newsnext-cli
description: Use the NewsNext CLI and TypeScript SDK to query history, manage Boards and Instances, invoke Actions, and create or test Sources, including discovering a Source from a website URL. Apply to NewsNext operations and Widget SDK usage; do not use it for changing the CLI or SDK implementation itself.
---

# NewsNext CLI

For terminal commands, invoke the executable by command name as `newsnext`. Do not search for its binary, infer an installation path, or replace it with `cargo run` unless the user explicitly asks to locate, build, or debug the CLI implementation.

Treat production as the default runtime environment and make it explicit when executing commands:

```sh
NEWSNEXT_ENV=production newsnext <command>
```

Honor a repository's `AGENTS.md` when it selects another environment. Environment selection applies consistently to the daemon endpoint, database, widget directory, and Native Messaging host, so use the same `NEWSNEXT_ENV` for related commands.

Read [references/commands.md](references/commands.md) before answering a command-usage question or operating the CLI. Use `newsnext <command> --help` to confirm details if the installed version may differ from the reference.

Use `@newsnext/sdk` for Board/Instance operations, structured history analysis, full
snapshot exports, and other typed Actions. Read [references/sdk.md](references/sdk.md)
before using it; that reference covers installed clients, Actions, history, and
Widget clients. Call `client.actions.<domain>.<method>`
directly using the SDK's types; `actions.list()` is diagnostic, not a prerequisite.
The former `action` and `history` terminal commands no longer exist. Use
`history.export()` for complete observations instead of launching one CLI process
per observation.

When a user identifies a Board or Instance by name, resolve it to a unique ID
before mutating it. Apply the requested change through its Action and read back
the affected value to verify the result. Do not change unrelated fields.

Read [references/source-authoring.md](references/source-authoring.md) before investigating, creating, changing, or testing a Source. It defines the required browser-led discovery order, JSON-first implementation policy, existing-source references, and `fetch`/`run` verification loop.

Keep authorization boundaries intact. Commands such as `job remove`, `stop`, and `install-native-host` mutate state; explaining them does not authorize running them.
