# NewsNext CLI command reference

Use `newsnext <command> --help` for flags and arguments.

## Available commands

New configurations include the `official` registry at
`https://github.com/newsnext/registry`. Run `registry update official` to download
its Sources; there is no need to add it manually. Registry listing works offline.

- `status`: show the daemon PID, insight server URL and file directory, and
  connected browser Workers. The daemon starts automatically when the browser
  connects; restart it from Settings > Integration when needed.
- `doctor`: check the executable, environment, Native Messaging registration,
  database, insight manifests, daemon, and extension connectivity.
- `registry add NAME URL_OR_DIRECTORY`: register a Git URL or local directory and
  enable all its Sources. The repository must contain a root `sources/` directory;
  Providers are discovered directly from it. `--ref` selects a Git branch or tag.
- `registry list [NAME]`: list registries or inspect one's available Source Providers.
- `registry update [NAME]`: refresh one or all registries, reconciling added,
  changed and removed Sources. Also restores missing runtime content.
- `registry remove NAME`: remove a registry and its Sources.
- `insight create`: scaffold an Insight directory with a preset manifest.
- `insight list`: list installed Insights.
- `insight validate`: validate Insight manifests, optionally executing the data
  pipeline.
- `action list`: list independently installed Actions.
- `action run`: validate and execute a local directory containing `action.json`
  and `index.mjs`.
- `eval`: run an async JavaScript function body with a preconfigured NewsNext
  `client` variable. Its returned value is printed as JSON.
- `install-native-host`: register the executable as a Native Messaging host.
- `install-skill`: install the NewsNext SDK skill for AI coding agents.

## Conventions

- Commands that contact a browser Worker require the daemon and browser
  extension to be connected. Start with `newsnext status` and use
  `newsnext doctor` when connectivity fails.
- `--pretty` is a global flag accepted before or after any command. It formats
  the value returned by `eval` and the `doctor` report.
- Each `eval` invocation starts a fresh runtime; variables do not persist
  between calls. Keep `eval` output small by returning only needed fields.
