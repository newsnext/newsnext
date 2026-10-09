import Type from "typebox"

const nonBlank = () => Type.String({ pattern: "\\S" })
const identifier = () => Type.String({ pattern: "^[A-Za-z0-9_-]+$" })
const strictObject = <T extends Parameters<typeof Type.Object>[0]>(properties: T) => (
  Type.Object(properties, { additionalProperties: false })
)

const colors = [
  "red",
  "pink",
  "fuchsia",
  "purple",
  "indigo",
  "blue",
  "cyan",
  "teal",
  "green",
  "amber",
  "orange",
  "slate",
] as const

export const pluginManifestDefinition = strictObject({ name: nonBlank() })

export const actionManifestDefinition = strictObject({
  description: nonBlank(),
  inputSchema: Type.Object({}, { additionalProperties: true }),
  outputSchema: Type.Object({}, { additionalProperties: true }),
})

const paramBase = {
  title: nonBlank(),
  description: Type.Optional(Type.String()),
  icon: Type.Optional(Type.String()),
  required: Type.Optional(Type.Boolean()),
  validate: Type.Optional(Type.Union([
    strictObject({ format: Type.Literal("digits") }),
    strictObject({ regex: Type.String() }),
  ])),
}
const selectOption = strictObject({ label: Type.String(), value: Type.String() })
const selectValues = () => Type.Array(selectOption, { minItems: 1 })

export const paramsDefinition = Type.Record(identifier(), Type.Union([
  strictObject({ ...paramBase, type: Type.Literal("text"), default: Type.String() }),
  strictObject({ ...paramBase, type: Type.Literal("url"), default: Type.String() }),
  strictObject({
    ...paramBase,
    type: Type.Literal("number"),
    default: Type.Number(),
    min: Type.Optional(Type.Number()),
    max: Type.Optional(Type.Number()),
  }),
  strictObject({ ...paramBase, type: Type.Literal("switch"), default: Type.Boolean() }),
  strictObject({
    ...paramBase,
    type: Type.Literal("select"),
    default: Type.String(),
    values: selectValues(),
  }),
  strictObject({
    ...paramBase,
    type: Type.Literal("multiselect"),
    default: Type.Array(Type.String()),
    values: selectValues(),
  }),
]), { additionalProperties: false })

const insightQuery = Type.Union([
  strictObject({ type: Type.Literal("file"), path: Type.String({ minLength: 1 }) }),
  strictObject({
    type: Type.Literal("latest"),
    keyword: Type.Optional(nonBlank()),
    deduplicateBy: Type.Optional(nonBlank()),
    direction: Type.Optional(Type.Union([Type.Literal("asc"), Type.Literal("desc")])),
    limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 500 })),
    orderBy: Type.Optional(Type.Literal("publishedAt")),
    window: Type.Optional(Type.String()),
  }),
  strictObject({
    type: Type.Literal("search"),
    keyword: nonBlank(),
    boardIds: Type.Optional(Type.Array(nonBlank())),
    cardIds: Type.Optional(Type.Array(nonBlank())),
    deduplicateBy: Type.Optional(nonBlank()),
    direction: Type.Optional(Type.Union([Type.Literal("asc"), Type.Literal("desc")])),
    from: Type.Optional(Type.Integer({ minimum: 0 })),
    to: Type.Optional(Type.Integer({ minimum: 0 })),
    limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 500 })),
    searchIn: Type.Optional(Type.Union([Type.Literal("title"), Type.Literal("fullText")])),
    window: Type.Optional(Type.String()),
  }),
])

const insightView = Type.Union([
  strictObject({
    preset: Type.Literal("live-card"),
    query: identifier(),
    presentation: Type.Optional(Type.Union([Type.Literal("ranking"), Type.Literal("list")])),
  }),
  strictObject({
    preset: Type.Literal("word-cloud"),
    query: identifier(),
    label: Type.Optional(Type.String({ minLength: 1, maxLength: 100, pattern: "\\S" })),
    value: Type.Optional(Type.String({ minLength: 1, maxLength: 100, pattern: "\\S" })),
    limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 500 })),
    sort: Type.Optional(Type.Union([
      Type.Literal("none"),
      Type.Literal("asc"),
      Type.Literal("desc"),
    ])),
  }),
])

export const insightManifestDefinition = strictObject({
  title: Type.Optional(Type.String()),
  color: Type.Optional(Type.Union(colors.map(color => Type.Literal(color)))),
  width: Type.Optional(Type.Integer({ minimum: 2, maximum: 12 })),
  height: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
  params: Type.Optional(paramsDefinition),
  refresh: Type.Optional(strictObject({
    intervalMs: Type.Optional(Type.Integer({ minimum: 60_000 })),
    staleTimeMs: Type.Optional(Type.Integer({ minimum: 30_000 })),
  })),
  data: Type.Optional(strictObject({
    queries: Type.Optional(Type.Record(identifier(), insightQuery, { additionalProperties: false })),
  })),
  view: Type.Optional(insightView),
})

const sourceMetadata = strictObject({
  title: Type.Optional(Type.String()),
  badge: Type.Optional(Type.String()),
  desc: Type.Optional(Type.String()),
  home: Type.Optional(Type.String()),
  type: Type.Optional(Type.Union([Type.Literal("list"), Type.Literal("ranking")])),
})
const stringArray = () => Type.Array(Type.String())
const sourceLoader = strictObject({
  type: Type.Optional(Type.Union([
    Type.Literal("external"),
    Type.Literal("html"),
    Type.Literal("json"),
    Type.Literal("rss"),
  ])),
  url: Type.Optional(Type.String()),
  inlineTemplate: Type.Optional(Type.String()),
  items: Type.Optional(Type.String()),
  fields: Type.Optional(Type.Object({}, { additionalProperties: true })),
  metadata: Type.Optional(Type.Object({}, { additionalProperties: true })),
  sortByTimestamp: Type.Optional(Type.Boolean()),
  decoding: Type.Optional(Type.String()),
  embeddedJson: Type.Optional(strictObject({
    select: nonBlank(),
    attr: Type.Optional(nonBlank()),
  })),
  fetchOptions: Type.Optional(Type.Object({}, { additionalProperties: true })),
})
const radarMatch = strictObject({
  hosts: Type.Array(Type.String(), { minItems: 1 }),
  location: Type.Optional(Type.Union([Type.Literal("url"), Type.Literal("hash")])),
  paths: Type.Optional(Type.Union([
    stringArray(),
    strictObject({ include: Type.Optional(stringArray()), exclude: Type.Optional(stringArray()) }),
  ])),
  query: Type.Optional(stringArray()),
})
const radarRule = strictObject({
  id: nonBlank(),
  priority: Type.Optional(Type.Number()),
  match: radarMatch,
  patch: Type.Optional(strictObject({
    params: Type.Optional(Type.Object({}, { additionalProperties: true })),
    metadata: Type.Optional(Type.Object({}, { additionalProperties: true })),
  })),
})
const sourceConfig = strictObject({
  metadata: Type.Optional(sourceMetadata),
  params: Type.Optional(paramsDefinition),
  loader: Type.Optional(sourceLoader),
  capabilities: Type.Optional(strictObject({
    network: Type.Optional(stringArray()),
    cookies: Type.Optional(stringArray()),
  })),
  radar: Type.Optional(Type.Array(radarRule)),
  requestRules: Type.Optional(Type.Array(Type.Object({}, { additionalProperties: true }))),
  secrets: Type.Optional(Type.Array(Type.Object({}, { additionalProperties: true }))),
  version: Type.Optional(Type.Integer({ minimum: 1 })),
  baseUrl: Type.Optional(Type.String()),
  vars: Type.Optional(Type.Object({}, { additionalProperties: true })),
})
const sourceManifestBase = strictObject({
  title: nonBlank(),
  color: Type.Union(colors.map(color => Type.Literal(color))),
  category: Type.Optional(Type.Union([
    Type.Literal("social"),
    Type.Literal("forum"),
    Type.Literal("news"),
    Type.Literal("finance"),
    Type.Literal("developer"),
    Type.Literal("entertainment"),
  ])),
  icon: Type.Optional(Type.String()),
  defaults: Type.Optional(sourceConfig),
  sources: Type.Record(Type.String({ pattern: "^[^:\\s]+$" }), sourceConfig, {
    additionalProperties: false,
    minProperties: 1,
  }),
})

// JSON Schema expresses whether individual Sources must provide a loader type
// when the provider defaults do not provide one.
export const sourceManifestDefinition = Type.Unsafe({
  ...sourceManifestBase,
  if: {
    properties: {
      defaults: {
        type: "object",
        properties: { loader: { type: "object", required: ["type"] } },
        required: ["loader"],
      },
    },
    required: ["defaults"],
  },
  else: {
    properties: {
      sources: {
        type: "object",
        additionalProperties: {
          type: "object",
          required: ["loader"],
          properties: { loader: { type: "object", required: ["type"] } },
        },
      },
    },
  },
})

const jsonSchemaDraft = "https://json-schema.org/draft/2020-12/schema"
const generatedSchemaComment = "Generated from @newsnext/sdk TypeBox definitions; do not edit directly."
const portableJsonSchema = <TSchema extends object>(schema: TSchema) => ({
  $schema: jsonSchemaDraft,
  $comment: generatedSchemaComment,
  ...schema,
})

export const portableJsonSchemas = {
  action: portableJsonSchema(actionManifestDefinition),
  params: portableJsonSchema(paramsDefinition),
  plugin: portableJsonSchema(pluginManifestDefinition),
  source: portableJsonSchema(sourceManifestDefinition),
  insight: portableJsonSchema(insightManifestDefinition),
}
