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

interface JsonListValues extends SourceConnectionValues {
  compact?: boolean
}

interface JsonListOptions {
  compact: boolean
  connection: SourceConnectionOptions
}

type JsonListRequestType = "board.list" | "instance.list"

export const JSON_LIST_ARGS = {
  ...SOURCE_CONNECTION_ARGS,
  compact: {
    type: "boolean",
    description: "Print result JSON on one line",
  },
} as const

export function parseJsonListOptions(args: string[]): JsonListOptions {
  let values: JsonListValues & { _: string[] }
  try {
    values = parseArgs(args, JSON_LIST_ARGS) as JsonListValues & { _: string[] }
  } catch (error) {
    throw new CliError(error instanceof Error ? error.message : String(error), 2)
  }
  if (values._[0] !== undefined) {
    throw new CliError(`Unexpected positional argument: ${values._[0]}`, 2)
  }
  return {
    compact: values.compact ?? false,
    connection: normalizeSourceConnectionOptions(values),
  }
}

export async function runJsonListCommand(
  args: string[],
  type: JsonListRequestType,
  io: CliIO,
): Promise<number> {
  const options = parseJsonListOptions(args)
  const result = await executeThroughDaemon({
    request: {
      id: crypto.randomUUID(),
      type,
    },
    browser: options.connection.browser,
    timeoutMs: options.connection.timeoutMs,
  }, options.connection)
  writeLine(io.stdout, JSON.stringify(result.data, null, options.compact ? undefined : 2))
  return 0
}
