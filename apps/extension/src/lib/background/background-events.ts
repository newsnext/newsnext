import type { AllEventName, EventPayload } from "@newsnext/sdk/actions"
import { eventContracts } from "@newsnext/sdk/actions"
import Value from "typebox/value"
import { browser } from "#imports"

// Dispatch center for background-to-UI broadcasts, mirroring the Action registry
// for UI-to-background calls. Every push is a named event contract: the payload
// schema is validated on both sides, and emissions are recorded for diagnostics.
export const BACKGROUND_EVENT_MESSAGE_TYPE = "newsnext.background-event"

export interface BackgroundEventMessage<Name extends AllEventName = AllEventName> {
  name: Name
  payload: EventPayload<Name>
  type: typeof BACKGROUND_EVENT_MESSAGE_TYPE
}

export interface BackgroundEventRecord {
  at: number
  name: string
  payload: unknown
}

const MAX_EVENT_RECORDS = 100
const eventRecords: BackgroundEventRecord[] = []

export function emitBackgroundEvent<Name extends AllEventName>(
  name: Name,
  payload: EventPayload<Name>,
): void {
  const parsed = Value.Parse(eventContracts[name].payload, payload)
  if (import.meta.env.DEV) {
    eventRecords.unshift({ at: Date.now(), name, payload: cloneEventPayload(parsed) })
    eventRecords.splice(MAX_EVENT_RECORDS)
  }
  void browser.runtime.sendMessage({
    name,
    payload: parsed,
    type: BACKGROUND_EVENT_MESSAGE_TYPE,
  }).catch(() => undefined)
}

export function isBackgroundEventMessage(value: unknown): value is BackgroundEventMessage {
  return value !== null
    && typeof value === "object"
    && "type" in value
    && value.type === BACKGROUND_EVENT_MESSAGE_TYPE
    && "name" in value
    && typeof value.name === "string"
    && (value.name as string) in eventContracts
    && "payload" in value
}

export function parseBackgroundEventPayload<Name extends AllEventName>(
  name: Name,
  value: unknown,
): EventPayload<Name> {
  return Value.Parse(eventContracts[name].payload, value) as EventPayload<Name>
}

export function listBackgroundEvents(): BackgroundEventRecord[] {
  if (!import.meta.env.DEV) return []
  return eventRecords.map(record => ({ ...record }))
}

function cloneEventPayload(value: unknown): unknown {
  try {
    return structuredClone(value)
  } catch {
    return String(value)
  }
}
