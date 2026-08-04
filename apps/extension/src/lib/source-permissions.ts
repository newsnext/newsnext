import type {
  SourceDescriptor,
  SourceParamSchema,
  SourceProvider,
} from "@newsnext/source/types"
import type { OptionalSourcePermission } from "@/lib/source-permission-constants"
import { browser } from "#imports"
import { getHostPermissionOrigins } from "@/lib/host-permissions"

export interface SourcePermissionRequest {
  origins?: string[]
  permissions?: OptionalSourcePermission[]
}

export type SourcePermissionTarget = Pick<
  SourceDescriptor,
  "capabilities" | "metadata" | "params"
> & {
  provider: Pick<SourceProvider, "title">
  sourceId: string
}

export function getPermissionRequestForSource(
  source: SourcePermissionTarget,
  params: Record<string, unknown> = {},
): SourcePermissionRequest | undefined {
  switch (source.sourceId) {
    case "browser:bookmarks":
      return { permissions: ["bookmarks", "favicon"] }
    case "browser:history":
      return { permissions: ["history"] }
    case "rss:feed": {
      const origin = getRssFeedPermissionOrigin(source.params?.url, params.url)
      return origin ? { origins: [origin] } : undefined
    }
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

function getRssFeedPermissionOrigin(
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

export function getSourcePermissionDescription(
  source: SourcePermissionTarget,
  request: SourcePermissionRequest | undefined,
): string {
  if (!request) {
    return "Authorize the permissions required to load this source."
  }

  const browserData = request.permissions?.filter(permission => permission !== "cookies") ?? []
  const hosts = request.origins?.map((origin) => {
    try {
      return new URL(origin.replace("*://", "https://")).hostname
    } catch {
      return origin
    }
  }) ?? []

  if (browserData.length > 0 && hosts.length === 0) {
    return `Authorize access to your browser ${source.metadata.title?.toLowerCase() ?? "data"} to continue.`
  }

  if (hosts.length === 1) {
    return `Authorize access to ${hosts[0]} to load this source.`
  }

  return `Authorize access to ${source.provider.title} services to continue.`
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
