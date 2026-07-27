import type { SourceConnectionRunRequest } from "@newsnext/shared/types"
import type { CliIO } from "../io"
import type { LoadedSourceRunTarget, SourceRunCommandOptions } from "./options"
import { watch } from "node:fs"
import process from "node:process"
import { executeThroughDaemon } from "../daemon"
import { CliError } from "../errors"
import { writeLine } from "../io"
import {
  loadProvider,
  loadSourceRunTarget,
  parseSourceRunOptions,
} from "./options"
import {
  SourceConnectionRemoteError,
} from "./session"

function formatConnectionCommand(options: SourceRunCommandOptions): string {
  const customUrl = options.wsUrl.href !== "ws://127.0.0.1:43110/"
    ? `WXT_SOURCE_CONNECTION_WS_URL=${options.wsUrl.href} `
    : ""
  return `${customUrl}bun run dev:chrome`
}

function printExecutionError(
  error: unknown,
  options: SourceRunCommandOptions,
  io: CliIO,
): void {
  if (error instanceof SourceConnectionRemoteError) {
    const { remote } = error
    if (remote.code === "SOURCE_LOGIN_REQUIRED" && remote.loginUrl) {
      writeLine(io.stderr, "Source requires authentication.")
      writeLine(io.stderr, `Log in at ${remote.loginUrl}, then rerun the command.`)
      return
    }
    writeLine(
      io.stderr,
      options.verbose && remote.stack ? remote.stack : `${remote.name}: ${remote.message}`,
    )
    return
  }
  writeLine(io.stderr, error instanceof Error ? error.message : String(error))
}

async function executeOnce(
  options: SourceRunCommandOptions,
  io: CliIO,
  loadedTarget?: LoadedSourceRunTarget,
): Promise<void> {
  const target = loadedTarget ?? await loadSourceRunTarget(options)
  const request: SourceConnectionRunRequest = target.kind === "registered"
    ? {
        id: crypto.randomUUID(),
        type: "source.run",
        sourceId: target.sourceId,
        params: options.params,
      }
    : {
        id: crypto.randomUUID(),
        type: "source.run",
        providerId: target.providerId,
        sourceId: target.sourceId,
        provider: target.provider,
        params: options.params,
        useProviderSecrets: options.useProviderSecrets,
      }
  const startedAt = performance.now()
  const connectionTimer = setTimeout(() => {
    writeLine(io.stderr, "No NewsNext extension has connected yet.")
    writeLine(io.stderr, `Start one in another terminal with: ${formatConnectionCommand(options)}`)
    writeLine(io.stderr, "Still waiting…")
  }, Math.min(3_000, options.timeoutMs))
  const result = await executeThroughDaemon(
    {
      request,
      browser: options.browser,
      timeoutMs: options.timeoutMs,
    },
    options,
  ).finally(() => clearTimeout(connectionTimer))
  const durationMs = Math.round(performance.now() - startedAt)
  writeLine(
    io.stdout,
    JSON.stringify(result.data, null, options.compact || options.watch ? undefined : 2),
  )
  const itemCount = Array.isArray(result.data)
    ? `${result.data.length} ${result.data.length === 1 ? "item" : "items"}`
    : "completed"
  writeLine(
    io.stderr,
    `✓ ${target.kind === "registered" ? target.sourceId : `${target.providerId}:${target.sourceId}`} — ${itemCount} in ${durationMs} ms via ${result.instance.browser}`,
  )
}

async function runWatchMode(
  options: SourceRunCommandOptions,
  io: CliIO,
): Promise<number> {
  const initialProvider = await loadProvider(options)
  if (!initialProvider.path) {
    throw new CliError("Watch mode requires a provider file", 2)
  }

  let running = false
  let rerunRequested = false
  let debounceTimer: ReturnType<typeof setTimeout> | undefined

  const run = async (): Promise<void> => {
    if (running) {
      rerunRequested = true
      return
    }
    running = true
    do {
      rerunRequested = false
      try {
        await executeOnce(options, io)
      } catch (error) {
        printExecutionError(error, options, io)
      }
    } while (rerunRequested)
    running = false
  }

  const watcher = watch(initialProvider.path, () => {
    if (debounceTimer !== undefined) {
      clearTimeout(debounceTimer)
    }
    debounceTimer = setTimeout(() => {
      void run()
    }, 150)
  })
  writeLine(io.stderr, `Watching ${initialProvider.path}…`)
  await run()

  await new Promise<void>((resolve) => {
    const stop = (): void => {
      process.off("SIGTERM", stop)
      process.off("SIGINT", stop)
      resolve()
    }
    process.once("SIGTERM", stop)
    process.once("SIGINT", stop)
  })
  if (debounceTimer !== undefined) {
    clearTimeout(debounceTimer)
  }
  watcher.close()
  return 0
}

export async function runSourceRunCommand(args: string[], io: CliIO): Promise<number> {
  const options = parseSourceRunOptions(args)

  try {
    const target = options.watch ? undefined : await loadSourceRunTarget(options)
    if (options.watch) {
      return await runWatchMode(options, io)
    }
    await executeOnce(options, io, target)
    return 0
  } catch (error) {
    printExecutionError(error, options, io)
    return error instanceof CliError ? error.exitCode : 1
  }
}
