import type {
  SourceHistoryCommandRequest,
  SourceHistoryCompareObservationsRequest,
  SourceHistoryGetObservationRequest,
  SourceHistoryListDatasetsRequest,
  SourceHistoryListObservationsRequest,
} from "@newsnext/extension-connection"
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

interface CommonHistoryValues extends SourceConnectionValues {
  compact?: boolean
}

interface DatasetValues extends CommonHistoryValues {
  "cursor"?: string
  "limit"?: string
  "provider-id"?: string
  "source-id"?: string
}

interface ObservationValues extends CommonHistoryValues {
  cursor?: string
  from?: string
  limit?: string
  to?: string
}

const COMPACT_ARG = {
  type: "boolean",
  description: "Print result JSON on one line",
} as const

const LIMIT_ARG = {
  type: "string",
  description: "Maximum results to return (1-250)",
  valueHint: "COUNT",
} as const

const INSTANCE_ID_ARG = {
  type: "positional",
  description: "Saved card instance ID",
  required: true,
  valueHint: "INSTANCE_ID",
} as const

const OBSERVED_AT_ARG = {
  type: "positional",
  description: "Observation time as Unix milliseconds or an ISO 8601 date",
  required: true,
  valueHint: "OBSERVED_AT",
} as const

export const SOURCE_HISTORY_DATASETS_ARGS = {
  ...SOURCE_CONNECTION_ARGS,
  "compact": COMPACT_ARG,
  "cursor": {
    type: "string",
    description: "Opaque cursor returned by the previous page",
    valueHint: "CURSOR",
  },
  "limit": LIMIT_ARG,
  "provider-id": {
    type: "string",
    description: "Filter by provider ID",
    valueHint: "PROVIDER_ID",
  },
  "source-id": {
    type: "string",
    description: "Filter by source ID",
    valueHint: "SOURCE_ID",
  },
} as const

export const SOURCE_HISTORY_OBSERVATIONS_ARGS = {
  ...SOURCE_CONNECTION_ARGS,
  "instance-id": INSTANCE_ID_ARG,
  "compact": COMPACT_ARG,
  "cursor": {
    type: "string",
    description: "Continue after this observation time",
    valueHint: "OBSERVED_AT",
  },
  "from": {
    type: "string",
    description: "Include observations at or after this time",
    valueHint: "TIME",
  },
  "limit": LIMIT_ARG,
  "to": {
    type: "string",
    description: "Include observations at or before this time",
    valueHint: "TIME",
  },
} as const

export const SOURCE_HISTORY_GET_ARGS = {
  ...SOURCE_CONNECTION_ARGS,
  "instance-id": INSTANCE_ID_ARG,
  "observed-at": OBSERVED_AT_ARG,
  "compact": COMPACT_ARG,
} as const

export const SOURCE_HISTORY_COMPARE_ARGS = {
  ...SOURCE_CONNECTION_ARGS,
  "instance-id": INSTANCE_ID_ARG,
  "before": {
    ...OBSERVED_AT_ARG,
    description: "Earlier observation time as Unix milliseconds or an ISO 8601 date",
    valueHint: "BEFORE",
  },
  "after": {
    ...OBSERVED_AT_ARG,
    description: "Later observation time as Unix milliseconds or an ISO 8601 date",
    valueHint: "AFTER",
  },
  "compact": COMPACT_ARG,
} as const

interface ParsedHistoryCommand<Request extends SourceHistoryCommandRequest> {
  compact: boolean
  connection: SourceConnectionOptions
  request: Request
}

function parseValues<Values extends SourceConnectionValues>(
  args: string[],
  definition: Parameters<typeof parseArgs>[1],
): Values & { _: string[] } {
  try {
    return parseArgs(args, definition) as Values & { _: string[] }
  } catch (error) {
    throw new CliError(error instanceof Error ? error.message : String(error), 2)
  }
}

function parseLimit(value: string | undefined): number | undefined {
  if (value === undefined) return
  const limit = Number(value)
  if (!Number.isInteger(limit) || limit < 1 || limit > 250) {
    throw new CliError("--limit must be an integer between 1 and 250", 2)
  }
  return limit
}

export function parseHistoryTime(value: string, label: string): number {
  const numeric = Number(value)
  const timestamp = value.trim() !== "" && Number.isFinite(numeric)
    ? numeric
    : Date.parse(value)
  if (!Number.isFinite(timestamp)) {
    throw new CliError(`${label} must be Unix milliseconds or an ISO 8601 date`, 2)
  }
  return timestamp
}

function requirePositionals(values: { _: string[] }, labels: []): []
function requirePositionals(values: { _: string[] }, labels: [string]): [string]
function requirePositionals(values: { _: string[] }, labels: [string, string]): [string, string]
function requirePositionals(
  values: { _: string[] },
  labels: [string, string, string],
): [string, string, string]
function requirePositionals(
  values: { _: string[] },
  labels: string[],
): string[] {
  const extra = values._[labels.length]
  if (extra !== undefined) {
    throw new CliError(`Unexpected positional argument: ${extra}`, 2)
  }
  return labels.map((label, index) => {
    const value = values._[index]
    if (!value) throw new CliError(`${label} is required`, 2)
    return value
  })
}

export function parseHistoryDatasetsOptions(
  args: string[],
): ParsedHistoryCommand<SourceHistoryListDatasetsRequest> {
  const values = parseValues<DatasetValues>(args, SOURCE_HISTORY_DATASETS_ARGS)
  requirePositionals(values, [])
  return {
    compact: values.compact ?? false,
    connection: normalizeSourceConnectionOptions(values),
    request: {
      id: crypto.randomUUID(),
      type: "source-history.datasets",
      cursor: values.cursor,
      limit: parseLimit(values.limit),
      providerId: values["provider-id"],
      sourceId: values["source-id"],
    },
  }
}

export function parseHistoryObservationsOptions(
  args: string[],
): ParsedHistoryCommand<SourceHistoryListObservationsRequest> {
  const values = parseValues<ObservationValues>(args, SOURCE_HISTORY_OBSERVATIONS_ARGS)
  const [instanceId] = requirePositionals(values, ["Instance ID"])
  return {
    compact: values.compact ?? false,
    connection: normalizeSourceConnectionOptions(values),
    request: {
      id: crypto.randomUUID(),
      type: "source-history.observations",
      instanceId,
      cursor: values.cursor === undefined ? undefined : parseHistoryTime(values.cursor, "--cursor"),
      from: values.from === undefined ? undefined : parseHistoryTime(values.from, "--from"),
      limit: parseLimit(values.limit),
      to: values.to === undefined ? undefined : parseHistoryTime(values.to, "--to"),
    },
  }
}

export function parseHistoryGetOptions(
  args: string[],
): ParsedHistoryCommand<SourceHistoryGetObservationRequest> {
  const values = parseValues<CommonHistoryValues>(args, SOURCE_HISTORY_GET_ARGS)
  const [instanceId, observedAt] = requirePositionals(values, ["Instance ID", "Observation time"])
  return {
    compact: values.compact ?? false,
    connection: normalizeSourceConnectionOptions(values),
    request: {
      id: crypto.randomUUID(),
      type: "source-history.get",
      instanceId,
      observedAt: parseHistoryTime(observedAt, "Observation time"),
    },
  }
}

export function parseHistoryCompareOptions(
  args: string[],
): ParsedHistoryCommand<SourceHistoryCompareObservationsRequest> {
  const values = parseValues<CommonHistoryValues>(args, SOURCE_HISTORY_COMPARE_ARGS)
  const [instanceId, before, after] = requirePositionals(
    values,
    ["Instance ID", "Earlier observation time", "Later observation time"],
  )
  return {
    compact: values.compact ?? false,
    connection: normalizeSourceConnectionOptions(values),
    request: {
      id: crypto.randomUUID(),
      type: "source-history.compare",
      instanceId,
      before: parseHistoryTime(before, "Earlier observation time"),
      after: parseHistoryTime(after, "Later observation time"),
    },
  }
}

async function runHistoryCommand(
  options: ParsedHistoryCommand<SourceHistoryCommandRequest>,
  io: CliIO,
): Promise<number> {
  const result = await executeThroughDaemon({
    request: options.request,
    browser: options.connection.browser,
    timeoutMs: options.connection.timeoutMs,
  }, options.connection)
  writeLine(io.stdout, JSON.stringify(result.data, null, options.compact ? undefined : 2))
  return 0
}

export async function runHistoryDatasetsCommand(args: string[], io: CliIO): Promise<number> {
  return await runHistoryCommand(parseHistoryDatasetsOptions(args), io)
}

export async function runHistoryObservationsCommand(args: string[], io: CliIO): Promise<number> {
  return await runHistoryCommand(parseHistoryObservationsOptions(args), io)
}

export async function runHistoryGetCommand(args: string[], io: CliIO): Promise<number> {
  return await runHistoryCommand(parseHistoryGetOptions(args), io)
}

export async function runHistoryCompareCommand(args: string[], io: CliIO): Promise<number> {
  return await runHistoryCommand(parseHistoryCompareOptions(args), io)
}
