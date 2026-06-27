export type SourceMode = "local" | "remote"

interface RuntimeGlobal {
  browser?: {
    runtime?: {
      id?: string
      sendMessage?: unknown
    }
  }
  chrome?: {
    runtime?: {
      id?: string
      sendMessage?: unknown
    }
  }
}

export function getDefaultSourceMode(): SourceMode {
  const globalValue = globalThis as typeof globalThis & RuntimeGlobal
  const runtime = globalValue.browser?.runtime ?? globalValue.chrome?.runtime

  return runtime?.id && typeof runtime.sendMessage === "function" ? "local" : "remote"
}
