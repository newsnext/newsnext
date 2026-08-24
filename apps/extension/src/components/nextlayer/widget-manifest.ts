export interface LocalWidgetManifest {
  height: number
  id: string
  minHeight: number
  minWidth: number
  title: string
  url: string
  width: number
}

export function parseLocalWidgetManifests(
  value: unknown,
  serverUrl: string,
): LocalWidgetManifest[] {
  if (!Array.isArray(value)) throw new Error("The widget server returned an invalid manifest list")
  const serverOrigin = new URL(serverUrl).origin
  const ids = new Set<string>()
  return value.map((candidate) => {
    if (!isRecord(candidate)
      || !isIdentifier(candidate.id)
      || !isNonEmptyString(candidate.title)
      || !isGridSize(candidate.width, 12)
      || !isGridSize(candidate.minWidth, candidate.width)
      || !isGridSize(candidate.height, 100)
      || !isGridSize(candidate.minHeight, candidate.height)
      || typeof candidate.url !== "string") {
      throw new Error("The widget server returned an invalid widget manifest")
    }
    if (ids.has(candidate.id)) throw new Error(`Duplicate widget ID '${candidate.id}'`)
    ids.add(candidate.id)
    const url = new URL(candidate.url)
    if (url.origin !== serverOrigin || !url.pathname.startsWith(`/widgets/${candidate.id}/`)) {
      throw new Error(`Widget '${candidate.id}' has an invalid entry URL`)
    }
    return {
      height: candidate.height,
      id: candidate.id,
      minHeight: candidate.minHeight,
      minWidth: candidate.minWidth,
      title: candidate.title,
      url: url.href,
      width: candidate.width,
    }
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function isIdentifier(value: unknown): value is string {
  return typeof value === "string" && /^[\w-]+$/.test(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isGridSize(value: unknown, maximum: number): value is number {
  return Number.isInteger(value) && Number(value) > 0 && Number(value) <= maximum
}
