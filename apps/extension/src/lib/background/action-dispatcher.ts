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

export interface BackgroundActionDiagnostics<Input, Result> {
  input?: (input: Input) => unknown
  result?: (result: Result) => unknown
}

const MAX_ACTION_RECORDS = 100
const actionRecords: BackgroundActionRecord[] = []
const actionListeners = new Set<() => void>()

export async function dispatchBackgroundAction<Result>(
  action: DispatchBackgroundActionInput,
  execute: () => Promise<Result> | Result,
  diagnostics?: BackgroundActionDiagnostics<unknown, Result>,
): Promise<Result> {
  if (!import.meta.env.DEV) return await execute()
  const record = beginBackgroundAction({
    ...action,
    input: diagnostics?.input ? diagnostics.input(action.input) : action.input,
  })
  try {
    const result = await execute()
    updateBackgroundAction(record, {
      result: cloneDiagnosticValue(
        diagnostics?.result ? diagnostics.result(result) : result,
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

function cloneDiagnosticValue(value: unknown): unknown {
  try {
    return structuredClone(value)
  } catch {
    return String(value)
  }
}
