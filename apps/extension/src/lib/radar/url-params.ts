import type { RadarPageParam } from "./matcher"
import { resolveRadarPageParamValue } from "@newsnext/sdk/source/core"

/** URL parameters use the scan URL and never require page script access. */
export function resolveRadarUrlParamValues(
  url: string,
  params: readonly RadarPageParam[],
): Record<string, string> {
  let searchParams: URLSearchParams
  try {
    searchParams = new URL(url).searchParams
  } catch {
    return {}
  }
  return Object.fromEntries(params.flatMap(({ key, query }) => {
    if (query.type === "selected") return []
    const raw = query.type === "query"
      ? searchParams.get(query.key)
      : { start: searchParams.get(query.start), end: searchParams.get(query.end) }
    const value = resolveRadarPageParamValue(query, raw)
    return value === undefined ? [] : [[key, value]]
  }))
}
