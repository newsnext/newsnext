import type { SourceDescriptor } from "@/typings/source"
import { createBackgroundClient } from "./background-client"

function sortSourceDescriptors(sources: SourceDescriptor[]): SourceDescriptor[] {
  return [...sources].sort((a, b) => {
    const byCategory = (a.provider.category ?? "").localeCompare(b.provider.category ?? "")
    if (byCategory !== 0) {
      return byCategory
    }

    return a.id.localeCompare(b.id)
  })
}

export async function loadSourceDescriptors(): Promise<SourceDescriptor[]> {
  const sources = await createBackgroundClient().registry.list()
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
