import type { RegisteredSourceDefinition, SourceSecretDefinition, SourceSecretHttpTransformDefinition, SourceSecretHttpTransformRequest, SourceSecrets } from "@newsnext/client-source/typings"

const DEFAULT_LOCAL_STORAGE_SECRET_CACHE_STORAGE_KEY = "newsnext_source_secrets"

interface BrowserCookie {
  value?: string
}

interface BrowserTab {
  id?: number
}

interface BrowserCookiesApi {
  get: (
    details: { url: string, name: string },
    callback?: (cookie?: BrowserCookie) => void,
  ) => Promise<BrowserCookie | undefined> | void
}

interface BrowserTabsApi {
  query: (
    queryInfo: { url: string | string[] },
    callback?: (tabs: BrowserTab[]) => void,
  ) => Promise<BrowserTab[]> | void
}

interface BrowserScriptingApi {
  executeScript: (
    injection: {
      target: { tabId: number }
      args?: unknown[]
      func: (...args: unknown[]) => unknown
    },
    callback?: (results: Array<{ result?: unknown }>) => void,
  ) => Promise<Array<{ result?: unknown }>> | void
}

interface BrowserStorageAreaApi {
  get: (
    keys: string | string[] | Record<string, unknown> | null,
    callback?: (items: Record<string, unknown>) => void,
  ) => Promise<Record<string, unknown>> | void
}

interface BrowserExtensionGlobal {
  chrome?: {
    cookies?: BrowserCookiesApi
    runtime?: {
      lastError?: { message?: string }
    }
    scripting?: BrowserScriptingApi
    storage?: {
      local?: BrowserStorageAreaApi
    }
    tabs?: BrowserTabsApi
  }
  browser?: {
    cookies?: BrowserCookiesApi
    scripting?: BrowserScriptingApi
    storage?: {
      local?: BrowserStorageAreaApi
    }
    tabs?: BrowserTabsApi
  }
}

interface LocalStorageGlobal {
  localStorage?: {
    getItem: (key: string) => string | null
  }
}

function isPromiseLike<T>(value: unknown): value is Promise<T> {
  return typeof value === "object"
    && value !== null
    && "then" in value
    && typeof value.then === "function"
}

function getExtensionGlobal(): BrowserExtensionGlobal {
  return globalThis as BrowserExtensionGlobal
}

function getCookiesApi(): BrowserCookiesApi | undefined {
  const extensionGlobal = getExtensionGlobal()
  return extensionGlobal.browser?.cookies ?? extensionGlobal.chrome?.cookies
}

function getTabsApi(): BrowserTabsApi | undefined {
  const extensionGlobal = getExtensionGlobal()
  return extensionGlobal.browser?.tabs ?? extensionGlobal.chrome?.tabs
}

function getScriptingApi(): BrowserScriptingApi | undefined {
  const extensionGlobal = getExtensionGlobal()
  return extensionGlobal.browser?.scripting ?? extensionGlobal.chrome?.scripting
}

function getStorageAreaApi(): BrowserStorageAreaApi | undefined {
  const extensionGlobal = getExtensionGlobal()
  return extensionGlobal.browser?.storage?.local ?? extensionGlobal.chrome?.storage?.local
}

function isBrowserCookiesApi(cookies: BrowserCookiesApi): boolean {
  return getExtensionGlobal().browser?.cookies === cookies
}

function isBrowserTabsApi(tabs: BrowserTabsApi): boolean {
  return getExtensionGlobal().browser?.tabs === tabs
}

function isBrowserScriptingApi(scripting: BrowserScriptingApi): boolean {
  return getExtensionGlobal().browser?.scripting === scripting
}

function isBrowserStorageAreaApi(storageArea: BrowserStorageAreaApi): boolean {
  return getExtensionGlobal().browser?.storage?.local === storageArea
}

function readLocalStorageValue(...args: unknown[]): string | null {
  const [key] = args
  if (typeof key !== "string") {
    return null
  }

  return (globalThis as LocalStorageGlobal).localStorage?.getItem(key) ?? null
}

function compactHeaders(headers: Record<string, string | undefined> | undefined): Record<string, string> | undefined {
  if (!headers) {
    return undefined
  }

  return Object.fromEntries(
    Object.entries(headers).filter((entry): entry is [string, string] => entry[1] !== undefined),
  )
}

function normalizeTransformBody(body: SourceSecretHttpTransformRequest["body"]): BodyInit | undefined {
  if (body === undefined) {
    return undefined
  }

  return typeof body === "string" ? body : JSON.stringify(body)
}

function mergeTransformRequest(
  transform: SourceSecretHttpTransformDefinition,
  secrets: SourceSecrets,
): SourceSecretHttpTransformRequest | undefined {
  const request = transform.request?.(secrets)
  if (request === undefined && transform.request) {
    return undefined
  }

  return {
    url: transform.url,
    method: transform.method,
    credentials: transform.credentials,
    ...request,
  }
}

function hasTransformRequestUrl(request: SourceSecretHttpTransformRequest): request is SourceSecretHttpTransformRequest & { url: string } {
  return typeof request.url === "string" && request.url.length > 0
}

function isEmptyTransformRequest(request: SourceSecretHttpTransformRequest): boolean {
  return Object.keys(request).length === 0
}

function shouldSkipTransformRequest(request: SourceSecretHttpTransformRequest | undefined): request is undefined {
  return request === undefined || isEmptyTransformRequest(request)
}

function normalizeTransformHeaders(request: SourceSecretHttpTransformRequest): Record<string, string> | undefined {
  return compactHeaders(request.headers)
}

function resolveTransformRequest(
  transform: SourceSecretHttpTransformDefinition,
  secrets: SourceSecrets,
): (SourceSecretHttpTransformRequest & { url: string }) | undefined {
  const request = mergeTransformRequest(transform, secrets)
  if (shouldSkipTransformRequest(request) || !hasTransformRequestUrl(request)) {
    return undefined
  }

  return request
}

function normalizeTransformInit(request: SourceSecretHttpTransformRequest): RequestInit {
  return {
    method: request.method ?? "POST",
    credentials: request.credentials,
    headers: normalizeTransformHeaders(request),
    body: normalizeTransformBody(request.body),
  }
}

async function readJsonPath(response: Response, path: string): Promise<string | undefined> {
  const data = await response.json() as unknown
  const value = path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") {
      return undefined
    }

    return (current as Record<string, unknown>)[key]
  }, data)

  return typeof value === "string" ? value.trim() || undefined : undefined
}

async function refreshSourceSecret(
  transform: SourceSecretHttpTransformDefinition,
  currentSecrets: SourceSecrets,
): Promise<string | undefined> {
  const request = resolveTransformRequest(transform, currentSecrets)
  if (!request) {
    return undefined
  }

  const response = await fetch(request.url, normalizeTransformInit(request))

  if (!response.ok) {
    return undefined
  }

  if (transform.output.type === "header") {
    return response.headers.get(transform.output.key)?.trim() || undefined
  }

  return await readJsonPath(response, transform.output.key)
}

async function readCookieSecret(secret: SourceSecretDefinition & { type: "cookie" }): Promise<string | undefined> {
  const cookies = getCookiesApi()
  if (!cookies) {
    return undefined
  }

  if (isBrowserCookiesApi(cookies)) {
    const maybeCookie = cookies.get({ url: secret.url, name: secret.name })
    if (isPromiseLike<BrowserCookie | undefined>(maybeCookie)) {
      return (await maybeCookie)?.value
    }
  }

  return await new Promise((resolve) => {
    cookies.get({ url: secret.url, name: secret.name }, (cookie) => {
      if (getExtensionGlobal().chrome?.runtime?.lastError) {
        resolve(undefined)
        return
      }

      resolve(cookie?.value)
    })
  })
}

async function queryLocalStorageTabs(origin: string): Promise<BrowserTab[]> {
  const tabs = getTabsApi()
  if (!tabs) {
    return []
  }

  const query = { url: `${origin.replace(/\/$/, "")}/*` }
  if (isBrowserTabsApi(tabs)) {
    const maybeTabs = tabs.query(query)
    if (isPromiseLike<BrowserTab[]>(maybeTabs)) {
      return await maybeTabs
    }
  }

  return await new Promise((resolve) => {
    tabs.query(query, resolve)
  })
}

async function executeReadLocalStorageValue(tabId: number, itemKey: string): Promise<string | undefined> {
  const scripting = getScriptingApi()
  if (!scripting) {
    return undefined
  }

  const injection = {
    target: { tabId },
    args: [itemKey],
    func: readLocalStorageValue,
  } satisfies Parameters<BrowserScriptingApi["executeScript"]>[0]

  const results = isBrowserScriptingApi(scripting)
    ? scripting.executeScript(injection)
    : undefined
  const resolvedResults = isPromiseLike<Array<{ result?: unknown }>>(results)
    ? await results
    : await new Promise<Array<{ result?: unknown }>>((resolve) => {
        scripting.executeScript(injection, resolve)
      })

  const result = resolvedResults[0]?.result
  return typeof result === "string" ? result.trim() || undefined : undefined
}

async function readLocalStorageSecret(secret: SourceSecretDefinition & { type: "localStorage" }): Promise<string | undefined> {
  const [tab] = (await queryLocalStorageTabs(secret.origin)).filter((item): item is BrowserTab & { id: number } => typeof item.id === "number")
  if (!tab) {
    return undefined
  }

  return await executeReadLocalStorageValue(tab.id, secret.itemKey)
}

async function readStorageValue(key: string): Promise<unknown> {
  const storageArea = getStorageAreaApi()
  if (!storageArea) {
    return undefined
  }

  if (isBrowserStorageAreaApi(storageArea)) {
    const maybeItems = storageArea.get(key)
    if (isPromiseLike<Record<string, unknown>>(maybeItems)) {
      return (await maybeItems)[key]
    }
  }

  return await new Promise((resolve) => {
    storageArea.get(key, (items) => {
      if (getExtensionGlobal().chrome?.runtime?.lastError) {
        resolve(undefined)
        return
      }

      resolve(items[key])
    })
  })
}

function parseStoredVars(value: unknown): unknown {
  if (typeof value !== "string") {
    return value
  }

  try {
    return JSON.parse(value) as unknown
  } catch {
    return undefined
  }
}

function readObjectPath(value: unknown, path: readonly string[]): unknown {
  return path.reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") {
      return undefined
    }

    return (current as Record<string, unknown>)[key]
  }, value)
}

function getLocalStorageSecretCache(
  secret: SourceSecretDefinition & { type: "localStorage" },
  provider: string | undefined,
): readonly string[] | undefined {
  if (secret.cache === false || !provider) {
    return undefined
  }

  return [provider, secret.key]
}

async function readLocalStorageSecretCache(
  secret: SourceSecretDefinition & { type: "localStorage" },
  provider: string | undefined,
): Promise<string | undefined> {
  const cachePath = getLocalStorageSecretCache(secret, provider)
  if (!cachePath) {
    return undefined
  }

  const storedValue = parseStoredVars(await readStorageValue(DEFAULT_LOCAL_STORAGE_SECRET_CACHE_STORAGE_KEY))
  const value = readObjectPath(storedValue, cachePath)
  return typeof value === "string" ? value.trim() || undefined : undefined
}

async function resolveSourceSecret(secret: SourceSecretDefinition, provider: string | undefined): Promise<string | undefined> {
  if (secret.type === "cookie") {
    return await readCookieSecret(secret)
  }

  return await readLocalStorageSecretCache(secret, provider) ?? await readLocalStorageSecret(secret)
}

export async function resolveSourceSecrets(
  source: Pick<RegisteredSourceDefinition, "secrets" | "secretTransforms">,
  provider?: string,
): Promise<SourceSecrets> {
  const secretDefinitions = source.secrets
  if (!secretDefinitions?.length && !source.secretTransforms?.length) {
    return {}
  }

  const entries = await Promise.all(
    (secretDefinitions ?? []).map(async secret => [secret.key, await resolveSourceSecret(secret, provider)] as const),
  )

  const secrets = Object.fromEntries(entries)
  for (const transform of source.secretTransforms ?? []) {
    const shouldRefresh = transform.when === "always" || !secrets[transform.targetKey]
    if (!shouldRefresh) {
      continue
    }

    secrets[transform.targetKey] = await refreshSourceSecret(transform, secrets) ?? secrets[transform.targetKey]
  }

  return secrets
}
