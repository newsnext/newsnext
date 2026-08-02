import { commandScore } from "./command-score"

export interface CommandItemRegistration {
  id: string
  value: string
  keywords: string[]
  groupId?: string
  disabled: boolean
}

export interface RankedCommandItems {
  groupOrder: Map<string, number>
  itemOrder: Map<string, number>
  orderedEnabledIds: string[]
  visibleIds: Set<string>
}

export function rankCommandItems(
  items: CommandItemRegistration[],
  search: string,
): RankedCommandItems {
  const scores = new Map<string, number>()
  const visibleItems = items.filter((item) => {
    const score = search ? commandScore(item.value, search, item.keywords) : 1
    scores.set(item.id, score)
    return score > 0
  })
  const compareItems = (first: CommandItemRegistration, second: CommandItemRegistration): number => (
    (scores.get(second.id) ?? 0) - (scores.get(first.id) ?? 0)
  )
  const ungrouped = visibleItems.filter(item => !item.groupId).sort(compareItems)
  const groups = new Map<string, CommandItemRegistration[]>()

  for (const item of visibleItems) {
    if (!item.groupId) {
      continue
    }
    const groupItems = groups.get(item.groupId) ?? []
    groupItems.push(item)
    groups.set(item.groupId, groupItems)
  }

  const sortedGroups = [...groups.entries()]
    .map(([id, groupItems]) => ({
      id,
      items: groupItems.sort(compareItems),
      score: Math.max(...groupItems.map(item => scores.get(item.id) ?? 0)),
    }))
    .sort((first, second) => second.score - first.score)
  const orderedItems = [ungrouped, ...sortedGroups.map(group => group.items)].flat()

  return {
    groupOrder: new Map(sortedGroups.map((group, index) => [group.id, index])),
    itemOrder: new Map(orderedItems.map((item, index) => [item.id, index])),
    orderedEnabledIds: orderedItems.filter(item => !item.disabled).map(item => item.id),
    visibleIds: new Set(visibleItems.map(item => item.id)),
  }
}
