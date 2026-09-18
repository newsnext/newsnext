import { Type } from "typebox"
import { defineEventContract } from "./definition.js"
import { EmptyObject } from "./schema.js"

// Background-to-UI broadcasts. Payloads stay empty signals: receivers re-pull
// authoritative state through the matching query Action instead of trusting a
// pushed snapshot, so missed messages self-heal on the next poll.
// Exception: nativeIntegration.logsChanged carries entries (each with a
// monotonic id) so the Settings log viewer can append without re-pulling the
// whole buffer; receivers dedupe by id and re-pull getLogs on reconnect.
const nativeIntegrationStatusChangedEvent = defineEventContract({
  description: "Native worker routing, Widget catalog, or connection state changed; re-read nativeIntegration.getStatus and nativeIntegration.getWidgets.",
  name: "nativeIntegration.statusChanged",
  payload: EmptyObject,
})

const nativeIntegrationLogsChangedEvent = defineEventContract({
  description: "New NewsNext CLI service log entries; append them to the getLogs snapshot, deduping by id.",
  name: "nativeIntegration.logsChanged",
  payload: Type.Object({
    entries: Type.Array(Type.Object({
      id: Type.Number(),
      timestamp: Type.String(),
      level: Type.Union([Type.Literal("error"), Type.Literal("warn"), Type.Literal("info")]),
      target: Type.String(),
      message: Type.String(),
    }, { additionalProperties: false })),
  }, { additionalProperties: false }),
})

const diagnosticsChangedEvent = defineEventContract({
  description: "Background diagnostics changed; re-read the diagnostics snapshot.",
  name: "diagnostics.changed",
  payload: EmptyObject,
})

export const backgroundEventContracts = [
  nativeIntegrationStatusChangedEvent,
  nativeIntegrationLogsChangedEvent,
  diagnosticsChangedEvent,
] as const
