import type { NewsItem } from "@/typings/source"
import { stableStringify } from "@newsnext/shared/utils"
import { normalizeSourceParams, resolveSource } from "@newsnext/sources/service"

export interface LocalSourceLoadResult {
  id: string
  key: string
  items: NewsItem[]
  updated: number
}

interface LoadSourceSuccess {
  ok: true
  items: NewsItem[]
  key?: string
  updated?: number
}

interface LoadSourceFailure {
  ok: false
  error: string
}

type LoadSourceResponse = LoadSourceSuccess | LoadSourceFailure

interface RuntimeMessenger {
  runtime?: {
    lastError?: { message?: string }
    sendMessage?: (
      message: unknown,
      callback?: (response: unknown) => void,
    ) => Promise<unknown> | void
  }
}

function getRuntimeMessenger(): RuntimeMessenger | undefined {
  const globalValue = globalThis as typeof globalThis & {
    browser?: RuntimeMessenger
    chrome?: RuntimeMessenger
  }

  return globalValue.browser?.runtime?.sendMessage
    ? globalValue.browser
    : globalValue.chrome?.runtime?.sendMessage
      ? globalValue.chrome
      : undefined
}

async function loadLocalSourceViaBackground(
  sourceId: string,
  queryParams: Record<string, unknown>,
  normalizedParams: Record<string, unknown>,
): Promise<LocalSourceLoadResult | undefined> {
  const runtimeMessenger = getRuntimeMessenger()

  if (!runtimeMessenger?.runtime?.sendMessage) {
    return undefined
  }

  const message = {
    type: "load-source",
    sourceId,
    params: queryParams,
  }
  const response = await new Promise<unknown>((resolve, reject) => {
    const maybePromise = runtimeMessenger.runtime?.sendMessage?.(message, (callbackResponse) => {
      const runtimeError = runtimeMessenger.runtime?.lastError
      if (runtimeError) {
        reject(new Error(runtimeError.message ?? "Background source runner failed"))
        return
      }

      resolve(callbackResponse)
    })

    if (maybePromise && typeof maybePromise === "object" && "then" in maybePromise) {
      void maybePromise.then(resolve, reject)
    }
  }) as LoadSourceResponse | undefined

  if (!response) {
    throw new Error("Background source runner did not respond")
  }

  if (!response.ok) {
    throw new Error(response.error)
  }

  return {
    id: sourceId,
    key: response.key ?? `${sourceId}:${stableStringify(normalizedParams)}`,
    items: response.items,
    updated: response.updated ?? Date.now(),
  }
}

export async function loadLocalSource(
  sourceId: string,
  queryParams: Record<string, unknown> = {},
): Promise<LocalSourceLoadResult> {
  const source = resolveSource(sourceId)
  const params = normalizeSourceParams(source, queryParams)
  const backgroundResult = await loadLocalSourceViaBackground(sourceId, queryParams, params)

  if (backgroundResult) {
    return backgroundResult
  }

  const items = await source.loader(params)

  return {
    id: sourceId,
    key: `${sourceId}:${stableStringify(params)}`,
    items,
    updated: Date.now(),
  }
}
