import type { NewsItem } from "@/typings/source"
import { useEffect, useState } from "react"
import { getSemanticImageScale } from "@/lib/source/normalize-semantic-image"

interface SourceMarkScaleGroup {
  items: readonly NewsItem[]
  sourceKey: string
}

const EMPTY_SCALES = new Map<string, number>()

export function useSourceMarkScales(
  groups: readonly SourceMarkScaleGroup[],
): ReadonlyMap<string, number> {
  const [state, setState] = useState<{
    groups: readonly SourceMarkScaleGroup[]
    scales: ReadonlyMap<string, number>
  }>()

  useEffect(() => {
    const targets = groups.flatMap(({ items, sourceKey }) => {
      const src = items.find(item => item.mark)?.mark?.src
      return src ? [{ sourceKey, src }] : []
    })
    if (targets.length === 0) return

    let active = true
    Promise.all(targets.map(async ({ sourceKey, src }) => {
      try {
        const scale = await getSemanticImageScale(src, sourceKey)
        return scale ? [sourceKey, scale] as const : undefined
      } catch {
        return undefined
      }
    })).then((entries) => {
      if (!active) return
      setState({
        groups,
        scales: new Map(entries.filter(entry => entry !== undefined)),
      })
    })

    return () => {
      active = false
    }
  }, [groups])

  return state?.groups === groups ? state.scales : EMPTY_SCALES
}
