import type { ReactNode } from "react"
import type { BoardSource } from "@/typings/source"
import { Button } from "@newsnext/ui/components/button"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@newsnext/ui/components/command"
import { useAtomValue } from "jotai"
import { useEffect, useMemo, useState } from "react"
import { useSourceDescriptors } from "@/hooks/use-source-descriptors"
import { useSourceIcon } from "@/hooks/use-source-icon"
import { DEFAULT_BOARD_ID } from "@/lib/boards"
import { buildSourceCards } from "@/lib/source-cards"
import { cn } from "@/lib/utils"
import { instancesAtom } from "@/store/board"
import Card from "../card"
import { SourceIcon } from "../card/source-icon"
import { PhMagnifyingGlass } from "../icons/ph"
import "./index.css"

interface SearchItem {
  id: string
  source: BoardSource
}

function SearchSourceIcon({ source }: { source: BoardSource }): ReactNode {
  const icon = useSourceIcon(source)

  return (
    <SourceIcon
      badge={source.metadata.badge}
      className="shrink-0 rounded-full"
      color={source.provider.color}
      icon={icon}
      title={source.metadata.title || source.provider.title}
    />
  )
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
  const instances = useAtomValue(instancesAtom)
  const { sources } = useSourceDescriptors()

  const searchItems = useMemo<SearchItem[]>(() => {
    if (!sources.length) {
      return []
    }

    const cards = buildSourceCards({
      sources,
      sourceInstances: instances,
      boardId: DEFAULT_BOARD_ID,
    })

    return cards.ids.map((id) => {
      const source = cards.map[id]

      return {
        id,
        source,
      } satisfies SearchItem
    })
  }, [sources, instances])

  const selectedItem = useMemo(
    () => searchItems.find(item => item.id === selectedItemId) ?? searchItems[0],
    [searchItems, selectedItemId],
  )

  return (
    <Command
      value={selectedItem?.id}
      onValueChange={setSelectedItemId}
      disablePointerSelection
      className={cn(`sunrise-${selectedItem?.source.provider.color ?? "theme"}-400`, "bg-transparent p-0 rounded-none")}
    >
      <CommandInput
        autoFocus
        placeholder="Search your cards"
        className="py-3 placeholder:text-foreground/50"
      />
      <div className="flex flex-col md:flex-row md:items-stretch md:justify-between gap-2">
        <CommandList className="flex h-125 max-h-125 flex-col gap-0 w-full pl-3 pt-3">
          <CommandEmpty className="flex items-center justify-center py-8 text-sm opacity-70 whitespace-pre-wrap">
            No cards found.
          </CommandEmpty>
          {searchItems.map(item => (
            <CommandItem
              key={item.id}
              className="justify-between gap-3 data-[selected=true]:bg-neutral-400/10"
              value={item.id}
              keywords={[
                item.id,
                item.source.provider.title,
                item.source.metadata.title ?? "",
                "card radar",
              ]}
            >
              <span className="flex items-center min-w-0 flex-1 gap-2">
                <SearchSourceIcon source={item.source} />
                <span className="shrink-0">
                  {item.source.metadata.title || item.source.provider.title}
                </span>
              </span>
            </CommandItem>
          ))}
        </CommandList>
        <SearchPreview item={selectedItem} />
      </div>
    </Command>
  )
}
