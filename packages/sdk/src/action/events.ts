import { defineEventContract } from "./definition.js"
import { EmptyObject } from "./schema.js"

// Background-to-UI broadcasts. Payloads stay empty signals: receivers re-pull
// authoritative state through the matching query Action instead of trusting a
// pushed snapshot, so missed messages self-heal on the next poll.
const nativeIntegrationStatusChangedEvent = defineEventContract({
  description: "Native worker routing, Widget catalog, or connection state changed; re-read nativeIntegration.getStatus and nativeIntegration.getWidgets.",
  name: "nativeIntegration.statusChanged",
  payload: EmptyObject,
})

const diagnosticsChangedEvent = defineEventContract({
  description: "Background diagnostics changed; re-read the diagnostics snapshot.",
  name: "diagnostics.changed",
  payload: EmptyObject,
})

export const backgroundEventContracts = [
  nativeIntegrationStatusChangedEvent,
  diagnosticsChangedEvent,
] as const
