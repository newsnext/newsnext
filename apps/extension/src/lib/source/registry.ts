import type { SourceDescriptor } from "@/typings/source"
import { actions } from "../actions"

export async function loadSourceDescriptor(sourceId: string): Promise<SourceDescriptor> {
  return actions.source.get({ sourceId })
}
