# NewsNext CLI command reference

`newsnext <command> --help` is the source of truth for flags, arguments, and
examples. This reference only lists what exists and the conventions `--help`
does not cover. The examples below show `newsnext` directly. Prefix them with
the environment selected by the active instructions. Outside a
repository-specific override, use `NEWSNEXT_ENV=production`.

## Available commands

- `status`: show the daemon PID, widget server URL and file directory, and
  connected browser Workers. The daemon starts automatically when the browser
  connects; restart it from Settings > Integration when needed.
- `doctor`: check the executable, environment, Native Messaging registration,
  database, widget manifests, daemon, and extension connectivity.
- `fetch`: fetch an HTTP(S) URL inside a connected extension.
- `run`: run a registered source or a local provider JSON through a connected
  extension.
- `widget create`: scaffold a Widget directory with a preset manifest.
- `widget validate`: validate Widget manifests, optionally executing the data
  pipeline.
- `eval`: evaluate JavaScript with a preconfigured NewsNext `client` global.
- `install-native-host`: register the executable as a Native Messaging host.
- `install-skill`: install the NewsNext SDK skill for AI coding agents.

`native-host`, `__daemon`, and `__sdk` are hidden implementation entry points;
use `install-native-host` instead.

## Conventions `--help` does not cover

- Commands that contact a browser Worker require the daemon and browser
  extension to be connected. Start with `newsnext status` and use
  `newsnext doctor` when connectivity fails.
- `--worker <WORKER>` accepts a connected Worker ID prefix. Without it, a
  single connected Worker is selected automatically; multiple Workers prompt
  in a terminal and require an explicit selector in scripts.
- `--compact` emits JSON on one line. Without it, JSON output is
  pretty-printed.
- Each `eval` invocation starts a fresh runtime; variables do not persist
  between calls. Keep `eval` output small: project only needed fields and emit
  single-line JSON instead of full pretty-printed dumps.

## Runtime environment

Use one environment consistently across daemon lifecycle, Native Messaging
registration, and data commands:

```sh
NEWSNEXT_ENV=production newsnext status
```

The default is production. Repository instructions (`AGENTS.md`) may select a
different environment for development work; when they do, use that same
environment for every related command. Environments use separate IPC
endpoints, Native Messaging host names, databases, widget directories, and
startup-error files.

Advanced overrides:

- `NEWSNEXT_DATABASE_PATH`: non-empty custom database path.
- `NEWSNEXT_WIDGETS_PATH`: non-empty custom widget directory.

Use these only when the task requires isolated data or widget storage.
