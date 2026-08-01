import type { SourceDescriptor } from "@/typings/source"
import { createBackgroundClient } from "./background-client"

let sourceDescriptorsPromise: Promise<SourceDescriptor[]> | undefined

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
  sourceDescriptorsPromise ??= createBackgroundClient().registry.list().then(sortSourceDescriptors).catch((error) => {
    sourceDescriptorsPromise = undefined
    throw error
  })
  return sourceDescriptorsPromise
}

export async function loadSourceDescriptor(sourceId: string): Promise<SourceDescriptor> {
  const sources = await loadSourceDescriptors()
  const source = sources.find(candidate => candidate.id === sourceId)
  if (!source) {
    throw new Error(`Source '${sourceId}' not found`)
  }

  return source
}
