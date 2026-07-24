export function matchesCapabilityHost(hostname: string, declaredHost: string): boolean {
  const normalizedHostname = hostname.toLowerCase()
  const normalizedDeclaredHost = declaredHost.trim().toLowerCase()

  if (normalizedDeclaredHost === "*") {
    return true
  }

  if (normalizedDeclaredHost.startsWith("*.")) {
    const parentHost = normalizedDeclaredHost.slice(2)
    return normalizedHostname === parentHost || normalizedHostname.endsWith(`.${parentHost}`)
  }

  return normalizedHostname === normalizedDeclaredHost
}

export function assertNetworkCapability(
  sourceKey: string,
  url: string,
  declaredHosts: readonly string[],
): void {
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    throw new Error(`Source "${sourceKey}" has an invalid network URL: ${url}`)
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error(`Source "${sourceKey}" cannot request unsupported protocol "${parsedUrl.protocol}"`)
  }

  if (declaredHosts.some(host => matchesCapabilityHost(parsedUrl.hostname, host))) {
    return
  }

  throw new Error(
    `Source "${sourceKey}" attempted to access undeclared host "${parsedUrl.hostname}"`,
  )
}
