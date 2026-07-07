import type { ReactNode } from "react"
import type { BoardSource } from "@/typings/source"
import { categories } from "@newsnext/client-source/typings"
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
import { useAtomValue } from "jotai"
import { useEffect, useMemo, useState } from "react"
import { getClientSourceDescriptors } from "@/lib/client-sources"
import { buildAllBoardSources } from "@/lib/source-cards"
import { cn } from "@/lib/utils"
import { boardInstancesAtom, boardStarIdsAtom } from "@/store/board"
import Card from "../card"
import { PhForkDuotone, PhMagnifyingGlass, PhStarFill } from "../icons/ph"
import "./index.css"

const CLIENT_SOURCES = getClientSourceDescriptors()

interface SearchItem {
  id: string
  category: string
  source: BoardSource
  providerTitle: string
  title?: string
  isCustom: boolean
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
      items: groupedItems.sort((a, b) => a.providerTitle.localeCompare(b.providerTitle)),
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
  return (
    <div className="hidden md:flex flex-col p-3 items-start justify-center *:shrink-0 border-l">
      {item ? <Card id={item.id} source={item.source} /> : <></>}
    </div>
  )
}

export function SearchDialog(): ReactNode {
  const [open, setOpen] = useState(false)

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
        className="search-dialog w-[80vw] h-[80vh] sm:max-w-180 max-h-143 top-1/2 -translate-y-1/2"
      >
        {open && <SearchDialogContent />}
      </CommandDialog>
    </>
  )
}

function SearchDialogContent(): ReactNode {
  const [selectedItemId, setSelectedItemId] = useState("")
  const starredInstanceIds = useAtomValue(boardStarIdsAtom("stars"))
  const instances = useAtomValue(boardInstancesAtom("stars"))
  const sources = CLIENT_SOURCES

  const searchItems = useMemo<SearchItem[]>(() => {
    if (!sources.length) {
      return []
    }

    const allSourcesBoard = buildAllBoardSources({
      sources,
      sourceInstances: instances,
      isLocalOnly: true,
    })

    return allSourcesBoard.ids.map((id) => {
      const source = allSourcesBoard.map[id]

      return {
        id,
        category: `${categories[source.category]}${source.isCustom ? " / Custom" : ""}`,
        source,
        providerTitle: source.providerTitle,
        title: source.title,
        isCustom: source.isCustom,
        isStarred: starredInstanceIds.includes(id),
      } satisfies SearchItem
    })
  }, [sources, starredInstanceIds, instances])

  const searchGroups = useMemo(() => groupSearchItems(searchItems), [searchItems])
  const selectedItem = useMemo(
    () => searchItems.find(item => item.id === selectedItemId) ?? searchItems[0],
    [searchItems, selectedItemId],
  )

  useEffect(() => {
    setSelectedItemId(prev => searchItems.some(item => item.id === prev) ? prev : (searchItems[0]?.id ?? ""))
  }, [searchItems])

  return (
    <Command
      value={selectedItem?.id}
      onValueChange={setSelectedItemId}
      disablePointerSelection
      className={cn(`sunrise-${selectedItem?.source.color ?? "theme"}-400`, "bg-transparent p-0 rounded-none")}
    >
      <CommandInput
        autoFocus
        placeholder="Search what you want"
        className="py-3 placeholder:text-foreground/50"
      />
      <div className="flex flex-col md:flex-row md:items-stretch md:justify-between gap-2">
        <CommandList className="flex h-125 max-h-125 flex-col gap-0 w-full pl-3 pt-3">
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
                    item.id,
                    item.providerTitle,
                    item.title ?? "",
                    item.category,
                    item.isCustom ? "fork radar custom" : "featured recommend",
                    item.isStarred ? "star starred" : "",
                  ]}
                >
                  <span className="flex items-center min-w-0 flex-1 gap-2">
                    <span
                      className="size-4 shrink-0 rounded-full bg-cover bg-center bg-no-repeat"
                      aria-hidden="true"
                      style={{
                        backgroundImage: item.source.icon ? `url(${item.source.icon})` : undefined,
                      }}
                    />
                    <span className="shrink-0">{item.title || item.providerTitle}</span>
                    <span className="min-w-0 truncate text-xs text-neutral-400/80">
                      {item.title && item.providerTitle}
                    </span>
                  </span>
                  <span className="ml-auto flex shrink-0 items-center gap-2 text-neutral-400/80">
                    {item.isCustom && <PhForkDuotone />}
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
  )
}
