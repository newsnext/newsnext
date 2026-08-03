import type { Color } from "@newsnext/shared/types"
import type { NewsItem } from "@/typings/source"
import { VirtualList } from "@newsnext/ui/components/virtual-list"
import { AnimatePresence, m } from "motion/react"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { NewsItemLink, NewsItemSummary } from "./news-item-common"

interface Props {
  items: NewsItem[]
  scrollElement: HTMLDivElement | null
  color: Color
}

const RANK_CHANGE_VISIBLE_MS = 3000

interface RankChangeState {
  items: NewsItem[]
  changes: Record<string, number>
  version: number
}

function getRankChanges(previousItems: NewsItem[], items: NewsItem[]): Record<string, number> {
  if (!previousItems.length || !items.length) {
    return {}
  }

  const previousIndexByUrl = new Map(previousItems.map((item, index) => [item.url, index]))
  const rankChanges: Record<string, number> = {}

  items.forEach((item, index) => {
    const previousIndex = previousIndexByUrl.get(item.url)
    if (previousIndex === undefined) {
      return
    }

    const diff = previousIndex - index
    if (diff !== 0) {
      rankChanges[item.url] = diff
    }
  })

  return rankChanges
}

function useRankChanges(items: NewsItem[]): Record<string, number> {
  const [rankChangeState, setRankChangeState] = useState<RankChangeState>(() => ({
    items,
    changes: {},
    version: 0,
  }))

  if (rankChangeState.items !== items) {
    setRankChangeState({
      items,
      changes: getRankChanges(rankChangeState.items, items),
      version: rankChangeState.version + 1,
    })
  }

  useEffect(() => {
    if (!Object.keys(rankChangeState.changes).length) {
      return
    }

    const timer = window.setTimeout(() => {
      setRankChangeState(prev => ({
        ...prev,
        changes: {},
      }))
    }, RANK_CHANGE_VISIBLE_MS)

    return () => window.clearTimeout(timer)
  }, [rankChangeState.changes, rankChangeState.version])

  return rankChangeState.changes
}

function RankChangeBadge({ diff }: { diff?: number }) {
  return (
    <AnimatePresence>
      {!!diff && (
        <m.span
          aria-hidden="true"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 0.75, y: -6 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "absolute left-1 top-0 text-xs font-medium leading-none",
            diff < 0 ? "text-green-500" : "text-red-500",
          )}
        >
          {diff > 0 ? `+${diff}` : diff}
        </m.span>
      )}
    </AnimatePresence>
  )
}

export function Ranking({ items, scrollElement }: Props) {
  const rankChanges = useRankChanges(items)

  return (
    <VirtualList
      items={items}
      scrollElement={scrollElement}
      estimateSize={60}
      itemClassName="pb-2 last:pb-0"
      renderItem={(item, index) => (
        <NewsItemLink
          item={item}
          className={cn(
            "flex gap-2 items-center relative transition-all",
            "hover:bg-neutral-400/10 rounded-xl",
          )}
        >
          <span className={cn("opacity-80 w-6 min-h-6 self-stretch shrink-0 flex justify-center items-center rounded-full text-sm", "bg-neutral-400/10")}>
            {index + 1}
          </span>
          <RankChangeBadge diff={rankChanges[item.url]} />
          <NewsItemSummary item={item} />
        </NewsItemLink>
      )}
    />
  )
}
