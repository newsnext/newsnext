import type { LiveCardViewModel, NewsItem } from "@/typings/source"
import { getNewsItemsPresentation } from "@/lib/source/presentation"
import { Ranking } from "./ranking"
import { Timeline } from "./timeline"
import { UnorderedList } from "./unordered-list"

interface LiveCardItemsProps {
  items: NewsItem[]
  inlinePresentation?: string[]
  markScale?: number
  presentationType?: LiveCardViewModel["metadata"]["type"]
  scrollElement: HTMLDivElement | null
}

export function LiveCardItems({ presentationType, ...props }: LiveCardItemsProps): React.JSX.Element {
  const presentation = getNewsItemsPresentation(props.items, presentationType)
  if (presentation.type === "ranking") return <Ranking {...props} />
  if (presentation.type === "list") return <UnorderedList {...props} />
  return <Timeline {...props} times={presentation.times} />
}
