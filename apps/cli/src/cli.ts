import type { NewsNextDataInstance } from "@newsnext/instance"
import type { SourceDescriptor } from "@newsnext/sources/typings"
import { createBunNewsNextInstance } from "@newsnext/instance"

export type CliCommandName = "fetch" | "help" | "info" | "sources" | "version"
export type OutputFormat = "json" | "table"

export interface CliCommand {
  command: CliCommandName
  sourceId?: string
  format: OutputFormat
  latest?: boolean
  params: Record<string, string>
  cachePath?: string
  remoteUrl?: string
}

export interface CliIo {
  args: string[]
  stdout: (message: string) => void
  stderr: (message: string) => void
}

interface CommandContext {
  instance: NewsNextDataInstance
}

const VERSION = "0.0.1"

export async function runCli(io: CliIo): Promise<number> {
  try {
    const command = parseCliArgs(io.args)

    if (command.command === "help") {
      io.stdout(renderHelp())
      return 0
    }

    if (command.command === "version") {
      io.stdout(VERSION)
      return 0
    }

    const context: CommandContext = {
      instance: await createCliInstance({
        cachePath: command.cachePath,
        remoteUrl: command.remoteUrl,
      }),
    }

    const output = await executeCommand(command, context)
    io.stdout(output)
    return 0
  } catch (error) {
    io.stderr(formatError(error))
    return 1
  }
}

async function createCliInstance(options: {
  cachePath?: string
  remoteUrl?: string
}): Promise<NewsNextDataInstance> {
  const originalLog = console.log

  try {
    console.log = () => {}
    return await createBunNewsNextInstance(options)
  } finally {
    console.log = originalLog
  }
}

export function parseCliArgs(args: string[]): CliCommand {
  const params: Record<string, string> = {}
  const positional: string[] = []
  let format: OutputFormat = "table"
  let latest = false
  let cachePath: string | undefined
  let remoteUrl: string | undefined

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]

    if (arg === "--help" || arg === "-h") {
      return {
        command: "help",
        format,
        params,
      }
    }

    if (arg === "--version" || arg === "-v") {
      return {
        command: "version",
        format,
        params,
      }
    }

    if (arg === "--json") {
      format = "json"
      continue
    }

    if (arg === "--latest") {
      latest = true
      continue
    }

    if (arg === "--cache-path") {
      cachePath = readOptionValue(args, index, "--cache-path")
      index += 1
      continue
    }

    if (arg === "--remote-url") {
      remoteUrl = readOptionValue(args, index, "--remote-url")
      index += 1
      continue
    }

    if (arg === "--param" || arg === "-p") {
      const entry = readOptionValue(args, index, arg)
      const [key, value] = parseParamEntry(entry)
      params[key] = value
      index += 1
      continue
    }

    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`)
    }

    positional.push(arg)
  }

  const [commandName = "help", sourceId] = positional
  const command = normalizeCommandName(commandName)

  if (command === "fetch" && !sourceId) {
    throw new Error("Missing source id. Example: newsnext fetch hackernews:default")
  }

  return {
    command,
    sourceId,
    latest,
    format,
    params,
    cachePath,
    remoteUrl,
  }
}

async function executeCommand(command: CliCommand, context: CommandContext): Promise<string> {
  if (command.command === "sources") {
    const sources = await context.instance.listSourceDescriptors()
    return command.format === "json"
      ? stringifyJson(sources)
      : renderSourceTable(sources)
  }

  if (command.command === "fetch") {
    const result = await context.instance.loadSource({
      sourceId: command.sourceId ?? "",
      params: command.params,
      latest: command.latest,
    })

    return stringifyJson(result)
  }

  if (command.command === "info") {
    const debugInfo = await context.instance.getDebugInfo?.()
    return command.format === "json"
      ? stringifyJson(debugInfo ?? {})
      : renderInfo(debugInfo)
  }

  return renderHelp()
}

export function renderSourceTable(sources: SourceDescriptor[]): string {
  const rows = sources.map(source => ({
    id: `${source.provider}:${source.id}`,
    name: source.title ? `${source.name} - ${source.title}` : source.name,
    category: source.category,
    type: source.type ?? "hottest",
  }))

  return renderTable([
    ["Source", "Name", "Category", "Type"],
    ...rows.map(row => [row.id, row.name, row.category, row.type]),
  ])
}

function renderInfo(info: Awaited<ReturnType<NonNullable<NewsNextDataInstance["getDebugInfo"]>>> | undefined): string {
  if (!info) {
    return "No debug info available."
  }

  const rows = [
    ["Mode", info.mode],
    ["Runtime", info.runtime],
    ["Cache", info.cache.path ? `${info.cache.type} (${info.cache.path})` : info.cache.type],
  ]

  if (info.remoteUrl) {
    rows.push(["Remote", info.remoteUrl])
  }

  return renderTable(rows)
}

function renderHelp(): string {
  return [
    "NewsNext CLI",
    "",
    "Usage:",
    "  newsnext sources [--json]",
    "  newsnext fetch <provider:source> [--latest] [--param key=value] [--json]",
    "  newsnext info [--json]",
    "",
    "Options:",
    "  --cache-path <path>   Use a sqlite cache path",
    "  --remote-url <url>    Use a remote NewsNext instance",
    "  --json                Print JSON where supported",
    "  --latest              Force a fresh source fetch",
    "  -p, --param <k=v>     Pass a source parameter",
    "  -h, --help            Show help",
    "  -v, --version         Show version",
  ].join("\n")
}

function renderTable(rows: string[][]): string {
  const widths = rows.reduce<number[]>((columns, row) => {
    row.forEach((cell, index) => {
      columns[index] = Math.max(columns[index] ?? 0, cell.length)
    })
    return columns
  }, [])

  return rows
    .map(row => row
      .map((cell, index) => cell.padEnd(widths[index] ?? 0))
      .join("  ")
      .trimEnd())
    .join("\n")
}

function normalizeCommandName(value: string): CliCommandName {
  if (value === "list" || value === "sources") {
    return "sources"
  }

  if (value === "fetch" || value === "info" || value === "help" || value === "version") {
    return value
  }

  throw new Error(`Unknown command: ${value}`)
}

function readOptionValue(args: string[], index: number, option: string): string {
  const value = args[index + 1]

  if (!value || value.startsWith("-")) {
    throw new Error(`Missing value for ${option}`)
  }

  return value
}

function parseParamEntry(entry: string): [string, string] {
  const separatorIndex = entry.indexOf("=")

  if (separatorIndex <= 0) {
    throw new Error(`Invalid param '${entry}'. Expected key=value`)
  }

  return [
    entry.slice(0, separatorIndex),
    entry.slice(separatorIndex + 1),
  ]
}

function stringifyJson(value: unknown): string {
  return JSON.stringify(value, null, 2)
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}
