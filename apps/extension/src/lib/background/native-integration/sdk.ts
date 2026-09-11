import type { RequireNativeConnection } from "./types"
import { browser } from "#imports"
import { isWidgetSdkControl, isWidgetSdkRequest, sdkErrorFrame, WIDGET_SDK_PORT } from "@/lib/widget-host"
import { nativeRpc } from "./rpc"
import { NativeRequestNotSentError } from "./rpc-client"
import { runtime } from "./state"

export function registerSdkBridge(requireConnection: RequireNativeConnection): void {
  browser.runtime.onConnect.addListener((port) => {
    if (port.name !== WIDGET_SDK_PORT) return
    // Only the extension app can grant its installed iframe an SDK port.
    if (port.sender?.id !== browser.runtime.id
      || port.sender.url?.split(/[?#]/)[0] !== browser.runtime.getURL("/app.html")) {
      port.disconnect()
      return
    }
    const streamId = crypto.randomUUID()
    let closed = false
    let connection: Awaited<ReturnType<RequireNativeConnection>> | undefined
    let started: Promise<void> | undefined
    let opening = false
    let pulling = false
    let pullTimeoutMs = 63_000
    const fail = (error: unknown): void => {
      try {
        if (!closed) port.postMessage(sdkErrorFrame(error))
      } catch { /* The requesting iframe may have disconnected. */ }
      cleanup()
    }
    const disconnected = (): void => fail(new Error("The NewsNext native connection closed"))
    function cleanup(): void {
      if (closed) return
      closed = true
      connection?.onDisconnect.removeListener(disconnected)
      // Cancel after open settles, including a lost open response. The stream ID is
      // independent of RPC IDs, so cleanup is idempotent and cannot race creation.
      void started?.catch(() => undefined).then(async () => {
        if (connection && opening) await nativeRpc(connection).request("sdk.cancel", { streamId }, 5000)
      }).catch(() => undefined)
    }
    port.onDisconnect.addListener(cleanup)
    port.onMessage.addListener((message: unknown) => {
      if (closed) return
      if (isWidgetSdkRequest(message) && !started) {
        started = (async () => {
          connection = await requireConnection()
          if (closed) return
          if (!runtime.capabilities.includes("sdk")) {
            throw new Error("Update the NewsNext native host and reconnect the extension to use the Widget SDK")
          }
          connection.onDisconnect.addListener(disconnected)
          const request = message.request
          if (typeof request.timeoutMs === "number") pullTimeoutMs = request.timeoutMs + 3000
          opening = true
          try {
            await nativeRpc(connection).request("sdk.open", { streamId, request })
          } catch (error) {
            if (error instanceof NativeRequestNotSentError) opening = false
            throw error
          }
        })()
        void started.catch(fail)
      } else if (isWidgetSdkControl(message)) {
        if (message.type === "cancel") {
          cleanup()
        } else if (started) {
          if (pulling) {
            fail(new Error("An SDK pull is already pending"))
            return
          }
          pulling = true
          void started.then(async () => {
            if (closed || !connection) return
            const frame = await nativeRpc(connection).request("sdk.next", { streamId }, pullTimeoutMs)
            if (closed) return
            port.postMessage(frame)
            if (frame && typeof frame === "object" && "type" in frame && (frame.type === "end" || frame.type === "error")) cleanup()
          }).catch(fail).finally(() => {
            pulling = false
          })
        }
      } else {
        fail(new Error("Invalid Widget SDK request"))
      }
    })
  })
}
