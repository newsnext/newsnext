import type { SourceLoader, SourceLoaderContext, SourceLoaderResult } from "@newsnext/source-kit/types"
import { SourceLoginRequiredError, validateSourceLoaderOutput } from "@newsnext/source-kit/core"
import { createId } from "../id"
import { nativeRpc } from "./native-integration/rpc"
import { runtime } from "./native-integration/state"

const executions = new Map<string, SourceLoaderContext>()

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

/** A local execution backend uses the same bound context as every other Source loader. */
export function createLocalSourceLoader(sourceId: string): SourceLoader {
  return (params, context) => runLocalSource(sourceId, params, context)
}

async function runLocalSource(
  sourceId: string,
  params: Record<string, unknown>,
  context: SourceLoaderContext,
): Promise<SourceLoaderResult> {
  context.signal.throwIfAborted()
  const port = runtime.port
  if (!port || !runtime.ready) throw new Error("NewsNext CLI disconnected")
  const executionId = createId()
  const controller = new AbortController()
  executions.set(executionId, { ...context, signal: controller.signal })
  let onAbort: () => void = () => {}
  try {
    const aborted = new Promise<never>((_, reject) => {
      onAbort = () => {
        controller.abort(context.signal.reason)
        reject(context.signal.reason)
      }
      context.signal.addEventListener("abort", onAbort, { once: true })
    })
    const value = await Promise.race([
      nativeRpc(port).request("localSourceLoad", { sourceId, executionId, params, secrets: context.secrets ?? {} }),
      aborted,
    ])
    if (!isRecord(value)) throw new Error("Invalid local Source result")
    if (isRecord(value.error)) {
      if (value.error.code === "SOURCE_LOGIN_REQUIRED" && typeof value.error.loginUrl === "string") {
        throw new SourceLoginRequiredError(value.error.loginUrl)
      }
      throw Object.assign(new Error(String(value.error.message)), { name: value.error.name, code: value.error.code })
    }
    if (!isRecord(value.result)) throw new Error("Invalid local Source result")
    const { annotations, ...output } = value.result
    const result = validateSourceLoaderOutput(output)
    if (annotations !== undefined && (!Array.isArray(annotations) || !annotations.every(item => typeof item === "string") || annotations.length !== result.items.length)) {
      throw new Error("Invalid local Source annotations")
    }
    return { ...result, ...(annotations === undefined ? {} : { annotations: annotations as string[] }) }
  } finally {
    context.signal.removeEventListener("abort", onAbort)
    executions.delete(executionId)
    controller.abort()
  }
}

/** Only active, browser-created execution tokens can use the bound Source context. */
export async function executeLocalSourceContext(executionId: string, operation: unknown): Promise<unknown> {
  const context = executions.get(executionId)
  if (!context) throw new Error("Local Source execution expired")
  context.signal.throwIfAborted()
  if (!isRecord(operation)) throw new Error("Invalid local Source operation")
  if (operation.type === "updateSecrets") {
    if (!isRecord(operation.secrets) || !Object.values(operation.secrets).every(value => typeof value === "string")) {
      throw new Error("Invalid local Source secrets")
    }
    await context.updateSecrets?.(operation.secrets as Record<string, string>)
    return null
  }
  if (operation.type !== "fetch" || typeof operation.url !== "string" || typeof operation.method !== "string"
    || !Array.isArray(operation.headers) || !operation.headers.every(header => Array.isArray(header) && header.length === 2 && header.every(item => typeof item === "string"))
    || (operation.body !== undefined && typeof operation.body !== "string")
    || !["include", "omit", "same-origin"].includes(String(operation.credentials))
    || !["follow", "error", "manual"].includes(String(operation.redirect))) {
    throw new Error("Invalid local Source fetch")
  }
  const body = typeof operation.body === "string"
    ? Uint8Array.from(atob(operation.body), character => character.charCodeAt(0))
    : undefined
  const response = await context.fetch(operation.url, {
    signal: context.signal,
    method: operation.method,
    headers: operation.headers as [string, string][],
    body,
    credentials: operation.credentials as RequestCredentials,
    redirect: operation.redirect as RequestRedirect,
    // The runtime's bound ky client owns retries and per-request timeouts.
    retry: 0,
    timeout: false,
    throwHttpErrors: false,
  })
  const bytes = new Uint8Array(await response.arrayBuffer())
  // Chunk conversion avoids the argument limit for large responses.
  let binary = ""
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192))
  }
  return { body: btoa(binary), headers: [...response.headers], status: response.status, statusText: response.statusText, url: response.url }
}
