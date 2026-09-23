# NewsNext CLI command reference

Use `newsnext <command> --help` for flags and arguments.

## Available commands

- `status`: show the daemon PID, widget server URL and file directory, and
  connected browser Workers. The daemon starts automatically when the browser
  connects; restart it from Settings > Integration when needed.
- `doctor`: check the executable, environment, Native Messaging registration,
  database, widget manifests, daemon, and extension connectivity.
- `widget create`: scaffold a Widget directory with a preset manifest.
- `widget list`: list installed Widgets.
- `widget validate`: validate Widget manifests, optionally executing the data
  pipeline.
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
