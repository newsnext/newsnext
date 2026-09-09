import type { RequireNativeConnection } from "./types"
import type { ExtensionToHost } from "@/lib/native-protocol/ExtensionToHost"
import { browser } from "#imports"
import { isWidgetSdkControl, isWidgetSdkRequest, sdkErrorFrame, WIDGET_SDK_PORT } from "@/lib/widget-host"
import { runtime } from "./state"

const streams = new Map<string, (frame: unknown) => void>()

export function receiveSdkFrame(requestId: string, frame: unknown): void {
  streams.get(requestId)?.(frame)
}

export function registerSdkBridge(requireConnection: RequireNativeConnection): void {
  browser.runtime.onConnect.addListener((port) => {
    if (port.name !== WIDGET_SDK_PORT) return
    // Only the extension app can grant its installed iframe an SDK port.
    if (port.sender?.id !== browser.runtime.id
      || port.sender.url?.split(/[?#]/)[0] !== browser.runtime.getURL("/app.html")) {
      port.disconnect()
      return
    }
    const requestId = crypto.randomUUID()
    let closed = false
    let connection: Awaited<ReturnType<RequireNativeConnection>> | undefined
    let started: Promise<void> | undefined
    const send = (message: ExtensionToHost): void => connection?.postMessage(message)
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
      streams.delete(requestId)
      connection?.onDisconnect.removeListener(disconnected)
      try {
        send({ type: "sdkCancel", requestId })
      } catch { /* The native connection may already be closed. */ }
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
          streams.set(requestId, (frame) => {
            try {
              port.postMessage(frame)
            } catch {
              cleanup()
            }
          })
          send({ type: "sdkRequest", requestId, request: message.request })
        })()
        void started.catch(fail)
      } else if (isWidgetSdkControl(message)) {
        if (message.type === "cancel") {
          cleanup()
        } else if (started) {
          void started.then(() => {
            if (!closed) send({ type: "sdkNext", requestId })
          }).catch(fail)
        }
      } else {
        fail(new Error("Invalid Widget SDK request"))
      }
    })
  })
}
