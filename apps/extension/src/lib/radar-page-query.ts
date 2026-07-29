import type { HtmlFieldConfig } from "@newsnext/source/types"

export type RadarPageQuery = Omit<HtmlFieldConfig, "template">

export function createRadarPageQuery(field: HtmlFieldConfig): RadarPageQuery {
  const { template: _template, ...query } = field
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
