import type { HostToExtension, NativeNotification } from "@newsnext/sdk/native-protocol"
import { nativeNotificationSchema, parseHostMessage, parseNativeValue } from "@newsnext/sdk/native-protocol"
import { NativeMessageChunkAssembler } from "../native-message-chunks"
import { NATIVE_REQUEST_TIMEOUT_MS } from "./state"
import { fromNativeWorkspaceData, toNativeWorkspaceData } from "./workspace-data"

type ParsedHostMessage = Exclude<HostToExtension, { type: "chunk" }>
const nativeMessageChunks = new NativeMessageChunkAssembler(NATIVE_REQUEST_TIMEOUT_MS)

export function parseNativeHostValue(value: unknown): ParsedHostMessage | undefined {
  const result = nativeMessageChunks.accept(value)
  if (!result.complete) return undefined
  const message = parseHostMessage(result.value)
  if (message.type === "chunk") throw new Error("The native host returned a nested message chunk")
  if (message.type === "ready") {
    return {
      ...message,
      insightServerUrl: parseInsightServerOrigin(message.insightServerUrl),
      workspace: { ...message.workspace, ...toNativeWorkspaceData(fromNativeWorkspaceData(message.workspace)) },
    }
  }
  return message
}

export function clearNativeMessageChunks(): void {
  nativeMessageChunks.clear()
}

export function parseNativeNotification(method: string, params: unknown): NativeNotification {
  return parseNativeValue(nativeNotificationSchema, { method, params })
}

function parseInsightServerOrigin(value: unknown): string {
  if (typeof value !== "string") {
    throw new TypeError("The native host returned an invalid widget server URL")
  }
  const url = new URL(value)
  if (
    url.protocol !== "http:"
    || url.hostname !== "127.0.0.1"
    || !url.port
    || url.username
    || url.password
    || url.pathname !== "/"
    || url.search
    || url.hash
  ) {
    throw new Error("The native host widget server must use a loopback HTTP origin")
  }
  return url.origin
}
