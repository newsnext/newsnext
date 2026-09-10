import { MANUAL_REQUEST_MINIMUM_FEEDBACK_MS } from "./source/query-policy"

export async function waitForMinimumManualRequestFeedback(startedAt: number): Promise<void> {
  const remainingMs = MANUAL_REQUEST_MINIMUM_FEEDBACK_MS - (Date.now() - startedAt)
  if (remainingMs <= 0) {
    return
  }

  await new Promise(resolve => setTimeout(resolve, remainingMs))
}
