import type { NativeNode } from "@newsnext/extension-connection"
import type { Instance } from "./source"
import { normalizeInstances } from "./settings/persisted-data"

export const NODES_STORAGE_KEY = "newsnext-connected-nodes"

export interface Node extends Omit<NativeNode, "instances"> {
  instances: Instance[]
}

export function normalizeNodes(value: unknown): Node[] {
  if (!Array.isArray(value)) return []
  const seenIds = new Set<string>()
  return value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return []
    const node = candidate as Record<string, unknown>
    if (typeof node.id !== "string" || !node.id || seenIds.has(node.id)
      || typeof node.browser !== "string"
      || typeof node.extensionVersion !== "string") {
      return []
    }
    seenIds.add(node.id)
    return [{
      id: node.id,
      browser: node.browser,
      extensionVersion: node.extensionVersion,
      instances: normalizeInstances(node.instances),
    }]
  })
}
