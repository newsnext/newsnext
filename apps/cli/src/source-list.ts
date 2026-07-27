import type { CliIO } from "./io"
import type {
  SourceConnectionOptions,
  SourceConnectionValues,
} from "./source-connection-options"
import { parseArgs } from "citty"
import { executeThroughDaemon } from "./daemon"
import { CliError } from "./errors"
import { writeLine } from "./io"
import {
  normalizeSourceConnectionOptions,
  SOURCE_CONNECTION_ARGS,
} from "./source-connection-options"

export const SOURCE_LIST_ARGS = SOURCE_CONNECTION_ARGS

function parseSourceListOptions(args: string[]): SourceConnectionOptions {
  let values: SourceConnectionValues
  try {
    values = parseArgs(args, SOURCE_LIST_ARGS) as SourceConnectionValues
  } catch (error) {
    throw new CliError(error instanceof Error ? error.message : String(error), 2)
  }
  return normalizeSourceConnectionOptions(values)
}

export async function runSourceListCommand(args: string[], io: CliIO): Promise<number> {
  const options = parseSourceListOptions(args)
  const result = await executeThroughDaemon({
    request: {
      id: crypto.randomUUID(),
      type: "source.list",
    },
    browser: options.browser,
    timeoutMs: options.timeoutMs,
  }, options)

  if (
    !Array.isArray(result.data)
    || !result.data.every(sourceId => typeof sourceId === "string")
  ) {
    throw new CliError("The extension returned an invalid source list")
  }

  for (const sourceId of result.data) {
    writeLine(io.stdout, sourceId)
  }
  writeLine(
    io.stderr,
    `✓ ${result.data.length} ${result.data.length === 1 ? "source" : "sources"} via ${result.instance.browser}`,
  )
  return 0
}
