import type { SourceDescriptor } from "@/typings/source"
import { loadSourceDescriptors as loadRuntimeSourceDescriptors } from "@newsnext/source/service"
import { createBackgroundClient } from "./background-client"

function sortSourceDescriptors(sources: SourceDescriptor[]): SourceDescriptor[] {
  return [...sources].sort((a, b) => {
    const byCategory = a.category.localeCompare(b.category)
    if (byCategory !== 0) {
      return byCategory
    }

    return a.id.localeCompare(b.id)
  })
}

export async function loadSourceDescriptors(): Promise<SourceDescriptor[]> {
  const backgroundClient = createBackgroundClient()
  const sources = backgroundClient
    ? await backgroundClient.registry.list()
    : await loadRuntimeSourceDescriptors()
  return sortSourceDescriptors(sources)
}

export async function loadSourceDescriptor(sourceId: string): Promise<SourceDescriptor> {
  const sources = await loadSourceDescriptors()
  const source = sources.find(candidate => candidate.id === sourceId)
  if (!source) {
    throw new Error(`Source '${sourceId}' not found`)
  }

  return source
}
