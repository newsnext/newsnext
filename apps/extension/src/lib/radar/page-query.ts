import type { HtmlFieldConfig } from "@newsnext/source-kit/types"

export type RadarPageQuery = Omit<HtmlFieldConfig, "template" | "transform">

export function createRadarPageQuery(field: HtmlFieldConfig): RadarPageQuery {
  const { template: _template, transform: _transform, ...query } = field
  return query
}

export function getRadarPageQueryKey(query: RadarPageQuery): string {
  return JSON.stringify([
    query.select ?? "",
    query.scope ?? "",
    query.traverse ?? "",
    query.attr ?? "",
    query.content ?? "",
    query.brSeparator ?? "",
    query.all ?? false,
    query.separator ?? "",
  ])
}
