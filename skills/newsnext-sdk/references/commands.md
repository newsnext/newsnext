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

Check the executable, selected runtime environment, Native Messaging registration, database, widget directory, daemon, protocol compatibility, connected extension, and widget server.

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

## Background jobs

Jobs execute locally through the daemon. All job commands accept `--timeout <SECONDS>` and `--compact`.

### `job add`

Create a recurring job with exactly one target selector:

```text
newsnext job add [OPTIONS] <--all|--board <BOARD>|--instance <INSTANCE>>
```

- `--all`: run every configured Instance.
- `--board <BOARD>`: run Instances in one Board.
- `--instance <INSTANCE>`: run one Instance.
- `--interval <SECONDS>`: execution interval, default `300`; valid range is 1 second through 365 days.

```sh
newsnext job add --all --interval 900
newsnext job add --board board-id --interval 300 --compact
newsnext job add --instance instance-id
```

### `job list`

List jobs and their IDs:

```sh
newsnext job list
newsnext job list --compact
```

### `job pause`

Pause a job while preserving its configuration:

```sh
newsnext job pause <ID>
```

### `job resume`

Resume a paused job and queue it immediately:

```sh
newsnext job resume <ID>
```

### `job remove`

Permanently remove a job:

```sh
newsnext job remove <ID>
```

Use the ID returned by `job add` or `job list` for pause, resume, and remove.

## TypeScript SDK

Complex structured operations are exposed through `@newsnext/sdk`, not terminal
subcommands. Use the SDK for history queries, streaming exports and canonical
Actions. The former `history` and `action` CLI commands have been removed.
See [sdk.md](sdk.md) for installation, development configuration and examples.

Simple terminal operations remain `start`, `status`, `doctor`, `stop`, `restart`,
`fetch`, `run`, `job`, and `install-native-host`.

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
