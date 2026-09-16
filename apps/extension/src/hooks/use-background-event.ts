import type { AllEventName, EventPayload } from "@newsnext/sdk/actions"
import { useEffect, useRef } from "react"
import { browser } from "#imports"
import {
  isBackgroundEventMessage,
  parseBackgroundEventPayload,
} from "@/lib/background/background-events"

export function useBackgroundEvent<Name extends AllEventName>(
  name: Name,
  handler: (payload: EventPayload<Name>) => void,
  enabled = true,
): void {
  const handlerRef = useRef(handler)
  handlerRef.current = handler
  useEffect(() => {
    if (!enabled) return
    const handleMessage = (message: unknown): void => {
      if (!isBackgroundEventMessage(message) || message.name !== name) return
      try {
        handlerRef.current(parseBackgroundEventPayload(name, message.payload))
      } catch (error) {
        console.error(`Invalid background event '${name}' payload`, error)
      }
    }
    browser.runtime.onMessage.addListener(handleMessage)
    return () => browser.runtime.onMessage.removeListener(handleMessage)
  }, [enabled, name])
}
