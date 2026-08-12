import type {
  ExtensionConnectionFetchRequest,
} from "@newsnext/extension-connection"
import type { CliIO } from "./io"
import type {
  SourceConnectionOptions,
  SourceConnectionValues,
} from "./source-connection-options"
import {
  isExtensionFetchMethod,
  isExtensionFetchUrl,
  parseExtensionFetchResponse,
} from "@newsnext/extension-connection"
import { parseArgs } from "citty"
import { executeThroughDaemon } from "./daemon"
import { CliError } from "./errors"
import { writeLine } from "./io"
import { collectRepeatedOption } from "./repeated-option"
import {
  normalizeSourceConnectionOptions,
  SOURCE_CONNECTION_ARGS,
} from "./source-connection-options"

interface FetchValues extends SourceConnectionValues {
  body?: string
  include?: boolean
  method?: string
}

export const FETCH_ARGS = {
  ...SOURCE_CONNECTION_ARGS,
  url: {
    type: "positional",
    description: "HTTP(S) URL to fetch in the connected extension",
    required: true,
    valueHint: "URL",
  },
  method: {
    type: "string",
    description: "HTTP method (defaults to GET, or POST with --body)",
    alias: "X",
    valueHint: "METHOD",
  },
  header: {
    type: "string",
    description: "Add a request header; may be repeated",
    alias: "H",
    valueHint: "NAME: VALUE",
  },
  body: {
    type: "string",
    description: "Set the request body",
    alias: "d",
    valueHint: "DATA",
  },
  include: {
    type: "boolean",
    description: "Include response status and headers",
    alias: "i",
  },
} as const

interface FetchCommandOptions extends SourceConnectionOptions {
  request: ExtensionConnectionFetchRequest
  include: boolean
}

function parseHeader(value: string): [string, string] {
  const separator = value.indexOf(":")
  if (separator <= 0) {
    throw new CliError(`Invalid header "${value}". Expected NAME: VALUE.`, 2)
  }
  const pair: [string, string] = [
    value.slice(0, separator).trim(),
    value.slice(separator + 1).trim(),
  ]
  if (pair[0].toLowerCase() === "cookie") {
    throw new CliError("The Cookie header is browser-managed and cannot be overridden", 2)
  }
  try {
    const headers = new Headers()
    headers.append(...pair)
  } catch {
    throw new CliError(`Invalid header "${value}".`, 2)
  }
  return pair
}

function normalizeFetchUrl(value: string): string {
  if (!isExtensionFetchUrl(value)) {
    throw new CliError("Fetch URL must be an HTTP(S) URL without embedded credentials", 2)
  }
  return new URL(value).href
}

export function parseFetchOptions(args: string[]): FetchCommandOptions {
  let values: FetchValues & { _: string[] }
  try {
    values = parseArgs(args, FETCH_ARGS) as FetchValues & { _: string[] }
  } catch (error) {
    throw new CliError(error instanceof Error ? error.message : String(error), 2)
  }

  const [url, ...extra] = values._
  if (!url) {
    throw new CliError("A fetch URL is required", 2)
  }
  if (extra.length > 0) {
    throw new CliError(`Unexpected positional argument: ${extra[0]}`, 2)
  }

  const method = (values.method ?? (values.body === undefined ? "GET" : "POST")).toUpperCase()
  if (!isExtensionFetchMethod(method)) {
    throw new CliError(`Invalid or unsupported HTTP method: ${method}`, 2)
  }
  if (values.body !== undefined && (method === "GET" || method === "HEAD")) {
    throw new CliError(`${method} requests cannot have a body`, 2)
  }

  const connection = normalizeSourceConnectionOptions(values)
  return {
    ...connection,
    include: values.include ?? false,
    request: {
      id: crypto.randomUUID(),
      type: "fetch",
      url: normalizeFetchUrl(url),
      method,
      headers: collectRepeatedOption(args, ["--header", "-H"]).map(parseHeader),
      timeoutMs: connection.timeoutMs,
      body: values.body,
    },
  }
}

export async function runFetchCommand(args: string[], io: CliIO): Promise<number> {
  const options = parseFetchOptions(args)
  const result = await executeThroughDaemon({
    request: options.request,
    browser: options.browser,
    timeoutMs: options.timeoutMs,
  }, options)
  const response = parseExtensionFetchResponse(result.data)

  if (options.include) {
    writeLine(io.stdout, `${response.status} ${response.statusText}`.trimEnd())
    for (const [name, value] of response.headers) {
      writeLine(io.stdout, `${name}: ${value}`)
    }
    writeLine(io.stdout)
  }
  io.stdout.write(response.body)
  writeLine(
    io.stderr,
    `✓ ${response.status}${response.statusText ? ` ${response.statusText}` : ""} via ${result.instance.browser}`,
  )
  return 0
}
