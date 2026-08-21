export type BackgroundActionOrigin = "cli" | "ui"

export interface BackgroundActionRecord {
  commandId?: string
  durationMs?: number
  error?: string
  finishedAt?: number
  id: string
  input: unknown
  name: string
  origin: BackgroundActionOrigin
  result?: unknown
  startedAt: number
  status: "error" | "running" | "success"
}

export interface DispatchBackgroundActionInput {
  commandId?: string
  input: unknown
  name: string
  origin: BackgroundActionOrigin
}

const MAX_ACTION_RECORDS = 100
const actionRecords: BackgroundActionRecord[] = []
const actionListeners = new Set<() => void>()

export async function dispatchBackgroundAction<Result>(
  action: DispatchBackgroundActionInput,
  execute: () => Promise<Result> | Result,
  selectDiagnosticResult?: (result: Result) => unknown,
): Promise<Result> {
  if (!import.meta.env.DEV) return await execute()
  const record = beginBackgroundAction(action)
  try {
    const result = await execute()
    updateBackgroundAction(record, {
      result: cloneDiagnosticValue(
        selectDiagnosticResult ? selectDiagnosticResult(result) : result,
      ),
      status: "success",
    })
    return result
  } catch (error) {
    updateBackgroundAction(record, {
      error: error instanceof Error ? error.message : String(error),
      status: "error",
    })
    throw error
  }
}

export function instrumentBackgroundService<Service extends object>(
  namespace: string,
  service: Service,
  origin: BackgroundActionOrigin,
): Service {
  if (!import.meta.env.DEV) return service
  const instrumented = {} as Service
  for (const key of Object.keys(service) as Array<keyof Service>) {
    const method = service[key]
    if (typeof method !== "function") continue
    instrumented[key] = ((...args: unknown[]) => {
      const name = getServiceActionName(namespace, String(key), args)
      return dispatchBackgroundAction({
        input: getServiceActionInput(namespace, String(key), args),
        name,
        origin,
      }, () => Reflect.apply(method, service, args))
    }) as Service[typeof key]
  }
  return instrumented
}

export function listBackgroundActions(): BackgroundActionRecord[] {
  if (!import.meta.env.DEV) return []
  return actionRecords.map(record => ({ ...record }))
}

export function subscribeBackgroundActions(listener: () => void): () => void {
  actionListeners.add(listener)
  return () => actionListeners.delete(listener)
}

export function clearBackgroundActions(): void {
  if (!import.meta.env.DEV) return
  if (actionRecords.length === 0) return
  actionRecords.length = 0
  notifyBackgroundActions()
}

function beginBackgroundAction(
  action: DispatchBackgroundActionInput,
): BackgroundActionRecord {
  const record: BackgroundActionRecord = {
    ...action,
    id: crypto.randomUUID(),
    input: cloneDiagnosticValue(action.input),
    startedAt: Date.now(),
    status: "running",
  }
  actionRecords.unshift(record)
  actionRecords.splice(MAX_ACTION_RECORDS)
  notifyBackgroundActions()
  return record
}

function updateBackgroundAction(
  record: BackgroundActionRecord,
  update: Pick<BackgroundActionRecord, "status"> & Partial<BackgroundActionRecord>,
): void {
  const finishedAt = Date.now()
  Object.assign(record, update, {
    durationMs: finishedAt - record.startedAt,
    finishedAt,
  })
  notifyBackgroundActions()
}

function notifyBackgroundActions(): void {
  for (const listener of actionListeners) listener()
}

function getServiceActionName(namespace: string, method: string, args: unknown[]): string {
  if (namespace === "application" && (method === "execute" || method === "query")) {
    const operation = readStringProperty(args[0], "type")
    if (operation) return operation
  }
  return `${namespace}.${method}`
}

function getServiceActionInput(namespace: string, method: string, args: unknown[]): unknown {
  if (namespace === "application" && (method === "execute" || method === "query")) {
    return readProperty(args[0], "input")
  }
  return args.length === 1 ? args[0] : args
}

function cloneDiagnosticValue(value: unknown): unknown {
  try {
    return structuredClone(value)
  } catch {
    return String(value)
  }
}

function readProperty(value: unknown, key: string): unknown {
  return value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined
}

function readStringProperty(value: unknown, key: string): string | undefined {
  const property = readProperty(value, key)
  return typeof property === "string" ? property : undefined
}
