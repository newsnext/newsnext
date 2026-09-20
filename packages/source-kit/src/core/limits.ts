// Registry security/size limits: 2MB file, ≤1000 sources, id ≤200 chars,
// ≤10 request rules/source. Radar selectors bounded (500/100).
export const SOURCE_REGISTRY_LIMITS = {
  maxBytes: 2 * 1024 * 1024,
  maxSources: 1000,
  maxSourceIdLength: 200,
  maxRequestRulesPerSource: 10,
  maxRequestDomainsPerRule: 20,
  maxRequestHeadersPerRule: 5,
  maxRadarFieldSelectorLength: 500,
  maxRadarFieldAttributeLength: 100,
} as const
