import type { browser } from "#imports"

export type { NativeIntegrationConnectionError, NativeIntegrationState, NativeIntegrationStatus } from "@newsnext/sdk/models"
export type NativePort = ReturnType<typeof browser.runtime.connectNative>

export type RequireNativeConnection = () => Promise<NativePort>
