export interface JwtExpiryOptions {
  now?: Date
  bufferSeconds?: number
}

export function decodeJwtPayload(token: string): unknown {
  const payload = token.split(".")[1]
  if (!payload) {
    return undefined
  }

  try {
    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/")
    const paddedPayload = normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, "=")
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(paddedPayload), char => char.charCodeAt(0)))) as unknown
  } catch {
    return undefined
  }
}

export function getJwtExpiration(token: string): number | undefined {
  const payload = decodeJwtPayload(token)
  if (!payload || typeof payload !== "object") {
    return undefined
  }

  const exp = (payload as Record<string, unknown>).exp
  return typeof exp === "number" ? exp : undefined
}

export function isJwtExpired(token: string, options: JwtExpiryOptions = {}): boolean {
  const exp = getJwtExpiration(token)
  if (exp === undefined) {
    return false
  }

  const now = options.now ?? new Date()
  const bufferSeconds = options.bufferSeconds ?? 0
  return exp - Math.floor(now.getTime() / 1000) <= bufferSeconds
}
