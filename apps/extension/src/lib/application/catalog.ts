import type { Color } from "@newsnext/shared/types"
import type { BoardLayer, NowLayerSortMode } from "../board"
import type { InstancePatch } from "../source"
import type {
  ApplicationAction,
  ApplicationActionInputMap,
  ApplicationActionName,
  BoardConfiguration,
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
const IDENTIFIER_ARRAY_SCHEMA = {
  type: "array",
  items: IDENTIFIER_SCHEMA,
  uniqueItems: true,
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
const BOARD_CONFIGURATION_PROPERTIES = {
  color: { enum: COLORS },
  defaultLayer: { enum: ["now", "next"] },
  sortMode: { enum: ["addedAt", "provider", "manual"] },
} as const
const BOARD_CONFIGURATION_SCHEMA = objectSchema(BOARD_CONFIGURATION_PROPERTIES, [])

const actionDefinitions: {
  [Name in ApplicationActionName]: ApplicationActionDefinition<Name>
} = {
  "collection.create": {
    name: "collection.create",
    description: "Create a Collection, its Board configuration, and optional configured Instances.",
    inputSchema: objectSchema({
      instances: { type: "array", items: INSTANCE_CREATION_SCHEMA },
      name: IDENTIFIER_SCHEMA,
      board: BOARD_CONFIGURATION_SCHEMA,
    }, ["name"]),
    outputSchema: objectSchema({ collectionId: IDENTIFIER_SCHEMA }, ["collectionId"]),
    parseInput: (value) => {
      const input = requireRecord(value)
      requireOnlyKeys(input, ["board", "instances", "name"])
      return {
        ...(input.board !== undefined ? { board: parseBoardConfiguration(input.board) } : {}),
        ...(input.instances !== undefined ? { instances: parseInstanceCreations(input.instances) } : {}),
        name: requireIdentifier(input.name, "name"),
      }
    },
  },
  "collection.rename": {
    name: "collection.rename",
    description: "Rename a Collection without changing its Board configuration.",
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
    description: "Atomically update Collection data and its Board configuration.",
    inputSchema: objectSchema({
      collectionId: IDENTIFIER_SCHEMA,
      name: IDENTIFIER_SCHEMA,
      board: BOARD_CONFIGURATION_SCHEMA,
    }, ["collectionId"]),
    outputSchema: EMPTY_OBJECT_SCHEMA,
    parseInput: (value) => {
      const input = requireRecord(value)
      requireOnlyKeys(input, ["board", "collectionId", "name"])
      if (input.name === undefined && input.board === undefined) {
        throw new Error("Collection update requires a name or Board configuration")
      }
      return {
        collectionId: requireIdentifier(input.collectionId, "collectionId"),
        ...(input.name !== undefined ? { name: requireIdentifier(input.name, "name") } : {}),
        ...(input.board !== undefined ? { board: parseBoardConfiguration(input.board) } : {}),
      }
    },
  },
  "board.configure": {
    name: "board.configure",
    description: "Configure the Board projection for a Collection.",
    inputSchema: objectSchema({
      collectionId: IDENTIFIER_SCHEMA,
      ...BOARD_CONFIGURATION_PROPERTIES,
    }, ["collectionId"]),
    outputSchema: EMPTY_OBJECT_SCHEMA,
    parseInput: (value) => {
      const input = requireRecord(value)
      requireOnlyKeys(input, ["collectionId", "color", "defaultLayer", "sortMode"])
      const { collectionId, ...configuration } = input
      return {
        collectionId: requireIdentifier(collectionId, "collectionId"),
        ...parseBoardConfiguration(configuration),
      }
    },
  },
  "collection.delete": {
    name: "collection.delete",
    description: "Delete a Collection and either delete exclusively owned Instances or transfer all of its Instances.",
    inputSchema: objectSchema({
      collectionId: IDENTIFIER_SCHEMA,
      deleteInstances: { const: true },
      targetCollectionId: IDENTIFIER_SCHEMA,
    }, ["collectionId"]),
    outputSchema: EMPTY_OBJECT_SCHEMA,
    parseInput: (value) => {
      const input = requireRecord(value)
      requireOnlyKeys(input, ["collectionId", "deleteInstances", "targetCollectionId"])
      if (input.deleteInstances !== undefined && input.deleteInstances !== true) {
        throw new Error("'deleteInstances' must be true when provided")
      }
      if (input.targetCollectionId !== undefined && typeof input.targetCollectionId !== "string") {
        throw new Error("'targetCollectionId' must be a string")
      }
      if (input.deleteInstances === true && input.targetCollectionId !== undefined) {
        throw new Error("Collection deletion cannot delete and transfer Instances together")
      }
      if (input.deleteInstances !== true && input.targetCollectionId === undefined) {
        throw new Error("Collection deletion requires a transfer target")
      }
      const collectionId = requireIdentifier(input.collectionId, "collectionId")
      return input.deleteInstances === true
        ? { collectionId, deleteInstances: true }
        : {
            collectionId,
            targetCollectionId: requireIdentifier(input.targetCollectionId, "targetCollectionId"),
          }
    },
  },
  "nowLayer.setManualOrder": {
    name: "nowLayer.setManualOrder",
    description: "Set the complete manual LiveCard order for a Collection's Now Layer.",
    inputSchema: objectSchema({
      collectionId: IDENTIFIER_SCHEMA,
      instanceIds: IDENTIFIER_ARRAY_SCHEMA,
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
    "Remove an Instance from one Collection while keeping at least one membership.",
  ),
  "instance.create": {
    name: "instance.create",
    description: "Create a configured Instance and add it to one or more Collections.",
    inputSchema: objectSchema({
      collectionIds: { ...IDENTIFIER_ARRAY_SCHEMA, minItems: 1 },
      ...INSTANCE_CREATION_PROPERTIES,
    }, ["collectionIds", "patch", "sourceId"]),
    outputSchema: objectSchema({ instanceId: IDENTIFIER_SCHEMA }, ["instanceId"]),
    parseInput: (value) => {
      const input = requireRecord(value)
      requireOnlyKeys(input, ["collectionIds", "patch", "sourceId"])
      return {
        collectionIds: requireIdentifierArray(input.collectionIds, "collectionIds"),
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
        patch: requireInstancePatch(input.patch),
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
    description: "List configured Instances.",
    inputSchema: EMPTY_OBJECT_SCHEMA,
    outputSchema: { type: "array", items: { type: "object" } },
  },
  "instance.get": {
    name: "instance.get",
    description: "Get one configured Instance.",
    inputSchema: objectSchema({ instanceId: IDENTIFIER_SCHEMA }, ["instanceId"]),
    outputSchema: { type: "object" },
  },
  "board.getContext": {
    name: "board.getContext",
    description: "Get the current human Board and its underlying Collection identity.",
    inputSchema: EMPTY_OBJECT_SCHEMA,
    outputSchema: { type: "object" },
  },
  "board.getConfiguration": {
    name: "board.getConfiguration",
    description: "Get the durable Board configuration for a Collection.",
    inputSchema: objectSchema({ collectionId: IDENTIFIER_SCHEMA }, ["collectionId"]),
    outputSchema: { type: "object" },
  },
  "nowLayer.getLiveCards": {
    name: "nowLayer.getLiveCards",
    description: "List the LiveCards in the current Board's Now Layer.",
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
    case "board.getContext":
      requireEmptyInput(query.input)
      return { type: "board.getContext" }
    case "board.getConfiguration": {
      const input = requireRecord(query.input)
      requireOnlyKeys(input, ["collectionId"])
      return {
        type: "board.getConfiguration",
        input: { collectionId: requireIdentifier(input.collectionId, "collectionId") },
      }
    }
    case "nowLayer.getLiveCards":
      requireEmptyInput(query.input)
      return { type: "nowLayer.getLiveCards" }
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

function requireIdentifierArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) throw new Error(`'${field}' must be an array`)
  const identifiers = value.map(item => requireIdentifier(item, field))
  if (new Set(identifiers).size !== identifiers.length) {
    throw new Error(`'${field}' must contain unique values`)
  }
  return identifiers
}

function requireColor(value: unknown): Color {
  if (typeof value !== "string" || !COLORS.includes(value as Color)) {
    throw new Error("'color' must be a supported theme color")
  }
  return value as Color
}

function requireSortMode(value: unknown): NowLayerSortMode {
  if (value !== "addedAt" && value !== "provider" && value !== "manual") {
    throw new Error("'sortMode' must be addedAt, provider, or manual")
  }
  return value
}

function requireBoardLayer(value: unknown): BoardLayer {
  if (value !== "now" && value !== "next") {
    throw new Error("'defaultLayer' must be now or next")
  }
  return value
}

function parseBoardConfiguration(value: unknown): BoardConfiguration {
  const configuration = requireRecord(value)
  requireOnlyKeys(configuration, ["color", "defaultLayer", "sortMode"])
  return {
    ...(configuration.color !== undefined ? { color: requireColor(configuration.color) } : {}),
    ...(configuration.defaultLayer !== undefined
      ? { defaultLayer: requireBoardLayer(configuration.defaultLayer) }
      : {}),
    ...(configuration.sortMode !== undefined
      ? { sortMode: requireSortMode(configuration.sortMode) }
      : {}),
  }
}

function requireInstancePatch(value: unknown): InstancePatch {
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
    patch: requireInstancePatch(input.patch),
    sourceId: requireIdentifier(input.sourceId, "sourceId"),
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function isApplicationActionName(value: string): value is ApplicationActionName {
  return value in actionDefinitions
}
