import type {
  SourceConnectionOptions,
  SourceConnectionValues,
} from "../source-connection-options"
import { access, readFile } from "node:fs/promises"
import { basename, extname, resolve } from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"
import { parseArgs } from "citty"
import { CliError } from "../errors"
import {
  normalizeSourceConnectionOptions,
  SOURCE_CONNECTION_ARGS,
} from "../source-connection-options"

interface SourceRunValues extends SourceConnectionValues {
  "compact"?: boolean
  "params"?: string
  "provider-id"?: string
  "use-provider-secrets"?: boolean
  "verbose"?: boolean
  "watch"?: boolean
}

export const SOURCE_RUN_ARGS = {
  ...SOURCE_CONNECTION_ARGS,
  "source-or-provider": {
    type: "positional",
    description: "Registered source ID, provider JSON file, or - for standard input",
    required: false,
    valueHint: "SOURCE_OR_PROVIDER",
  },
  "source-id": {
    type: "positional",
    description: "Source ID when the provider defines multiple sources",
    required: false,
    valueHint: "SOURCE_ID",
  },
  "param": {
    type: "string",
    description: "Set a source parameter; may be repeated",
    valueHint: "KEY=VALUE",
  },
  "params": {
    type: "string",
    description: "Set source parameters from a JSON object",
    valueHint: "JSON",
  },
  "provider-id": {
    type: "string",
    description: "Override the provider ID inferred from the filename",
    valueHint: "ID",
  },
  "use-provider-secrets": {
    type: "boolean",
    description: "Reuse and update the provider's stored secrets",
  },
  "watch": {
    type: "boolean",
    description: "Rerun when the provider file changes",
    alias: "w",
  },
  "compact": {
    type: "boolean",
    description: "Print result JSON on one line",
  },
  "verbose": {
    type: "boolean",
    description: "Print extension-side error stacks",
    alias: "v",
  },
} as const

export interface SourceRunCommandOptions extends SourceConnectionOptions {
  input: string
  sourceId?: string
  params: Record<string, unknown>
  providerId?: string
  compact: boolean
  useProviderSecrets: boolean
  verbose: boolean
  watch: boolean
}

export interface LoadedProvider {
  kind: "provider"
  path?: string
  providerId: string
  provider: unknown
  sourceId: string
}

export type LoadedSourceRunTarget
  = | LoadedProvider
    | {
      kind: "registered"
      sourceId: string
    }

function parseJsonObject(value: string, label: string): Record<string, unknown> {
  let parsed: unknown
  try {
    parsed = JSON.parse(value) as unknown
  } catch (error) {
    const detail = error instanceof Error ? `: ${error.message}` : ""
    throw new CliError(`Could not parse ${label} as JSON${detail}`, 2)
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new CliError(`${label} must be a JSON object`, 2)
  }
  return parsed as Record<string, unknown>
}

function parseParamValue(value: string): unknown {
  try {
    return JSON.parse(value) as unknown
  } catch {
    return value
  }
}

function parseParamEntries(entries: string[] | undefined): Record<string, unknown> {
  return Object.fromEntries((entries ?? []).map((entry) => {
    const separatorIndex = entry.indexOf("=")
    if (separatorIndex <= 0) {
      throw new CliError(`Invalid --param "${entry}". Expected key=value.`, 2)
    }
    const key = entry.slice(0, separatorIndex).trim()
    const value = entry.slice(separatorIndex + 1)
    if (!key) {
      throw new CliError("--param requires a non-empty key", 2)
    }
    return [key, parseParamValue(value)]
  }))
}

function collectRepeatedOption(args: string[], option: string): string[] {
  const values: string[] = []
  for (let index = 0; index < args.length; index++) {
    const argument = args[index]
    if (argument === option) {
      const value = args[index + 1]
      if (value === undefined || value.startsWith("-")) {
        throw new CliError(`${option} requires a value`, 2)
      }
      values.push(value)
      index++
    } else if (argument.startsWith(`${option}=`)) {
      values.push(argument.slice(option.length + 1))
    }
  }
  return values
}

export function parseSourceRunOptions(args: string[]): SourceRunCommandOptions {
  let values: SourceRunValues & { _: string[] }
  try {
    values = parseArgs(args, SOURCE_RUN_ARGS) as SourceRunValues & { _: string[] }
  } catch (error) {
    throw new CliError(error instanceof Error ? error.message : String(error), 2)
  }

  const [input, sourceId, ...extra] = values._
  if (!input) {
    throw new CliError("A source ID or provider JSON file is required", 2)
  }
  if (extra.length > 0) {
    throw new CliError(`Unexpected positional argument: ${extra[0]}`, 2)
  }
  const params = {
    ...(values.params !== undefined
      ? parseJsonObject(values.params, "--params")
      : {}),
    ...parseParamEntries(collectRepeatedOption(args, "--param")),
  }
  const connection = normalizeSourceConnectionOptions(values)

  if (values.watch && input === "-") {
    throw new CliError("--watch cannot be used when reading a provider from standard input", 2)
  }

  return {
    input,
    sourceId,
    params,
    providerId: values["provider-id"],
    browser: connection.browser,
    compact: values.compact ?? false,
    timeoutMs: connection.timeoutMs,
    useProviderSecrets: values["use-provider-secrets"] ?? false,
    verbose: values.verbose ?? false,
    watch: values.watch ?? false,
    wsUrl: connection.wsUrl,
  }
}

async function resolveProviderInputPath(input: string): Promise<string> {
  const candidates = [
    resolve(input),
    resolve(fileURLToPath(new URL("../../../..", import.meta.url)), input),
  ]
  for (const candidate of candidates) {
    if (await access(candidate).then(() => true, () => false)) {
      return candidate
    }
  }
  throw new CliError(`Provider file not found: ${input}`, 2)
}

async function readStandardInput(): Promise<string> {
  const chunks: string[] = []
  for await (const chunk of process.stdin) {
    chunks.push(String(chunk))
  }
  return chunks.join("")
}

function getSourceIds(provider: unknown): string[] {
  if (
    !provider
    || typeof provider !== "object"
    || !("sources" in provider)
    || !provider.sources
    || typeof provider.sources !== "object"
    || Array.isArray(provider.sources)
  ) {
    return []
  }
  return Object.keys(provider.sources).sort()
}

export async function loadProvider(
  options: SourceRunCommandOptions,
): Promise<LoadedProvider> {
  const path = options.input === "-"
    ? undefined
    : await resolveProviderInputPath(options.input)
  let provider: unknown
  try {
    provider = JSON.parse(
      path ? await readFile(path, "utf8") : await readStandardInput(),
    ) as unknown
  } catch (error) {
    const label = path ?? "standard input"
    const detail = error instanceof Error ? `: ${error.message}` : ""
    throw new CliError(`Could not parse provider JSON from ${label}${detail}`, 2)
  }

  const sourceIds = getSourceIds(provider)
  if (sourceIds.length === 0) {
    throw new CliError("Provider does not define any sources", 2)
  }

  let sourceId = options.sourceId
  if (!sourceId && sourceIds.length === 1) {
    sourceId = sourceIds[0]
  }
  if (!sourceId) {
    throw new CliError(
      `Source ID required. Available sources: ${sourceIds.join(", ")}`,
      2,
    )
  }
  if (!sourceIds.includes(sourceId)) {
    throw new CliError(
      `Source "${sourceId}" not found. Available sources: ${sourceIds.join(", ")}`,
      2,
    )
  }

  const providerId = options.providerId
    ?? (path ? basename(path, extname(path)) : "stdin")
  if (!providerId || /[:\s]/.test(providerId)) {
    throw new CliError("Provider ID must be a non-empty ID without colons or whitespace", 2)
  }

  return {
    kind: "provider",
    path,
    providerId,
    provider,
    sourceId,
  }
}

function looksLikeProviderInput(input: string): boolean {
  return input === "-"
    || input.endsWith(".json")
    || input.includes("/")
    || input.includes("\\")
    || input.startsWith(".")
}

export async function loadSourceRunTarget(
  options: SourceRunCommandOptions,
): Promise<LoadedSourceRunTarget> {
  const providerMode = options.sourceId !== undefined
    || options.providerId !== undefined
    || options.watch
    || looksLikeProviderInput(options.input)

  if (providerMode) {
    return loadProvider(options)
  }
  if (options.useProviderSecrets) {
    throw new CliError("--use-provider-secrets is only available for provider files", 2)
  }
  const parts = options.input.split(":")
  if (parts.length !== 2 || parts.some(part => !part || /\s/.test(part))) {
    throw new CliError(
      `Registered source ID must use the provider:source format: ${options.input}`,
      2,
    )
  }
  return {
    kind: "registered",
    sourceId: options.input,
  }
}
