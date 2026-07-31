import { SOURCE_REGISTRY_LIMITS } from "./limits"

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
  sourceId: string,
  url: string,
  declaredHosts: readonly string[],
): void {
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    throw new Error(`Source "${sourceId}" has an invalid network URL: ${url}`)
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error(`Source "${sourceId}" cannot request unsupported protocol "${parsedUrl.protocol}"`)
  }

  if (declaredHosts.some(host => matchesCapabilityHost(parsedUrl.hostname, host))) {
    return
  }

  throw new Error(
    `Source "${sourceId}" attempted to access undeclared host "${parsedUrl.hostname}"`,
  )
}

export function validateSourceRequestRules(
  sourceId: string,
  requestRules: unknown,
  declaredHosts: readonly string[],
): void {
  const requestDomainPattern = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i
  const requestRuleActionTypes = new Set([
    "allow",
    "allowAllRequests",
    "block",
    "modifyHeaders",
    "redirect",
    "upgradeScheme",
  ])
  const requestHeaderOperations = new Set(["append", "remove", "set"])

  if (requestRules === undefined) {
    return
  }
  if (!Array.isArray(requestRules) || requestRules.length > SOURCE_REGISTRY_LIMITS.maxRequestRulesPerSource) {
    throw new Error(`Source "${sourceId}" has invalid request rules`)
  }

  requestRules.forEach((rule, ruleIndex) => {
    if (!isRecord(rule)) {
      throw new Error(`Source "${sourceId}" request rule ${ruleIndex} must be an object`)
    }

    const { action, condition, priority } = rule
    if (!isRecord(action) || !requestRuleActionTypes.has(String(action.type))) {
      throw new Error(`Source "${sourceId}" request rule ${ruleIndex} has an invalid action`)
    }
    if (!isRecord(condition)) {
      throw new Error(`Source "${sourceId}" request rule ${ruleIndex} has an invalid condition`)
    }
    if (
      priority !== undefined
      && (!Number.isInteger(priority) || typeof priority !== "number" || priority < 1)
    ) {
      throw new Error(`Source "${sourceId}" request rule ${ruleIndex} has an invalid priority`)
    }

    const { requestDomains } = condition
    if (
      !Array.isArray(requestDomains)
      || requestDomains.length === 0
      || requestDomains.length > SOURCE_REGISTRY_LIMITS.maxRequestDomainsPerRule
    ) {
      throw new Error(`Source "${sourceId}" request rule ${ruleIndex} has invalid request domains`)
    }
    for (const domain of requestDomains) {
      if (
        typeof domain !== "string"
        || !requestDomainPattern.test(domain)
        || !declaredHosts.some(host => matchesCapabilityHost(domain, host))
      ) {
        throw new Error(
          `Source "${sourceId}" request rule ${ruleIndex} uses undeclared domain "${String(domain)}"`,
        )
      }
    }

    if (action.type === "modifyHeaders") {
      const requestHeaders = action.requestHeaders
      const responseHeaders = action.responseHeaders
      const headerModifications = [
        ...(Array.isArray(requestHeaders) ? requestHeaders : []),
        ...(Array.isArray(responseHeaders) ? responseHeaders : []),
      ]
      if (
        headerModifications.length === 0
        || headerModifications.length > SOURCE_REGISTRY_LIMITS.maxRequestHeadersPerRule
      ) {
        throw new Error(`Source "${sourceId}" request rule ${ruleIndex} has invalid header modifications`)
      }
      headerModifications.forEach((header, headerIndex) => {
        if (
          !isRecord(header)
          || typeof header.header !== "string"
          || header.header.length === 0
          || !requestHeaderOperations.has(String(header.operation))
          || (
            header.operation !== "remove"
            && (
              typeof header.value !== "string"
              || header.value.length > 2048
              || /[\r\n]/.test(header.value)
            )
          )
        ) {
          throw new Error(
            `Source "${sourceId}" request rule ${ruleIndex} header ${headerIndex} is invalid`,
          )
        }
      })
    }
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
