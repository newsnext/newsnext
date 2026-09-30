---
name: newsnext-sdk
description: Use the NewsNext CLI and TypeScript SDK to query history, manage Boards and LiveCards, invoke or author Actions and local plugins, and create, validate, or test Sources and Insights, including discovering a Source from a website URL.
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
[SDK reference](references/sdk.md#local-capabilities-and-plugins). When authoring
portable packages, read the generated [Plugin](references/schemas/plugin.json)
and [Action](references/schemas/action.json) schemas.

When a user identifies a Board or LiveCard by name, resolve it to a unique ID
before mutating it. Apply the requested change through its Action: mutations
return the affected entity, so verify the returned value. Update only the
requested fields.

When authoring an Insight, follow the template and preset contracts in
[references/insight-authoring.md](references/insight-authoring.md). Validate with
`newsnext insight validate --run <insightId>` before installing. Read the generated
[Insight](references/schemas/insight.json) and
[parameter](references/schemas/params.json) schemas for manifest fields.

Installing an Insight mutates a Board. If the user did not name a target Board,
list the Boards and ask which one to install into.
Resolve the chosen Board to a unique ID, install, then assert on the returned
placement to verify the result.

Read [references/source-authoring.md](references/source-authoring.md) for Source
discovery, implementation, and verification. Read the generated
[Source](references/schemas/source.json) and
[parameter](references/schemas/params.json) schemas for manifest fields.
