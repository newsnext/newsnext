# NewsNext CLI command reference

The examples below show `newsnext` directly. Prefix them with the environment selected by the active instructions. Outside a repository-specific override, use `NEWSNEXT_ENV=production`.

## Shared behavior

- `newsnext --help` lists public commands; `newsnext --version` prints the installed version.
- Commands that contact a browser Worker require the daemon and browser extension to be connected. Start with `newsnext status` and use `newsnext doctor` when connectivity fails.
- `--worker <WORKER>` accepts a connected Worker ID prefix. Without it, a single connected Worker is selected automatically; multiple Workers prompt in a terminal and require an explicit selector in scripts. Use it for deterministic or non-interactive operation.
- `--timeout <SECONDS>` defaults to `60` and must be greater than `0` and no more than `600`.
- `--compact` emits JSON on one line. Without it, JSON output is pretty-printed.
- Shell-quote JSON values, headers, URLs containing shell metacharacters, and source parameters.

## Daemon lifecycle and diagnostics

### `start`

Start the background daemon. It succeeds without starting another process if the selected environment is already running.

```sh
newsnext start
```

### `status`

Show the daemon PID, widget server URL and file directory, and connected browser Workers with short IDs.

```sh
newsnext status
```

### `doctor`

Check the executable, selected runtime environment, Native Messaging registration, database, widget directory and manifests, daemon, protocol compatibility, connected extension, and widget server.

```sh
newsnext doctor
newsnext doctor --json
```

`--json` emits a one-line machine-readable report. A report containing an error returns a failure status; warnings alone do not.

### `stop`

Ask the daemon in the selected environment to stop.

```sh
newsnext stop
```

### `restart`

Stop the selected daemon if it is running, wait for it to exit, then start it again.

```sh
newsnext restart
```

## Browser-authenticated HTTP

### `fetch`

Fetch an HTTP(S) URL inside a connected extension so browser-managed cookies are available.

```text
newsnext fetch [OPTIONS] <URL>
```

Options:

- `--worker <WORKER>`: choose a Worker by ID prefix.
- `--timeout <SECONDS>`: connection and execution timeout.
- `-X, --method <METHOD>`: request method. Defaults to `GET`, or `POST` when `--body` is present.
- `-H, --header 'NAME: VALUE'`: add a header; repeat for multiple headers. `Cookie` cannot be overridden.
- `-d, --body <BODY>`: request body. `GET` and `HEAD` cannot have a body.
- `-i, --include`: print response status and headers before the body.

Only `http` and `https` URLs without embedded credentials are accepted. `CONNECT`, `TRACE`, and `TRACK` are rejected.

```sh
newsnext fetch 'https://example.com/api/me' -i
newsnext fetch 'https://example.com/api/items' -X POST -H 'Content-Type: application/json' -d '{"name":"Example"}'
```

## Source execution

### `run`

Run either a registered source or a local provider JSON through a connected extension.

```text
newsnext run [OPTIONS] <INPUT> [SOURCE_ID]
```

Input forms:

- Registered source: `<provider>:<source>`.
- Provider file: a JSON path. Supply `[SOURCE_ID]` if the provider contains multiple sources; the only source is selected automatically.
- Standard input: `-`, followed by `[SOURCE_ID]` when needed.

Options:

- `--worker <WORKER>` and `--timeout <SECONDS>`: select the Worker and timeout.
- `--param <KEY=VALUE>`: set one parameter; repeat as needed. Values that parse as JSON become JSON values, otherwise they remain strings.
- `--params '<JSON_OBJECT>'`: set parameters from an object. Repeated `--param` values override matching keys from this object.
- `--provider-id <ID>`: override the provider ID inferred from the filename. It cannot contain whitespace or `:`.
- `--use-provider-secrets`: reuse and update stored secrets; valid only with provider JSON, not a registered source.
- `--debug`: include underlying request and response diagnostics.
- `-w, --watch`: rerun when the provider file changes. It requires a file and cannot be used with stdin or a registered source.
- `--compact`: output one-line JSON.
- `-v, --verbose`: print extension-side error stacks.

Quote text parameters that contain integers beyond JavaScript's safe integer range. A bare `--param id=1983553349228987887` is parsed as a number before text coercion and can lose precision; use `--param 'id="1983553349228987887"'` or `--params '{"id":"1983553349228987887"}'` instead.

```sh
newsnext run github:notifications --param limit=20 --param unread=true
newsnext run ./provider.json articles --params '{"section":"tech"}' --debug
newsnext run ./provider.json articles --watch
newsnext run - articles < provider.json
```

If authentication is required, open the login URL printed by the CLI and rerun the command afterward.

## Widget manifests

### `widget validate`

Validate Widget manifests in the Widget directory of the selected environment and print one line per Widget. Entries of the Widget directory that are not Widget folders are ignored.

```text
newsnext widget validate [OPTIONS] [WIDGET]
```

- Without `[WIDGET]`, every Widget subdirectory is validated.
- With `[WIDGET]`, only that Widget is validated; an unknown Widget ID fails.
- Each line reads `ok <id>` for a valid manifest or `error <id> <message>` for a rejected one, sorted by Widget ID.
- The command fails when any validated manifest is invalid, so it can gate scripts that install Widgets.
- `--run` additionally executes the Widget's data pipeline — file queries, `latest` queries resolved as empty, then `data.mjs` when declared — and validates the produced data against the view contract, printing a `data ok <id> ...` or `data error <id> <message>` line per Widget.
- `--param <KEY=VALUE>` sets a Widget parameter for a `--run`; repeat it as needed. Values that do not parse as JSON stay strings.

```sh
newsnext widget validate
newsnext widget validate feed
newsnext widget validate --run feed --param limit=20
```

`doctor` surfaces the same rejections as `widgetManifest.*` warnings without failing the report.

## TypeScript SDK

Complex structured operations run through `eval` with a preconfigured client,
not terminal subcommands and not a separately installed SDK. See [sdk.md](sdk.md)
for the client API, history, and examples.

Simple terminal operations remain `start`, `status`, `doctor`, `stop`, `restart`,
`fetch`, `run`, `widget validate`, `eval`, and `install-native-host`.

### `eval`

Evaluate JavaScript with a preconfigured NewsNext `client` global:

```text
newsnext eval [OPTIONS]
```

- With `-e, --eval <SCRIPT>`, that script is evaluated.
- Without it, the script is read from standard input, so `newsnext eval < script.js` works and shell redirection replaces file arguments.
- `--timeout <SECONDS>` bounds the whole evaluation; defaults to `60`, at most `600`.
- TypeScript snippets require Bun or Deno; plain Node.js runs JavaScript only.
- Each invocation starts a fresh runtime; variables do not persist between calls.

```sh
newsnext eval -e 'console.log((await client.actions.board.list()).length)'
newsnext eval < boards.mjs
```

## Native Messaging registration

### `install-native-host`

Register the current `newsnext` executable as a Native Messaging host:

```text
newsnext install-native-host [OPTIONS] [BROWSER]...
```

Supported browser values are `chrome`, `chromium`, `edge`, `firefox`, `ego-lite`, `dia`, and `arc`, subject to platform support.

- With explicit browser values, install for those browsers without prompting.
- With no browser values, select from detected browsers interactively; non-interactive execution installs for all detected supported browsers.
- `--current-dir [chromium-based|firefox-based]` writes a manifest in the current directory instead of registering browsers. Omitting its optional value chooses `chromium-based`.
- `--current-dir` conflicts with browser arguments.

```sh
newsnext install-native-host chrome firefox
newsnext install-native-host --current-dir
newsnext install-native-host --current-dir firefox-based
```

Registration is environment-specific. Restart selected browsers after installation.

## Runtime environment

Use one environment consistently across daemon lifecycle, Native Messaging registration, and data commands:

```sh
NEWSNEXT_ENV=production newsnext status
NEWSNEXT_ENV=development newsnext status
```

Valid `NEWSNEXT_ENV` values are exactly `production` and `development`. The environments use separate IPC endpoints, Native Messaging host names, databases, widget directories, and startup-error files.

Advanced overrides:

- `NEWSNEXT_DATABASE_PATH`: non-empty custom database path.
- `NEWSNEXT_WIDGETS_PATH`: non-empty custom widget directory.

Use these only when the task requires isolated data or widget storage.

## Internal commands

`native-host`, `__daemon`, and `__sdk` are hidden implementation entry points used by browser registration and background startup. They are not supported as routine user commands; use `install-native-host` and `start` instead.
