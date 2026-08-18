import type {
  SourceDescriptor,
  SourceParamSchema,
  SourceProvider,
} from "@newsnext/source-kit/types"
import type { OptionalSourcePermission } from "./permission-constants"
import { browser } from "#imports"
import { getHostPermissionOrigins } from "./host-permissions"

export interface SourcePermissionRequest {
  origins?: string[]
  permissions?: OptionalSourcePermission[]
}

export type SourcePermissionTarget = Pick<
  SourceDescriptor,
  "capabilities" | "params"
> & {
  provider: Pick<SourceProvider, "title">
  sourceId: string
}

export function getPermissionRequestForSource(
  source: SourcePermissionTarget,
  params: Record<string, unknown> = {},
): SourcePermissionRequest | undefined {
  if (source.sourceId === "rss:feed") {
    const origin = getUrlParamPermissionOrigin(source.params?.url, params.url)
    return origin ? { origins: [origin] } : undefined
  }

  const requiresCookies = source.capabilities.cookies.length > 0
  const origins = getHostPermissionOrigins(source.capabilities)

  if (!requiresCookies && origins.length === 0) {
    return undefined
  }

  return requiresCookies
    ? {
        ...(origins.length > 0 ? { origins } : {}),
        permissions: ["cookies"],
      }
    : { origins }
}

export function getPermissionOriginLabel(origin: string): string {
  return origin
    .replace(/^\*:\/\//, "")
    .replace(/\/\*$/, "")
}

function getUrlParamPermissionOrigin(
  schema: SourceParamSchema | undefined,
  value: unknown,
): string | undefined {
  const urlValue = value ?? schema?.default
  if (typeof urlValue !== "string") {
    return undefined
  }

  try {
    const url = new URL(urlValue)
    return url.protocol === "http:" || url.protocol === "https:"
      ? `*://${url.hostname}/*`
      : undefined
  } catch {
    return undefined
  }
}

export async function hasSourcePermission(
  request: SourcePermissionRequest | undefined,
): Promise<boolean> {
  if (!request) {
    return true
  }

  return browser.permissions.contains(request).catch(() => false)
}

export async function requestSourcePermission(
  request: SourcePermissionRequest | undefined,
): Promise<boolean> {
  if (!request) {
    return true
  }

  return browser.permissions.request(request).catch(() => false)
}
