export type SourceTemplateSlot
  = | "field"
    | "annotation"
    | "jsonField"
    | "radarMetadata"
    | "radarParams"
    | "request"

export const sourceTemplatePaths = {
  field: [
    "scope.index",
    "scope.item",
    "scope.params",
    "scope.request.url",
    "scope.value",
    "source.vars",
  ],
  annotation: [
    "scope.item",
  ],
  jsonField: [
    "scope.index",
    "scope.item",
    "scope.params",
    "scope.request.url",
    "scope.response.json",
    "scope.value",
    "source.vars",
  ],
  radarMetadata: [
    "scope.params",
    "scope.page",
    "scope.path",
    "scope.query",
    "source.vars",
  ],
  radarParams: [
    "scope.path",
    "scope.query",
    "source.vars",
  ],
  request: ["scope.params", "source.vars"],
} as const satisfies Record<SourceTemplateSlot, readonly string[]>
