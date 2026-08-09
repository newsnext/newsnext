import type {
  SourceConnectionCommandRequest,
  SourceConnectionReadyResponse,
  SourceConnectionResponse,
  SourceConnectionSerializedError,
} from "@newsnext/shared/types"
import type { ServerWebSocket } from "bun"
import type { Buffer } from "node:buffer"
import type {
  DaemonExecuteInput,
  DaemonExecuteResponse,
  DaemonStatus,
} from "../daemon-protocol"
import process from "node:process"
import {
  DAEMON_EXECUTE_PATH,
  DAEMON_STATUS_PATH,
  DAEMON_STOP_PATH,
} from "../daemon-protocol"
import { CliError } from "../errors"

type SocketData = undefined

interface PendingRequest {
  socket: ServerWebSocket<SocketData>
  resolve: (response: Extract<SourceConnectionResponse, { type: "command.result" }>) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}

interface ReadyClient {
  socket: ServerWebSocket<SocketData>
  ready: SourceConnectionReadyResponse
}

interface SourceConnectionSessionOptions {
  onStop?: () => void
}

export class SourceConnectionRemoteError extends Error {
  readonly remote: SourceConnectionSerializedError

  constructor(remote: SourceConnectionSerializedError) {
    super(remote.message)
    this.name = remote.name
    this.remote = remote
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function getOptionalString(
  value: Record<string, unknown>,
  key: string,
): string | undefined {
  return typeof value[key] === "string" ? value[key] : undefined
}

export function parseSourceConnectionResponse(value: unknown): SourceConnectionResponse | undefined {
  if (!isRecord(value) || typeof value.type !== "string") {
    return
  }
  if (value.type === "ping") {
    return { type: "ping" }
  }
  if (value.type === "pong") {
    return {
      id: typeof value.id === "string" ? value.id : undefined,
      type: "pong",
    }
  }
  if (value.type === "ready" && isRecord(value.instance)) {
    const { instance } = value
    if (
      typeof instance.id === "string"
      && typeof instance.browser === "string"
      && typeof instance.extensionVersion === "string"
    ) {
      return {
        type: "ready",
        instance: {
          id: instance.id,
          browser: instance.browser,
          extensionVersion: instance.extensionVersion,
        },
      }
    }
    return
  }
  if (
    value.type !== "command.result"
    || typeof value.id !== "string"
    || typeof value.ok !== "boolean"
  ) {
    return
  }
  if (value.ok) {
    return {
      id: value.id,
      type: "command.result",
      ok: true,
      data: value.data,
    }
  }
  if (
    !isRecord(value.error)
    || typeof value.error.name !== "string"
    || typeof value.error.message !== "string"
  ) {
    return
  }
  return {
    id: value.id,
    type: "command.result",
    ok: false,
    error: {
      name: value.error.name,
      message: value.error.message,
      stack: getOptionalString(value.error, "stack"),
      code: getOptionalString(value.error, "code"),
      loginUrl: getOptionalString(value.error, "loginUrl"),
    },
  }
}

export class SourceConnectionSession {
  readonly url: URL
  private readonly server: ReturnType<typeof Bun.serve<SocketData>>
  private readonly startedAt = Date.now()
  private readonly readyClients = new Map<ServerWebSocket<SocketData>, SourceConnectionReadyResponse>()
  private readonly pending = new Map<string, PendingRequest>()
  private readonly changeWaiters = new Set<() => void>()

  constructor(url: URL, options: SourceConnectionSessionOptions = {}) {
    this.url = url
    try {
      this.server = Bun.serve<SocketData>({
        hostname: url.hostname,
        port: Number(url.port),
        fetch: async (request, server) => {
          const pathname = new URL(request.url).pathname
          const isControlRequest = pathname === DAEMON_STATUS_PATH
            || pathname === DAEMON_EXECUTE_PATH
            || pathname === DAEMON_STOP_PATH
          if (isControlRequest && request.headers.has("origin")) {
            return new Response("Forbidden", { status: 403 })
          }
          if (pathname === DAEMON_STATUS_PATH && request.method === "GET") {
            return Response.json(this.getStatus())
          }
          if (pathname === DAEMON_EXECUTE_PATH && request.method === "POST") {
            return await this.handleExecuteRequest(request)
          }
          if (pathname === DAEMON_STOP_PATH && request.method === "POST") {
            setTimeout(() => options.onStop?.(), 50)
            return Response.json({ ok: true })
          }
          if (
            pathname === url.pathname
            && server.upgrade(request)
          ) {
            return
          }
          return new Response("Not found", { status: 404 })
        },
        websocket: {
          open: () => {
            this.notifyChange()
          },
          message: (socket, message) => {
            this.handleMessage(socket, message)
          },
          close: (socket) => {
            this.readyClients.delete(socket)
            for (const [id, request] of this.pending) {
              if (request.socket === socket) {
                clearTimeout(request.timer)
                request.reject(new CliError("The extension disconnected during the request"))
                this.pending.delete(id)
              }
            }
            this.notifyChange()
          },
        },
      })
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      throw new CliError(`Could not start source connection server at ${url.href}: ${detail}`)
    }
  }

  private getStatus(): DaemonStatus {
    return {
      pid: process.pid,
      startedAt: this.startedAt,
      url: this.url.href,
      instances: [...this.readyClients.values()].map(ready => ready.instance),
    }
  }

  private async handleExecuteRequest(request: Request): Promise<Response> {
    let input: DaemonExecuteInput
    try {
      input = await request.json() as DaemonExecuteInput
      if (
        !isRecord(input)
        || !isRecord(input.request)
        || ![
          "source.list",
          "source.run",
          "source-history.datasets",
          "source-history.observations",
          "source-history.get",
          "source-history.compare",
        ].includes(input.request.type)
        || typeof input.request.id !== "string"
        || (typeof input.browser !== "string" && input.browser !== undefined)
        || typeof input.timeoutMs !== "number"
        || !Number.isFinite(input.timeoutMs)
        || input.timeoutMs <= 0
      ) {
        throw new Error("Invalid execution request")
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return Response.json({ error: message }, { status: 400 })
    }

    let result: DaemonExecuteResponse
    try {
      const execution = await this.execute(
        input.request,
        input.browser,
        input.timeoutMs,
      )
      result = {
        ok: true,
        data: execution.data,
        instance: execution.instance,
      }
    } catch (error) {
      result = error instanceof SourceConnectionRemoteError
        ? {
            ok: false,
            kind: "extension",
            error: error.remote,
          }
        : {
            ok: false,
            kind: "daemon",
            error: {
              message: error instanceof Error ? error.message : String(error),
            },
          }
    }
    return Response.json(result)
  }

  private notifyChange(): void {
    for (const resolve of this.changeWaiters) {
      resolve()
    }
    this.changeWaiters.clear()
  }

  private handleMessage(
    socket: ServerWebSocket<SocketData>,
    message: string | Buffer,
  ): void {
    let value: unknown
    try {
      value = JSON.parse(String(message)) as unknown
    } catch {
      return
    }
    const response = parseSourceConnectionResponse(value)
    if (!response) {
      return
    }

    if (response.type === "ready") {
      this.readyClients.set(socket, response)
      this.notifyChange()
      return
    }
    if (response.type === "ping") {
      socket.send(JSON.stringify({ type: "pong" }))
      return
    }
    if (response.type !== "command.result") {
      return
    }

    const request = this.pending.get(response.id)
    if (!request || request.socket !== socket) {
      return
    }
    clearTimeout(request.timer)
    this.pending.delete(response.id)
    request.resolve(response)
  }

  private matchingClients(browser?: string): ReadyClient[] {
    return [...this.readyClients].flatMap(([socket, ready]) =>
      !browser || ready.instance.browser === browser
        ? [{ socket, ready }]
        : [],
    )
  }

  private async waitForClient(
    browser: string | undefined,
    timeoutMs: number,
  ): Promise<ReadyClient> {
    const deadline = Date.now() + timeoutMs
    while (true) {
      const clients = this.matchingClients(browser)
      const client = clients[0]
      if (client && clients.length === 1) {
        return client
      }
      if (clients.length > 1) {
        const labels = clients.map(({ ready }) =>
          `${ready.instance.browser} ${ready.instance.extensionVersion} (${ready.instance.id.slice(0, 8)})`,
        )
        throw new CliError(
          `Multiple extensions matched: ${labels.join(", ")}. Close extra profiles or use --browser.`,
        )
      }

      const remainingMs = deadline - Date.now()
      if (remainingMs <= 0) {
        const suffix = browser ? ` for browser "${browser}"` : ""
        throw new CliError(`Timed out waiting for a NewsNext extension${suffix}`)
      }
      await new Promise<void>((resolve) => {
        let timer: ReturnType<typeof setTimeout>
        const onChange = (): void => {
          clearTimeout(timer)
          this.changeWaiters.delete(onChange)
          resolve()
        }
        timer = setTimeout(() => {
          this.changeWaiters.delete(onChange)
          resolve()
        }, remainingMs)
        this.changeWaiters.add(onChange)
      })
    }
  }

  async execute(
    request: SourceConnectionCommandRequest,
    browser: string | undefined,
    timeoutMs: number,
  ): Promise<{ data: unknown, instance: SourceConnectionReadyResponse["instance"] }> {
    const client = await this.waitForClient(browser, timeoutMs)
    const response = await new Promise<Extract<SourceConnectionResponse, { type: "command.result" }>>(
      (resolve, reject) => {
        const timer = setTimeout(() => {
          this.pending.delete(request.id)
          reject(new CliError("Timed out waiting for the extension result"))
        }, timeoutMs)
        this.pending.set(request.id, {
          socket: client.socket,
          resolve,
          reject,
          timer,
        })
        client.socket.send(JSON.stringify(request))
      },
    )

    if (!response.ok) {
      throw new SourceConnectionRemoteError(response.error)
    }
    return {
      data: response.data,
      instance: client.ready.instance,
    }
  }

  async close(): Promise<void> {
    for (const request of this.pending.values()) {
      clearTimeout(request.timer)
      request.reject(new CliError("Source connection session closed"))
    }
    this.pending.clear()
    await this.server.stop(true)
  }
}
