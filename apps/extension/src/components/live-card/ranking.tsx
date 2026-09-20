import type { NewsItem } from "@/typings/source"
import { VirtualList } from "@newsnext/ui/components/virtual-list"
import { cn } from "@newsnext/ui/lib/utils"
import { AnimatePresence, m } from "motion/react"
import { useEffect, useState } from "react"
import { NewsItemLink, NewsItemSummary } from "./news-item-common"
import { useNewItemUrls } from "./use-new-items"

interface Props {
  items: NewsItem[]
  inlinePresentation?: string[]
  markScale?: number
  scrollElement: HTMLDivElement | null
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

function MarkerBadge({ visible, className, children }: {
  visible: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <AnimatePresence>
      {visible && (
        <m.span
          aria-hidden="true"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 0.75, y: -6 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "absolute left-1 top-0 text-xs font-medium leading-none",
            className,
          )}
        >
          {children}
        </m.span>
      )}
    </AnimatePresence>
  )
}

function RankChangeBadge({ diff }: { diff?: number }) {
  return (
    <MarkerBadge
      visible={diff !== undefined && diff !== 0}
      className={diff !== undefined && diff < 0 ? "text-green-500" : "text-red-500"}
    >
      {diff !== undefined && diff > 0 ? `+${diff}` : diff}
    </MarkerBadge>
  )
}

export function Ranking({ items, inlinePresentation, markScale, scrollElement }: Props) {
  const rankChanges = useRankChanges(items)
  const newItemUrls = useNewItemUrls(items)

  return (
    <VirtualList
      items={items}
      scrollElement={scrollElement}
      estimateSize={60}
      itemClassName="pb-2 last:pb-0"
      renderItem={(item, index) => (
        <NewsItemLink
          item={item}
          inlineText={inlinePresentation?.[index]}
          markScale={markScale}
          previewItems={items}
          previewIndex={index}
          previewInlinePresentation={inlinePresentation}
          className="relative flex items-center gap-2 rounded-xl transition-colors hover:bg-muted"
        >
          <span className={cn("flex min-h-6 w-6 shrink-0 self-stretch items-center justify-center rounded-full text-sm", newItemUrls.has(item.url) ? "animate-pulse bg-theme-500/50 font-semibold text-white" : "bg-muted opacity-80")}>
            {index + 1}
          </span>
          <RankChangeBadge diff={rankChanges[item.url]} />
          <NewsItemSummary
            item={item}
            inlineText={inlinePresentation?.[index]}
            markScale={markScale}
          />
        </NewsItemLink>
      )}
    />
  )
}
