import type { Color } from "@newsnext/shared/types"
import type { BoardSortMode, BoardViewMode } from "../board"
import type { SourceInstancePatch } from "../source"
import type {
  ApplicationAction,
  ApplicationActionInputMap,
  ApplicationActionName,
  CollectionViewConfiguration,
} from "./actions"
import type { ApplicationQuery } from "./queries"
import { COLORS } from "@newsnext/shared/constants"

export type ApplicationQueryName = ApplicationQuery["type"]
export type ApplicationSchema = Readonly<Record<string, unknown>>

export interface ApplicationOperationDescriptor<Name extends string> {
  description: string
  inputSchema: ApplicationSchema
  name: Name
  outputSchema: ApplicationSchema
}

interface ApplicationActionDefinition<Name extends ApplicationActionName>
  extends ApplicationOperationDescriptor<Name> {
  parseInput: (value: unknown) => ApplicationActionInputMap[Name]
}

const EMPTY_OBJECT_SCHEMA = {
  type: "object",
  additionalProperties: false,
} as const

const IDENTIFIER_SCHEMA = { type: "string", minLength: 1 } as const
const NULLABLE_IDENTIFIER_SCHEMA = {
  anyOf: [IDENTIFIER_SCHEMA, { type: "null" }],
} as const
const PATCH_SCHEMA = {
  type: "object",
  properties: {
    metadata: { type: "object" },
    params: { type: "object" },
  },
  additionalProperties: false,
} as const
const INSTANCE_CREATION_PROPERTIES = {
  patch: PATCH_SCHEMA,
  sourceId: IDENTIFIER_SCHEMA,
} as const
const INSTANCE_CREATION_SCHEMA = objectSchema(
  INSTANCE_CREATION_PROPERTIES,
  ["patch", "sourceId"],
)
const COLLECTION_VIEW_PROPERTIES = {
  color: { enum: COLORS },
  defaultView: { enum: ["now", "next"] },
  sortMode: { enum: ["createdAt", "provider", "manual"] },
} as const
const COLLECTION_VIEW_CONFIGURATION_SCHEMA = objectSchema(COLLECTION_VIEW_PROPERTIES, [])

const actionDefinitions: {
  [Name in ApplicationActionName]: ApplicationActionDefinition<Name>
} = {
  "collection.create": {
    name: "collection.create",
    description: "Create a Collection, its Board preferences, and optional configured Instances.",
    inputSchema: objectSchema({
      instances: { type: "array", items: INSTANCE_CREATION_SCHEMA },
      name: IDENTIFIER_SCHEMA,
      view: COLLECTION_VIEW_CONFIGURATION_SCHEMA,
    }, ["name"]),
    outputSchema: objectSchema({ collectionId: IDENTIFIER_SCHEMA }, ["collectionId"]),
    parseInput: (value) => {
      const input = requireRecord(value)
      requireOnlyKeys(input, ["instances", "name", "view"])
      return {
        ...(input.instances !== undefined ? { instances: parseInstanceCreations(input.instances) } : {}),
        name: requireIdentifier(input.name, "name"),
        ...(input.view !== undefined ? { view: parseCollectionViewConfiguration(input.view) } : {}),
      }
    },
  },
  "collection.rename": {
    name: "collection.rename",
    description: "Rename a Collection without changing its View preferences.",
    inputSchema: objectSchema({
      collectionId: IDENTIFIER_SCHEMA,
      name: IDENTIFIER_SCHEMA,
    }, ["collectionId", "name"]),
    outputSchema: EMPTY_OBJECT_SCHEMA,
    parseInput: (value) => {
      const input = requireRecord(value)
      requireOnlyKeys(input, ["collectionId", "name"])
      return {
        collectionId: requireIdentifier(input.collectionId, "collectionId"),
        name: requireIdentifier(input.name, "name"),
      }
    },
  },
  "collection.update": {
    name: "collection.update",
    description: "Atomically update Collection data and its human Board preferences.",
    inputSchema: objectSchema({
      collectionId: IDENTIFIER_SCHEMA,
      name: IDENTIFIER_SCHEMA,
      view: COLLECTION_VIEW_CONFIGURATION_SCHEMA,
    }, ["collectionId"]),
    outputSchema: EMPTY_OBJECT_SCHEMA,
    parseInput: (value) => {
      const input = requireRecord(value)
      requireOnlyKeys(input, ["collectionId", "name", "view"])
      if (input.name === undefined && input.view === undefined) {
        throw new Error("Collection update requires a name or View configuration")
      }
      return {
        collectionId: requireIdentifier(input.collectionId, "collectionId"),
        ...(input.name !== undefined ? { name: requireIdentifier(input.name, "name") } : {}),
        ...(input.view !== undefined ? { view: parseCollectionViewConfiguration(input.view) } : {}),
      }
    },
  },
  "view.configureCollection": {
    name: "view.configureCollection",
    description: "Configure the human Board projection for a Collection.",
    inputSchema: objectSchema({
      collectionId: IDENTIFIER_SCHEMA,
      ...COLLECTION_VIEW_PROPERTIES,
    }, ["collectionId"]),
    outputSchema: EMPTY_OBJECT_SCHEMA,
    parseInput: (value) => {
      const input = requireRecord(value)
      requireOnlyKeys(input, ["collectionId", "color", "defaultView", "sortMode"])
      const { collectionId, ...configuration } = input
      return {
        collectionId: requireIdentifier(collectionId, "collectionId"),
        ...parseCollectionViewConfiguration(configuration),
      }
    },
  },
  "collection.delete": {
    name: "collection.delete",
    description: "Delete a Collection, optionally deleting Instances not used by other Collections.",
    inputSchema: objectSchema({
      collectionId: IDENTIFIER_SCHEMA,
      deleteInstances: { type: "boolean" },
    }, ["collectionId"]),
    outputSchema: EMPTY_OBJECT_SCHEMA,
    parseInput: (value) => {
      const input = requireRecord(value)
      requireOnlyKeys(input, ["collectionId", "deleteInstances"])
      if (input.deleteInstances !== undefined && typeof input.deleteInstances !== "boolean") {
        throw new Error("'deleteInstances' must be a boolean")
      }
      return {
        collectionId: requireIdentifier(input.collectionId, "collectionId"),
        ...(input.deleteInstances !== undefined
          ? { deleteInstances: input.deleteInstances }
          : {}),
      }
    },
  },
  "collection.reorderInstances": {
    name: "collection.reorderInstances",
    description: "Set the complete manual Instance order for a Collection.",
    inputSchema: objectSchema({
      collectionId: IDENTIFIER_SCHEMA,
      instanceIds: { type: "array", items: IDENTIFIER_SCHEMA, uniqueItems: true },
    }, ["collectionId", "instanceIds"]),
    outputSchema: EMPTY_OBJECT_SCHEMA,
    parseInput: (value) => {
      const input = requireRecord(value)
      requireOnlyKeys(input, ["collectionId", "instanceIds"])
      return {
        collectionId: requireIdentifier(input.collectionId, "collectionId"),
        instanceIds: requireIdentifierArray(input.instanceIds, "instanceIds"),
      }
    },
  },
  "collection.addInstance": collectionMembershipAction(
    "collection.addInstance",
    "Add an existing Instance to a Collection.",
  ),
  "collection.removeInstance": collectionMembershipAction(
    "collection.removeInstance",
    "Remove an Instance from one Collection without deleting it.",
  ),
  "instance.create": {
    name: "instance.create",
    description: "Create a configured Source Instance and optionally add it to a Collection.",
    inputSchema: objectSchema({
      collectionId: NULLABLE_IDENTIFIER_SCHEMA,
      ...INSTANCE_CREATION_PROPERTIES,
    }, ["collectionId", "patch", "sourceId"]),
    outputSchema: objectSchema({ instanceId: IDENTIFIER_SCHEMA }, ["instanceId"]),
    parseInput: (value) => {
      const input = requireRecord(value)
      requireOnlyKeys(input, ["collectionId", "patch", "sourceId"])
      return {
        collectionId: requireNullableIdentifier(input.collectionId, "collectionId"),
        ...parseInstanceCreationFields(input),
      }
    },
  },
  "instance.configure": {
    name: "instance.configure",
    description: "Merge configuration and presentation overrides into an Instance.",
    inputSchema: objectSchema({
      instanceId: IDENTIFIER_SCHEMA,
      patch: PATCH_SCHEMA,
    }, ["instanceId", "patch"]),
    outputSchema: EMPTY_OBJECT_SCHEMA,
    parseInput: (value) => {
      const input = requireRecord(value)
      requireOnlyKeys(input, ["instanceId", "patch"])
      return {
        instanceId: requireIdentifier(input.instanceId, "instanceId"),
        patch: requireSourceInstancePatch(input.patch),
      }
    },
  },
  "instance.resetParams": simpleIdAction(
    "instance.resetParams",
    "Reset an Instance's parameters while preserving presentation overrides.",
    "instanceId",
  ),
  "instance.delete": simpleIdAction(
    "instance.delete",
    "Delete an Instance and all of its Collection memberships.",
    "instanceId",
  ),
}

const queryDescriptors: Record<ApplicationQueryName, ApplicationOperationDescriptor<ApplicationQueryName>> = {
  "source.list": {
    name: "source.list",
    description: "List Sources available for creating or resolving Instances.",
    inputSchema: EMPTY_OBJECT_SCHEMA,
    outputSchema: { type: "array", items: { type: "object" } },
  },
  "source.get": {
    name: "source.get",
    description: "Get one available Source descriptor.",
    inputSchema: objectSchema({ sourceId: IDENTIFIER_SCHEMA }, ["sourceId"]),
    outputSchema: { type: "object" },
  },
  "collection.list": {
    name: "collection.list",
    description: "List Collections.",
    inputSchema: EMPTY_OBJECT_SCHEMA,
    outputSchema: { type: "array", items: { type: "object" } },
  },
  "collection.get": {
    name: "collection.get",
    description: "Get a Collection with ordered entries and resolved Instances.",
    inputSchema: objectSchema({ collectionId: IDENTIFIER_SCHEMA }, ["collectionId"]),
    outputSchema: { type: "object" },
  },
  "collection.listInstances": {
    name: "collection.listInstances",
    description: "List the Instances in a Collection in membership order.",
    inputSchema: objectSchema({ collectionId: IDENTIFIER_SCHEMA }, ["collectionId"]),
    outputSchema: { type: "array", items: { type: "object" } },
  },
  "instance.list": {
    name: "instance.list",
    description: "List configured Source Instances.",
    inputSchema: EMPTY_OBJECT_SCHEMA,
    outputSchema: { type: "array", items: { type: "object" } },
  },
  "instance.get": {
    name: "instance.get",
    description: "Get one configured Source Instance.",
    inputSchema: objectSchema({ instanceId: IDENTIFIER_SCHEMA }, ["instanceId"]),
    outputSchema: { type: "object" },
  },
  "view.getContext": {
    name: "view.getContext",
    description: "Get the current human Board and its underlying Collection identity.",
    inputSchema: EMPTY_OBJECT_SCHEMA,
    outputSchema: { type: "object" },
  },
  "view.getCollection": {
    name: "view.getCollection",
    description: "Get the durable Board preferences for a Collection.",
    inputSchema: objectSchema({ collectionId: IDENTIFIER_SCHEMA }, ["collectionId"]),
    outputSchema: { type: "object" },
  },
  "view.getVisibleCards": {
    name: "view.getVisibleCards",
    description: "List the Cards logically displayed by the current Board.",
    inputSchema: EMPTY_OBJECT_SCHEMA,
    outputSchema: { type: "array", items: { type: "object" } },
  },
}

export function listApplicationActions(): Array<ApplicationOperationDescriptor<ApplicationActionName>> {
  return Object.values(actionDefinitions).map(toPublicDescriptor)
}

export function listApplicationQueries(): Array<ApplicationOperationDescriptor<ApplicationQueryName>> {
  return Object.values(queryDescriptors)
}

export function parseApplicationAction(value: unknown): ApplicationAction {
  const action = requireRecord(value)
  if (typeof action.type !== "string" || !isApplicationActionName(action.type)) {
    throw new Error("Unknown application Action")
  }
  const definition = actionDefinitions[action.type]
  return {
    type: definition.name,
    input: definition.parseInput(action.input),
  } as ApplicationAction
}

export function parseApplicationQuery(value: unknown): ApplicationQuery {
  const query = requireRecord(value)
  if (typeof query.type !== "string" || !(query.type in queryDescriptors)) {
    throw new Error("Unknown application Query")
  }
  const queryType = query.type as ApplicationQueryName
  switch (queryType) {
    case "source.list":
      requireEmptyInput(query.input)
      return { type: "source.list" }
    case "source.get": {
      const input = requireRecord(query.input)
      requireOnlyKeys(input, ["sourceId"])
      return {
        type: "source.get",
        input: { sourceId: requireIdentifier(input.sourceId, "sourceId") },
      }
    }
    case "collection.list":
      requireEmptyInput(query.input)
      return { type: "collection.list" }
    case "collection.get": {
      const input = requireRecord(query.input)
      requireOnlyKeys(input, ["collectionId"])
      return {
        type: "collection.get",
        input: { collectionId: requireIdentifier(input.collectionId, "collectionId") },
      }
    }
    case "collection.listInstances": {
      const input = requireRecord(query.input)
      requireOnlyKeys(input, ["collectionId"])
      return {
        type: "collection.listInstances",
        input: { collectionId: requireIdentifier(input.collectionId, "collectionId") },
      }
    }
    case "instance.list":
      requireEmptyInput(query.input)
      return { type: "instance.list" }
    case "instance.get": {
      const input = requireRecord(query.input)
      requireOnlyKeys(input, ["instanceId"])
      return {
        type: "instance.get",
        input: { instanceId: requireIdentifier(input.instanceId, "instanceId") },
      }
    }
    case "view.getContext":
      requireEmptyInput(query.input)
      return { type: "view.getContext" }
    case "view.getCollection": {
      const input = requireRecord(query.input)
      requireOnlyKeys(input, ["collectionId"])
      return {
        type: "view.getCollection",
        input: { collectionId: requireIdentifier(input.collectionId, "collectionId") },
      }
    }
    case "view.getVisibleCards":
      requireEmptyInput(query.input)
      return { type: "view.getVisibleCards" }
  }
}

function simpleIdAction<
  Name extends "instance.resetParams" | "instance.delete",
  Key extends keyof ApplicationActionInputMap[Name] & string,
>(
  name: Name,
  description: string,
  key: Key,
): ApplicationActionDefinition<Name> {
  return {
    name,
    description,
    inputSchema: objectSchema({ [key]: IDENTIFIER_SCHEMA }, [key]),
    outputSchema: EMPTY_OBJECT_SCHEMA,
    parseInput: (value) => {
      const input = requireRecord(value)
      requireOnlyKeys(input, [key])
      return {
        [key]: requireIdentifier(input[key], key),
      } as unknown as ApplicationActionInputMap[Name]
    },
  }
}

function collectionMembershipAction<
  Name extends "collection.addInstance" | "collection.removeInstance",
>(name: Name, description: string): ApplicationActionDefinition<Name> {
  return {
    name,
    description,
    inputSchema: objectSchema({
      collectionId: IDENTIFIER_SCHEMA,
      instanceId: IDENTIFIER_SCHEMA,
    }, ["collectionId", "instanceId"]),
    outputSchema: EMPTY_OBJECT_SCHEMA,
    parseInput: (value) => {
      const input = requireRecord(value)
      requireOnlyKeys(input, ["collectionId", "instanceId"])
      return {
        collectionId: requireIdentifier(input.collectionId, "collectionId"),
        instanceId: requireIdentifier(input.instanceId, "instanceId"),
      }
    },
  }
}

function objectSchema(
  properties: Record<string, ApplicationSchema>,
  required: string[],
): ApplicationSchema {
  return { type: "object", properties, required, additionalProperties: false }
}

function toPublicDescriptor<Name extends ApplicationActionName>(
  definition: ApplicationActionDefinition<Name>,
): ApplicationOperationDescriptor<Name> {
  return {
    name: definition.name,
    description: definition.description,
    inputSchema: definition.inputSchema,
    outputSchema: definition.outputSchema,
  }
}

function requireRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Application operation input must be an object")
  }
  return value as Record<string, unknown>
}

function requireEmptyInput(value: unknown): void {
  if (value === undefined) return
  const input = requireRecord(value)
  if (Object.keys(input).length > 0) {
    throw new Error("This application Query does not accept input")
  }
}

function requireOnlyKeys(value: Record<string, unknown>, allowedKeys: string[]): void {
  const allowed = new Set(allowedKeys)
  const unsupported = Object.keys(value).find(key => !allowed.has(key))
  if (unsupported) throw new Error(`Unsupported input field '${unsupported}'`)
}

function requireIdentifier(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`'${field}' must be a non-empty string`)
  }
  return value
}

function requireNullableIdentifier(value: unknown, field: string): string | null {
  return value === null ? null : requireIdentifier(value, field)
}

function requireIdentifierArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) throw new Error(`'${field}' must be an array`)
  return value.map(item => requireIdentifier(item, field))
}

function requireColor(value: unknown): Color {
  if (typeof value !== "string" || !COLORS.includes(value as Color)) {
    throw new Error("'color' must be a supported theme color")
  }
  return value as Color
}

function requireSortMode(value: unknown): BoardSortMode {
  if (value !== "createdAt" && value !== "provider" && value !== "manual") {
    throw new Error("'sortMode' must be createdAt, provider, or manual")
  }
  return value
}

function requireBoardViewMode(value: unknown): BoardViewMode {
  if (value !== "now" && value !== "next") {
    throw new Error("'defaultView' must be now or next")
  }
  return value
}

function parseCollectionViewConfiguration(value: unknown): CollectionViewConfiguration {
  const configuration = requireRecord(value)
  requireOnlyKeys(configuration, ["color", "defaultView", "sortMode"])
  return {
    ...(configuration.color !== undefined ? { color: requireColor(configuration.color) } : {}),
    ...(configuration.defaultView !== undefined
      ? { defaultView: requireBoardViewMode(configuration.defaultView) }
      : {}),
    ...(configuration.sortMode !== undefined
      ? { sortMode: requireSortMode(configuration.sortMode) }
      : {}),
  }
}

function requireSourceInstancePatch(value: unknown): SourceInstancePatch {
  const patch = requireRecord(value)
  requireOnlyKeys(patch, ["metadata", "params"])
  if ((patch.params !== undefined && !isRecord(patch.params))
    || (patch.metadata !== undefined && !isRecord(patch.metadata))) {
    throw new Error("'patch' may only contain params and metadata objects")
  }
  return {
    ...(patch.params !== undefined ? { params: patch.params } : {}),
    ...(patch.metadata !== undefined ? { metadata: patch.metadata } : {}),
  }
}

function parseInstanceCreations(
  value: unknown,
): NonNullable<ApplicationActionInputMap["collection.create"]["instances"]> {
  if (!Array.isArray(value)) throw new Error("'instances' must be an array")
  return value.map((candidate) => {
    const input = requireRecord(candidate)
    requireOnlyKeys(input, ["patch", "sourceId"])
    return parseInstanceCreationFields(input)
  })
}

function parseInstanceCreationFields(input: Record<string, unknown>) {
  return {
    patch: requireSourceInstancePatch(input.patch),
    sourceId: requireIdentifier(input.sourceId, "sourceId"),
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function isApplicationActionName(value: string): value is ApplicationActionName {
  return value in actionDefinitions
}
