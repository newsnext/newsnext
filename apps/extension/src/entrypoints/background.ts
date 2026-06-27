import type { NewsItem } from "@newsnext/sources/typings"
import { prepareSourceRequest } from "@newsnext/sources/service"
import { browser } from "wxt/browser"

interface LoadSourceMessage {
  type: "load-source"
  sourceId: string
}

interface LoadSourceSuccess {
  ok: true
  items: NewsItem[]
}

interface LoadSourceFailure {
  ok: false
  error: string
}

export type LoadSourceResponse = LoadSourceSuccess | LoadSourceFailure

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return "Failed to load this source"
}

async function loadSourceItems(sourceId: string): Promise<NewsItem[]> {
  const request = prepareSourceRequest(sourceId)
  return request.source.loader(request.params)
}

function isLoadSourceMessage(message: unknown): message is LoadSourceMessage {
  if (!message || typeof message !== "object") {
    return false
  }

  const value = message as Partial<LoadSourceMessage>
  return value.type === "load-source" && typeof value.sourceId === "string"
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message: unknown) => {
    if (!isLoadSourceMessage(message)) {
      return undefined
    }

    return loadSourceItems(message.sourceId)
      .then<LoadSourceResponse>(items => ({ ok: true, items }))
      .catch<LoadSourceResponse>(error => ({ ok: false, error: getErrorMessage(error) }))
  })
})
