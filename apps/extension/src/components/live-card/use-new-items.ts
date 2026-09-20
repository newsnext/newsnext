import type { NewsItem } from "@/typings/source"
import { useEffect, useRef, useState } from "react"

// Brief highlight for items that appeared in the latest fetch; url is the item identity.
export const NEW_ITEM_HIGHLIGHT_MS = 3000

export function getNewItemUrls(
  previousItems: readonly NewsItem[],
  items: readonly NewsItem[],
): Set<string> {
  if (previousItems.length === 0 || items.length === 0) return new Set()
  const previousUrls = new Set(previousItems.map(item => item.url))
  return new Set(
    items.filter(item => !previousUrls.has(item.url)).map(item => item.url),
  )
}

export function useNewItemUrls(items: NewsItem[]): Set<string> {
  const [newUrls, setNewUrls] = useState<Set<string>>(() => new Set())
  const previousItemsRef = useRef(items)

  useEffect(() => {
    if (previousItemsRef.current === items) return
    setNewUrls(getNewItemUrls(previousItemsRef.current, items))
    previousItemsRef.current = items
  }, [items])

  useEffect(() => {
    if (newUrls.size === 0) return
    const timer = window.setTimeout(() => setNewUrls(new Set()), NEW_ITEM_HIGHLIGHT_MS)
    return () => window.clearTimeout(timer)
  }, [newUrls])

  return newUrls
}
