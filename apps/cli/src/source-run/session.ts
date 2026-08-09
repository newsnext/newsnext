import type { ServerType } from "@hono/node-server"
import type {
  DaemonExecuteInput,
  DaemonExecuteResponse,
  DaemonRouterContext,
  DaemonStatus,
  ExtensionConnectionCommandRequest,
  ExtensionConnectionCommandResult,
  ExtensionConnectionInstance,
  ExtensionConnectionSerializedError,
} from "@newsnext/extension-connection"
import { EventEmitter, on } from "node:events"
import process from "node:process"
import { serve, upgradeWebSocket } from "@hono/node-server"
import {
  DAEMON_TRPC_PATH,
  daemonRouter,
  parseExtensionConnectionInstance,
} from "@newsnext/extension-connection"
import { fetchRequestHandler } from "@trpc/server/adapters/fetch"
import { applyWSSHandler } from "@trpc/server/adapters/ws"
import { Hono } from "hono"
import { WebSocketServer } from "ws"
import { CliError } from "../errors"

interface PendingRequest {
  client: ReadyClient
  resolve: (response: ExtensionConnectionCommandResult) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}

interface ReadyClient {
  abortController: AbortController
  events: EventEmitter
  instance: ExtensionConnectionInstance
}

interface SourceConnectionSessionOptions {
  onStop: () => void
}

export class SourceConnectionRemoteError extends Error {
  readonly remote: ExtensionConnectionSerializedError

  constructor(remote: ExtensionConnectionSerializedError) {
    super(remote.message)
    this.name = remote.name
    this.remote = remote
  }
}

export class SourceConnectionSession {
  readonly url: URL
  readonly ready: Promise<void>
  private readonly server: ServerType
  private readonly webSocketServer: WebSocketServer
  private readonly startedAt = Date.now()
  private readonly readyClients = new Map<string, ReadyClient>()
  private readonly pending = new Map<string, PendingRequest>()
  private readonly changeWaiters = new Set<() => void>()

  constructor(url: URL, options: SourceConnectionSessionOptions) {
    this.url = url
    const app = new Hono()
    const daemonContext: DaemonRouterContext = {
      role: "control",
      execute: input => this.executeForDaemon(input),
      getStatus: () => this.getStatus(),
      stop: options.onStop,
    }
    app.use(`${DAEMON_TRPC_PATH}/*`, async (context, next) => {
      if (context.req.header("origin")) {
        return context.text("Forbidden", 403)
      }
      return next()
    })
    app.all(`${DAEMON_TRPC_PATH}/*`, context => fetchRequestHandler({
      createContext: () => daemonContext,
      endpoint: DAEMON_TRPC_PATH,
      req: context.req.raw,
      router: daemonRouter,
    }))
    app.use(url.pathname, async (context, next) => {
      const origin = context.req.header("origin")
      if (
        origin
        && !origin.startsWith("chrome-extension://")
        && !origin.startsWith("moz-extension://")
      ) {
        return context.text("Forbidden", 403)
      }
      return next()
    })
    app.get(url.pathname, upgradeWebSocket(() => ({})))

    this.webSocketServer = new WebSocketServer({ noServer: true })
    applyWSSHandler({
      createContext: ({ info }) => {
        const client: ReadyClient = {
          abortController: new AbortController(),
          events: new EventEmitter(),
          instance: parseExtensionConnectionInstance(info.connectionParams),
        }
        return {
          role: "extension",
          complete: result => this.complete(client, result),
          subscribe: signal => this.subscribe(client, signal),
        } satisfies DaemonRouterContext
      },
      keepAlive: {
        enabled: true,
        pingMs: 20_000,
        pongWaitMs: 5_000,
      },
      router: daemonRouter,
      wss: this.webSocketServer,
    })
    let resolveReady!: () => void
    let rejectReady!: (error: Error) => void
    this.ready = new Promise<void>((resolve, reject) => {
      resolveReady = resolve
      rejectReady = reject
    })
    this.server = serve({
      fetch: app.fetch,
      hostname: url.hostname,
      port: Number(url.port),
      websocket: { server: this.webSocketServer },
    }, resolveReady)
    this.server.once("error", (error) => {
      rejectReady(new CliError(
        `Could not start source connection server at ${url.href}: ${error.message}`,
      ))
    })
  }

  private getStatus(): DaemonStatus {
    return {
      pid: process.pid,
      startedAt: this.startedAt,
      url: this.url.href,
      instances: [...this.readyClients.values()].map(client => client.instance),
    }
  }

  private async executeForDaemon(input: DaemonExecuteInput): Promise<DaemonExecuteResponse> {
    try {
      const execution = await this.execute(
        input.request,
        input.browser,
        input.timeoutMs,
      )
      return {
        ok: true,
        data: execution.data,
        instance: execution.instance,
      }
    } catch (error) {
      return error instanceof SourceConnectionRemoteError
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
  }

  private disconnect(client: ReadyClient): void {
    client.abortController.abort()
    if (this.readyClients.get(client.instance.id) === client) {
      this.readyClients.delete(client.instance.id)
    }
    for (const [id, request] of this.pending) {
      if (request.client === client) {
        clearTimeout(request.timer)
        request.reject(new CliError("The extension disconnected during the request"))
        this.pending.delete(id)
      }
    }
    this.notifyChange()
  }

  private async* subscribe(
    client: ReadyClient,
    signal?: AbortSignal,
  ): AsyncIterable<ExtensionConnectionCommandRequest> {
    const existing = this.readyClients.get(client.instance.id)
    if (existing) {
      this.disconnect(existing)
    }
    this.readyClients.set(client.instance.id, client)
    this.notifyChange()
    const abortClient = (): void => client.abortController.abort()
    if (signal?.aborted) {
      abortClient()
    } else {
      signal?.addEventListener("abort", abortClient, { once: true })
    }
    try {
      for await (const [request] of on(client.events, "command", {
        signal: client.abortController.signal,
      })) {
        yield request as ExtensionConnectionCommandRequest
      }
    } catch (error) {
      if (!client.abortController.signal.aborted) {
        throw error
      }
    } finally {
      signal?.removeEventListener("abort", abortClient)
      this.disconnect(client)
    }
  }

  private complete(
    client: ReadyClient,
    response: ExtensionConnectionCommandResult,
  ): void {
    const request = this.pending.get(response.id)
    if (!request || request.client !== client) {
      return
    }
    clearTimeout(request.timer)
    this.pending.delete(response.id)
    request.resolve(response)
  }

  private notifyChange(): void {
    for (const resolve of this.changeWaiters) {
      resolve()
    }
    this.changeWaiters.clear()
  }

  private matchingClients(browser?: string): ReadyClient[] {
    return [...this.readyClients.values()].filter(client =>
      !browser || client.instance.browser === browser,
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
        const labels = clients.map(({ instance }) =>
          `${instance.browser} ${instance.extensionVersion} (${instance.id.slice(0, 8)})`,
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
    request: ExtensionConnectionCommandRequest,
    browser: string | undefined,
    timeoutMs: number,
  ): Promise<{ data: unknown, instance: ExtensionConnectionInstance }> {
    const client = await this.waitForClient(browser, timeoutMs)
    const response = await new Promise<ExtensionConnectionCommandResult>(
      (resolve, reject) => {
        const timer = setTimeout(() => {
          this.pending.delete(request.id)
          reject(new CliError("Timed out waiting for the extension result"))
        }, timeoutMs)
        this.pending.set(request.id, {
          client,
          resolve,
          reject,
          timer,
        })
        client.events.emit("command", request)
      },
    )

    if (!response.ok) {
      throw new SourceConnectionRemoteError(response.error)
    }
    return {
      data: response.data,
      instance: client.instance,
    }
  }

  async close(): Promise<void> {
    for (const request of this.pending.values()) {
      clearTimeout(request.timer)
      request.reject(new CliError("Source connection session closed"))
    }
    this.pending.clear()
    for (const client of this.webSocketServer.clients) {
      client.terminate()
    }
    await new Promise<void>((resolve, reject) => {
      this.server.close(error => error ? reject(error) : resolve())
    })
  }
}
