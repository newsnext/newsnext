---
name: newsnext-cli
description: Use the NewsNext CLI and create or test NewsNext Sources, including discovering a Source from a supplied website URL. Apply when a task asks to operate `newsnext`, author a Source, choose between RSS, public API, HTML, or private API, or validate Source behavior; do not use it for changing the CLI implementation itself.
---

# NewsNext CLI

Invoke the executable by command name as `newsnext`. Do not search for its binary, infer an installation path, or replace it with `cargo run` unless the user explicitly asks to locate, build, or debug the CLI implementation.

Treat production as the default runtime environment and make it explicit when executing commands:

```sh
NEWSNEXT_ENV=production newsnext <command>
```

Honor a repository's `AGENTS.md` when it selects another environment. Environment selection applies consistently to the daemon endpoint, database, widget directory, and Native Messaging host, so use the same `NEWSNEXT_ENV` for related commands.

Read [references/commands.md](references/commands.md) before answering a command-usage question or operating the CLI. Use `newsnext <command> --help` to confirm details if the installed version may differ from the reference.

Read [references/source-authoring.md](references/source-authoring.md) before investigating, creating, changing, or testing a Source. It defines the required browser-led discovery order, JSON-first implementation policy, existing-source references, and `fetch`/`run` verification loop.

Keep authorization boundaries intact. Commands such as `job remove`, `stop`, and `install-native-host` mutate state; explaining them does not authorize running them.
