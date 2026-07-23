import type { SourceDescriptor } from "@/typings/source"
import { sourceDescriptors } from "@newsnext/source/metadata"

export function getSourceDescriptors(): SourceDescriptor[] {
  return [...sourceDescriptors].sort((a, b) => {
    const byCategory = a.category.localeCompare(b.category)
    if (byCategory !== 0) {
      return byCategory
    }

    return a.id.localeCompare(b.id)
  })
}
