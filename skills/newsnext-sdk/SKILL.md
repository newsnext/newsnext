---
name: newsnext-sdk
description: Use the NewsNext CLI and TypeScript SDK to query history, manage Boards and LiveCards, invoke Actions and local plugins, and create or test Sources, including discovering a Source from a website URL. Apply to NewsNext operations and Widget SDK usage.
---

# NewsNext SDK

Run terminal commands with `newsnext`.

Consult `newsnext <command> --help` for command usage and
[references/commands.md](references/commands.md) for additional conventions.

Use `newsnext eval` for Board/LiveCard operations, structured history analysis,
full snapshot exports, and other typed Actions. It provides a preconfigured
`client` variable. Eval scripts are async function bodies: use `await`, return
the final value for JSON output, and use `await import(...)` for modules. Read
[references/sdk.md](references/sdk.md) for client, Action, and history usage.
Call `client.actions.<domain>.<method>` using the signatures in the generated
[Actions catalog](references/actions.md). Use `history.export()` for complete
observations.
Use `client.plugins.list()` to discover locally installed packages and
`client.plugins.actions()` / `client.plugins.execute()` for their Actions; see
[SDK reference](references/sdk.md#local-capabilities-and-plugins).

When a user identifies a Board or LiveCard by name, resolve it to a unique ID
before mutating it. Apply the requested change through its Action: mutations
return the affected entity, so verify the returned value. Update only the
requested fields.

When authoring a Widget, follow the template and preset contracts in
[references/widget-authoring.md](references/widget-authoring.md). Validate with
`newsnext widget validate --run <widgetId>` before installing.

Installing a Widget mutates a Board. If the user did not name a target Board,
list the Boards and ask which one to install into.
Resolve the chosen Board to a unique ID, install, then assert on the returned
placement to verify the result.

Read [references/source-authoring.md](references/source-authoring.md) for Source
discovery, implementation, and verification.
