import type { JSX } from "react"
import type { BoardFeed } from "@/typings/feed"
import { categories } from "@newsnext/feeds/typings"
import { Button } from "@newsnext/ui/components/button"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@newsnext/ui/components/command"
import { cn } from "@newsnext/ui/lib/utils"
import { useAtomValue } from "jotai"
import { useEffect, useMemo, useState } from "react"
import { buildBoardFeeds } from "@/lib/feed-cards"
import { resolveFeedDisplay } from "@/lib/feed-display"
import { getSavedFeedParamValues } from "@/lib/feed-params"
import { trpc } from "@/lib/trpc"
import { forkedFeedCardsAtom, starredFeedIdsAtom } from "@/store/board"
import Card from "../card"
import { PhForkDuotone, PhMagnifyingGlass, PhStarFill } from "../icons/ph"
import "./index.css"

interface SearchItem {
  id: string
  category: string
  feed: BoardFeed
  name: string
  title?: string
  provider?: string
  isFork: boolean
  isStarred: boolean
}

interface SearchGroup {
  heading: string
  items: SearchItem[]
}

function groupSearchItems(items: SearchItem[]): SearchGroup[] {
  const groups = items.reduce<Map<string, SearchItem[]>>((acc, item) => {
    const currentItems = acc.get(item.category) ?? []
    currentItems.push(item)
    acc.set(item.category, currentItems)
    return acc
  }, new Map())

  return [...groups.entries()]
    .map(([heading, groupedItems]) => ({
      heading,
      items: groupedItems.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => {
      if (a.heading === categories.tech) {
        return -1
      }
      if (b.heading === categories.tech) {
        return 1
      }
      return a.heading.localeCompare(b.heading)
    })
}

function SearchPreview({ item }: { item?: SearchItem }) {
  if (!item) {
    return <></>
  }

  return (
    <div className="hidden md:flex flex-col items-start justify-center *:shrink-0">
      <Card id={item.id} feed={item.feed} />
    </div>
  )
}

export function SearchDialog(): JSX.Element {
  const [open, setOpen] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState("")
  const starredFeedIds = useAtomValue(starredFeedIdsAtom)
  const forkedFeedCards = useAtomValue(forkedFeedCardsAtom)
  const { data: feeds = [] } = trpc.getBoard.useQuery({ boardId: "featured" })

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen(prev => !prev)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  const searchItems = useMemo<SearchItem[]>(() => {
    if (feeds.length === 0) {
      return []
    }

    const featuredBoard = buildBoardFeeds({
      feeds,
      boardId: "featured",
      starredFeedIds,
      forkedFeedCards,
    })
    const forksBoard = buildBoardFeeds({
      feeds,
      boardId: "forks",
      starredFeedIds,
      forkedFeedCards,
    })

    return [
      ...featuredBoard.ids.map((id) => {
        const feed = featuredBoard.map[id]
        const params = getSavedFeedParamValues(feed.id, feed.params)
        const display = resolveFeedDisplay(feed, params)

        return {
          id,
          category: categories[feed.category],
          feed,
          name: display.name,
          title: display.title,
          provider: feed.provider,
          isFork: false,
          isStarred: starredFeedIds.includes(id),
        } satisfies SearchItem
      }),
      ...forksBoard.ids.map((id) => {
        const feed = forksBoard.map[id]
        const params = feed.paramsValue ?? getSavedFeedParamValues(feed.id, feed.params)
        const display = resolveFeedDisplay(feed, params)

        return {
          id,
          category: `${categories[feed.category]} / Forked`,
          feed,
          name: display.name,
          title: display.title,
          provider: feed.provider,
          isFork: true,
          isStarred: starredFeedIds.includes(id),
        } satisfies SearchItem
      }),
    ]
  }, [feeds, starredFeedIds, forkedFeedCards])

  const searchGroups = useMemo(() => groupSearchItems(searchItems), [searchItems])
  const selectedItem = useMemo(
    () => searchItems.find(item => item.id === selectedItemId) ?? searchItems[0],
    [searchItems, selectedItemId],
  )

  useEffect(() => {
    if (!open) {
      return
    }

    setSelectedItemId(prev => searchItems.some(item => item.id === prev) ? prev : (searchItems[0]?.id ?? ""))
  }, [open, searchItems])

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="island-pill size-10 pointer-events-auto"
        title="Search"
        onClick={() => setOpen(true)}
      >
        <PhMagnifyingGlass className="size-5" />
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search Cards"
        description="Search cards"
        className="search-dialog w-[80vw] h-[80vh] sm:max-w-180 max-h-143 top-1/2 -translate-y-1/2 rounded-[40px]"
      >
        <Command
          value={selectedItem?.id}
          onValueChange={setSelectedItemId}
          disablePointerSelection
          className="sprinkle-theme-400 rounded-[40px] border p-3 pt-0"
        >
          <CommandInput
            autoFocus
            placeholder="Search what you want"
            className="py-3 placeholder:text-foreground/50"
          />
          <div className="flex flex-col md:flex-row md:items-stretch md:justify-between gap-2 mt-3">
            <CommandList className="flex h-125 max-h-125 flex-col gap-0 w-full">
              <CommandEmpty className="flex items-center justify-center py-8 text-sm opacity-70 whitespace-pre-wrap">
                No cards found.
              </CommandEmpty>
              {searchGroups.map(group => (
                <CommandGroup
                  key={group.heading}
                  heading={group.heading}
                >
                  {group.items.map(item => (
                    <CommandItem
                      key={item.id}
                      className="justify-between gap-3 data-[selected=true]:bg-neutral-400/10"
                      value={item.id}
                      keywords={[
                        item.name,
                        item.title ?? "",
                        item.provider ?? "",
                        item.category,
                        item.isFork ? "fork forked custom" : "featured recommend",
                        item.isStarred ? "star starred" : "",
                      ]}
                    >
                      <span className="flex items-center min-w-0 flex-1 gap-2">
                        <span
                          className="size-4 shrink-0 rounded-full bg-cover bg-center bg-no-repeat"
                          aria-hidden="true"
                          style={{
                            backgroundImage: item.provider
                              ? `url(https://s3.newsnext.pro/icons/${item.provider}.png)`
                              : undefined,
                          }}
                        />
                        <span className="shrink-0">{item.title || item.name}</span>
                        <span className="min-w-0 truncate text-xs text-neutral-400/80">
                          {item.title && item.name}
                        </span>
                      </span>
                      <span className="ml-auto flex shrink-0 items-center gap-2 text-neutral-400/80">
                        {item.isFork && <PhForkDuotone />}
                        {item.isStarred && <PhStarFill />}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
            <SearchPreview item={selectedItem} />
          </div>
        </Command>
      </CommandDialog>
    </>
  )
}
