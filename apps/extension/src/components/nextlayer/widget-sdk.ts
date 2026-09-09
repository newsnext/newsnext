import { isWidgetSdkControl, isWidgetSdkRequest, sdkErrorFrame, WIDGET_SDK_PORT } from "@newsnext/sdk/widget-host"
import { browser } from "#imports"

/** Each iframe request owns a port; source identity is checked before granting access. */
export function bindWidgetSdk(iframe: HTMLIFrameElement): () => void {
  const connections = new Set<(error?: Error) => void>()
  const reset = (): void => {
    for (const close of connections) close(new Error("The Widget iframe was detached"))
  }
  const receive = (event: MessageEvent<unknown>): void => {
    if (event.source !== iframe.contentWindow || !isWidgetSdkRequest(event.data) || event.ports.length !== 1) return
    const channel = event.ports[0]!
    if (connections.size >= 32) {
      channel.postMessage(sdkErrorFrame(new Error("Too many concurrent Widget SDK requests")))
      channel.close()
      return
    }
    const port = browser.runtime.connect({ name: WIDGET_SDK_PORT })
    function close(error?: Error): void {
      connections.delete(close)
      if (error) channel.postMessage(sdkErrorFrame(error))
      port.onDisconnect.removeListener(disconnected)
      port.disconnect()
      channel.close()
    }
    function disconnected(): void {
      close(new Error("The Widget SDK connection closed"))
    }
    connections.add(close)
    channel.onmessage = ({ data }: MessageEvent<unknown>) => {
      if (!isWidgetSdkControl(data) || data.type === "cancel") {
        close()
      } else {
        try {
          port.postMessage(data)
        } catch {
          disconnected()
        }
      }
    }
    channel.onmessageerror = () => close(new Error("Invalid Widget SDK control message"))
    port.onMessage.addListener((frame: unknown) => channel.postMessage(frame))
    port.onDisconnect.addListener(disconnected)
    port.postMessage(event.data)
  }
  window.addEventListener("message", receive)
  return () => {
    window.removeEventListener("message", receive)
    reset()
  }
}
