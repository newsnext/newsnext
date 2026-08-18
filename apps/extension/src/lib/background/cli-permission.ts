import type { SourcePermissionRequest } from "../source/permissions"
import { browser } from "#imports"

const CLI_PERMISSION_PAGE = "/cli-permission.html"

export interface CliPermissionPrompt {
  description: string
  request: SourcePermissionRequest
}

interface PendingCliPermission extends CliPermissionPrompt {
  resolve: (granted: boolean) => void
  windowId?: number
}

interface CliPermissionGetMessage {
  requestId: string
  type: "cliPermission.get"
}

interface CliPermissionCompleteMessage {
  granted: boolean
  requestId: string
  type: "cliPermission.complete"
}

type CliPermissionMessage = CliPermissionGetMessage | CliPermissionCompleteMessage

const pendingPermissions = new Map<string, PendingCliPermission>()
let registered = false

function isCliPermissionMessage(value: unknown): value is CliPermissionMessage {
  if (!value || typeof value !== "object") return false
  const message = value as Record<string, unknown>
  if (typeof message.requestId !== "string") return false
  return message.type === "cliPermission.get"
    || (message.type === "cliPermission.complete" && typeof message.granted === "boolean")
}

function isCliPermissionPage(url: string | undefined): boolean {
  return url?.split(/[?#]/, 1)[0] === browser.runtime.getURL(CLI_PERMISSION_PAGE)
}

function settlePermission(requestId: string, granted: boolean): void {
  const pending = pendingPermissions.get(requestId)
  if (!pending) return
  pendingPermissions.delete(requestId)
  pending.resolve(granted)
}

function registerCliPermissionPrompt(): void {
  if (registered) return
  registered = true

  browser.runtime.onMessage.addListener((value: unknown, sender) => {
    if (!isCliPermissionMessage(value) || !isCliPermissionPage(sender.url)) return undefined
    const pending = pendingPermissions.get(value.requestId)
    if (!pending) return undefined

    if (value.type === "cliPermission.get") {
      return Promise.resolve({
        description: pending.description,
        request: pending.request,
      } satisfies CliPermissionPrompt)
    }

    return browser.permissions.contains(pending.request).catch(() => false).then((hasPermission) => {
      const granted = value.granted && hasPermission
      settlePermission(value.requestId, granted)
      return { granted }
    })
  })

  browser.windows.onRemoved.addListener((windowId) => {
    for (const [requestId, pending] of pendingPermissions) {
      if (pending.windowId === windowId) settlePermission(requestId, false)
    }
  })
}

export async function requestCliPermission(
  request: SourcePermissionRequest,
  description: string,
): Promise<boolean> {
  if (await browser.permissions.contains(request).catch(() => false)) return true

  registerCliPermissionPrompt()
  const requestId = crypto.randomUUID()
  let resolvePermission!: (granted: boolean) => void
  const result = new Promise<boolean>((resolve) => {
    resolvePermission = resolve
  })
  const pending: PendingCliPermission = {
    description,
    request,
    resolve: resolvePermission,
  }
  pendingPermissions.set(requestId, pending)

  try {
    const popup = await browser.windows.create({
      focused: true,
      height: 320,
      type: "popup",
      url: browser.runtime.getURL(`${CLI_PERMISSION_PAGE}#${encodeURIComponent(requestId)}`),
      width: 620,
    })
    if (!popup) throw new Error("NewsNext could not open the permission window")
    pending.windowId = popup.id
  } catch (error) {
    pendingPermissions.delete(requestId)
    throw error
  }

  return result
}
