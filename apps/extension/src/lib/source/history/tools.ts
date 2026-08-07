import type { AgentTool, AgentToolResult } from "@earendil-works/pi-agent-core"
import { Type } from "typebox"
import {
  compareSourceHistoryObservations,
  getSourceHistoryObservation,
  listSourceHistoryDatasets,
  listSourceHistoryObservations,
} from "./repository"
import { SOURCE_HISTORY_TOOL_LABELS } from "./tool-metadata"

const sourceParamsSchema = Type.Record(Type.String(), Type.Unknown())

const listDatasetsSchema = Type.Object({
  cursor: Type.Optional(Type.String()),
  limit: Type.Optional(Type.Number({ maximum: 250, minimum: 1 })),
  providerId: Type.Optional(Type.String()),
  sourceId: Type.Optional(Type.String()),
})

const listObservationsSchema = Type.Object({
  cursor: Type.Optional(Type.Number()),
  from: Type.Optional(Type.Number()),
  limit: Type.Optional(Type.Number({ maximum: 250, minimum: 1 })),
  params: Type.Optional(sourceParamsSchema),
  sourceId: Type.String(),
  to: Type.Optional(Type.Number()),
})

const getObservationSchema = Type.Object({
  observedAt: Type.Number(),
  params: Type.Optional(sourceParamsSchema),
  sourceId: Type.String(),
})

const compareObservationsSchema = Type.Object({
  after: Type.Number(),
  before: Type.Number(),
  params: Type.Optional(sourceParamsSchema),
  sourceId: Type.String(),
})

const listDatasetsTool: AgentTool<typeof listDatasetsSchema, unknown> = {
  description: "List locally stored source-history datasets. Use the returned cursor to continue.",
  execute: async (_toolCallId, input, signal) => {
    signal?.throwIfAborted()
    return toToolResult(await listSourceHistoryDatasets(input))
  },
  label: SOURCE_HISTORY_TOOL_LABELS.list_source_history_datasets,
  name: "list_source_history_datasets",
  parameters: listDatasetsSchema,
}

const listObservationsTool: AgentTool<typeof listObservationsSchema, unknown> = {
  description: "List observation metadata for one source and parameter set without loading item contents.",
  execute: async (_toolCallId, input, signal) => {
    signal?.throwIfAborted()
    return toToolResult(await listSourceHistoryObservations(input))
  },
  label: SOURCE_HISTORY_TOOL_LABELS.list_source_history_observations,
  name: "list_source_history_observations",
  parameters: listObservationsSchema,
}

const getObservationTool: AgentTool<typeof getObservationSchema, unknown> = {
  description: "Read the complete ordered items observed for one source at an exact observation timestamp.",
  execute: async (_toolCallId, input, signal) => {
    signal?.throwIfAborted()
    return toToolResult(await getSourceHistoryObservation(input))
  },
  label: SOURCE_HISTORY_TOOL_LABELS.get_source_history_observation,
  name: "get_source_history_observation",
  parameters: getObservationSchema,
}

const compareObservationsTool: AgentTool<typeof compareObservationsSchema, unknown> = {
  description: "Compare two exact source observations and report only added, missing, moved, and updated facts.",
  execute: async (_toolCallId, input, signal) => {
    signal?.throwIfAborted()
    return toToolResult(await compareSourceHistoryObservations(input))
  },
  label: SOURCE_HISTORY_TOOL_LABELS.compare_source_history_observations,
  name: "compare_source_history_observations",
  parameters: compareObservationsSchema,
}

export const sourceHistoryTools: AgentTool[] = [
  listDatasetsTool,
  listObservationsTool,
  getObservationTool,
  compareObservationsTool,
]

function toToolResult<T>(details: T): AgentToolResult<T> {
  return {
    content: [{ text: JSON.stringify(details), type: "text" }],
    details,
  }
}
