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
import { PhCopyDuotone, PhMagnifyingGlass, PhStarFill } from "../icons/ph"

interface SearchItem {
  id: string
  category: string
  feed: BoardFeed
  name: string
  title?: string
  provider?: string
  isCopy: boolean
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
    <div className="hidden min-w-100 flex-1 flex-col items-start justify-center px-4 pt-2 *:max-w-none *:shrink-0 md:flex">
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
    const copiesBoard = buildBoardFeeds({
      feeds,
      boardId: "copies",
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
          isCopy: false,
          isStarred: starredFeedIds.includes(id),
        } satisfies SearchItem
      }),
      ...copiesBoard.ids.map((id) => {
        const feed = copiesBoard.map[id]
        const params = getSavedFeedParamValues(feed.id, feed.params)
        const display = resolveFeedDisplay(feed, params)

        return {
          id,
          category: `${categories[feed.category]} / Copied`,
          feed,
          name: display.name,
          title: display.title,
          provider: feed.provider,
          isCopy: true,
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
        className="top-1/2 w-[80vw] max-w-168.75 -translate-y-1/2 gap-0 rounded-2xl bg-transparent p-0 shadow-none sm:max-w-168.75"
      >
        <Command
          value={selectedItem?.id}
          onValueChange={setSelectedItemId}
          className={cn(
            "rounded-2xl bg-popover/90 pb-4 backdrop-blur-[20px]",
            "**:data-[slot=command-input-wrapper]:p-0",
            "[&_[data-slot=command-input-wrapper]>[data-slot=input-group]]:h-auto [&_[data-slot=command-input-wrapper]>[data-slot=input-group]]:rounded-none [&_[data-slot=command-input-wrapper]>[data-slot=input-group]]:border-0 [&_[data-slot=command-input-wrapper]>[data-slot=input-group]]:border-b [&_[data-slot=command-input-wrapper]>[data-slot=input-group]]:border-foreground/10 [&_[data-slot=command-input-wrapper]>[data-slot=input-group]]:bg-transparent [&_[data-slot=command-input-wrapper]>[data-slot=input-group]]:px-4 [&_[data-slot=command-input-wrapper]>[data-slot=input-group]]:shadow-none",
          )}
        >
          <CommandInput
            autoFocus
            placeholder="Search what you want"
            className="bg-transparent py-[0.85rem] text-[0.95rem] placeholder:text-foreground/50"
          />
          <div className="flex flex-col gap-0 pt-2 md:flex-row md:items-stretch">
            <CommandList className="flex h-125 max-h-125 flex-col gap-0 px-3 md:w-61 md:min-w-61 md:max-w-61 md:shrink-0 md:grow-0 md:basis-61 md:flex-none">
              <CommandEmpty className="flex items-center justify-center py-8 text-sm opacity-70 whitespace-pre-wrap">
                No cards found.
              </CommandEmpty>
              {searchGroups.map(group => (
                <CommandGroup
                  key={group.heading}
                  heading={group.heading}
                  className="p-0 **:[[cmdk-group-heading]]:mx-1 **:[[cmdk-group-heading]]:my-2 **:[[cmdk-group-heading]]:px-1 **:[[cmdk-group-heading]]:py-0 **:[[cmdk-group-heading]]:text-sm **:[[cmdk-group-heading]]:font-bold **:[[cmdk-group-heading]]:text-foreground **:[[cmdk-group-heading]]:opacity-70"
                >
                  {group.items.map(item => (
                    <CommandItem
                      key={item.id}
                      className="mb-1 justify-between gap-3 hover:bg-neutral-400/10 data-selected:bg-neutral-400/16 bg-transparent!"
                      value={item.id}
                      keywords={[
                        item.name,
                        item.title ?? "",
                        item.provider ?? "",
                        item.category,
                        item.isCopy ? "copy copied copies custom" : "featured recommend",
                        item.isStarred ? "star starred" : "",
                      ]}
                    >
                      <span className="flex min-w-0 flex-1 items-center gap-2">
                        <span
                          className="size-4 shrink-0 rounded-md bg-cover bg-center bg-no-repeat"
                          aria-hidden="true"
                          style={{
                            backgroundImage: item.provider
                              ? `url(https://s3.newsnext.pro/icons/${item.provider}.png)`
                              : undefined,
                          }}
                        />
                        <span className="shrink-0">{item.name}</span>
                        <span className="mb-0.75 min-w-0 self-end truncate text-xs text-neutral-400/80">
                          {item.title}
                        </span>
                      </span>
                      <span className="ml-auto flex shrink-0 items-center gap-2 [&_svg]:size-[0.95rem] [&_svg]:text-neutral-400/72">
                        {item.isCopy && <PhCopyDuotone />}
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
