import type { ExtensionConnectionFetchResponse } from "@newsnext/extension-connection"
import type { SourcePermissionTarget } from "../source/permissions"
import type { ConnectedFetchInput } from "./background-actions"
import { createSourceFetch } from "@newsnext/source-kit/utils"
import { getPermissionRequestForSource } from "../source/permissions"
import { requestCliPermission } from "./cli-permission"

export async function executeConnectedFetch(
  input: ConnectedFetchInput,
): Promise<ExtensionConnectionFetchResponse> {
  const url = new URL(input.url)
  const permissionRequest = { origins: [`${url.protocol}//${url.hostname}/*`] }
  if (!await requestCliPermission(permissionRequest, "Required to complete this fetch.")) {
    throw new Error(`Site access was not granted for ${url.origin}`)
  }
  const response = await createSourceFetch(AbortSignal.timeout(input.timeoutMs))(input.url, {
    method: input.method,
    headers: input.headers,
    body: input.body,
    retry: 0,
    throwHttpErrors: false,
    timeout: false,
  })
  return {
    status: response.status,
    statusText: response.statusText,
    headers: [...response.headers.entries()],
    body: await response.text(),
  }
}

export async function authorizeConnectedSource(
  source: SourcePermissionTarget,
  params: Record<string, unknown>,
): Promise<void> {
  const permissionRequest = getPermissionRequestForSource(source, params)
  if (!permissionRequest) return
  const granted = await requestCliPermission(permissionRequest, "Required to load this source.")
  if (!granted) throw new Error("Site access was not granted for this source")
}
