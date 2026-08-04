import type { ReactNode } from "react"
import type { Board } from "@/lib/boards"
import type { BoardSource } from "@/typings/source"
import { Button } from "@newsnext/ui/components/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@newsnext/ui/components/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@newsnext/ui/components/dialog"
import { SquircleBox } from "@newsnext/ui/components/squircle"
import { useQueries, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { useAtomValue } from "jotai"
import { useEffect, useMemo, useState } from "react"
import {
  createSourceQueryTarget,
  getSourceQueryKey,
  getSourceQueryOptions,
} from "@/hooks/source-query"
import { useSourceDescriptors } from "@/hooks/use-source-descriptors"
import { useSourceIcon } from "@/hooks/use-source-icon"
import { ALL_BOARD_ID } from "@/lib/boards"
import {
  applySourceLoaderMetadata,
  buildSourceCards,
  getSourceCard,
} from "@/lib/source-cards"
import { readPersistedSourceCache } from "@/lib/source-loader"
import { boardsAtom, instancesAtom } from "@/store/board"
import { SourceIcon } from "../card/source-icon"
import { PhMagnifyingGlass } from "../icons/ph"

interface SearchGroup {
  id: string
  name: string
  items: BoardSource[]
  targetBoardId: string
}

function groupSearchItems(searchSources: BoardSource[], boards: Board[]): SearchGroup[] {
  const itemsByBoardId = new Map<string, BoardSource[]>()
  const knownBoardIds = new Set(
    boards.filter(board => board.id !== ALL_BOARD_ID).map(board => board.id),
  )
  const noBoardItems: BoardSource[] = []

  searchSources.forEach((source) => {
    const boardId = source.boardId
    if (!boardId || !knownBoardIds.has(boardId)) {
      noBoardItems.push(source)
      return
    }

    const items = itemsByBoardId.get(boardId) ?? []
    items.push(source)
    itemsByBoardId.set(boardId, items)
  })

  const boardGroups = boards.flatMap((board) => {
    const items = itemsByBoardId.get(board.id)
    return items?.length
      ? [{ id: board.id, name: board.name, items, targetBoardId: board.id }]
      : []
  })

  if (noBoardItems.length) {
    boardGroups.push({
      id: "no-board",
      name: "No board",
      items: noBoardItems,
      targetBoardId: ALL_BOARD_ID,
    })
  }

  return boardGroups
}

function revealCard(id: string, attemptsRemaining = 20): void {
  const card = document.querySelector<HTMLElement>(`[data-card-id="${CSS.escape(id)}"]`)
  if (card) {
    card.scrollIntoView({ behavior: "smooth", block: "center" })
    return
  }

  if (attemptsRemaining > 0) {
    window.setTimeout(revealCard, 50, id, attemptsRemaining - 1)
  }
}

function SearchSourceIcon({ source }: { source: BoardSource }): ReactNode {
  const icon = useSourceIcon(source)

  return (
    <SourceIcon
      className="shrink-0 rounded-full"
      color={source.provider.color}
      icon={icon}
      size="sm"
      title={source.metadata.title || source.provider.title}
    />
  )
}

export function SearchDialog(): ReactNode {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

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

  async function handleSelectItem(source: BoardSource, targetBoardId: string): Promise<void> {
    setOpen(false)
    await navigate({ to: "/board/$boardId", params: { boardId: targetBoardId } })
    revealCard(source.id)
  }

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

      <Dialog open={open} onOpenChange={setOpen}>
        {open && <SearchDialogContent onSelectItem={handleSelectItem} />}
      </Dialog>
    </>
  )
}

function SearchDialogContent({
  onSelectItem,
}: {
  onSelectItem: (source: BoardSource, targetBoardId: string) => void
}): ReactNode {
  const boards = useAtomValue(boardsAtom)
  const instances = useAtomValue(instancesAtom)
  const queryClient = useQueryClient()
  const { sources } = useSourceDescriptors()

  const searchSources = useMemo<BoardSource[]>(() => {
    if (!sources.length) {
      return []
    }

    const cards = buildSourceCards({
      sources,
      sourceInstances: instances,
      boardId: ALL_BOARD_ID,
    })

    return cards.ids.map(id => getSourceCard(cards, id))
  }, [sources, instances])

  const sourceQueryTargets = useMemo(
    () => searchSources.map(source => createSourceQueryTarget(
      source.sourceId,
      source,
      source.paramsValue,
    )),
    [searchSources],
  )
  const sourceQueryOptions = useMemo(
    () => sourceQueryTargets.map(target => ({
      ...getSourceQueryOptions(queryClient, target),
      enabled: false,
    })),
    [queryClient, sourceQueryTargets],
  )
  const loaderMetadata = useQueries({
    queries: sourceQueryOptions,
    combine: results => results.map(result => result.data?.metadata),
  })

  useEffect(() => {
    let isActive = true

    void Promise.all(sourceQueryTargets.map(async (target) => {
      const queryKey = getSourceQueryKey(target)
      if (queryClient.getQueryData(queryKey)) {
        return
      }

      const cached = await readPersistedSourceCache(target.sourceId, target.params)
      if (isActive && cached) {
        queryClient.setQueryData(queryKey, cached.result, { updatedAt: cached.cachedAt })
      }
    }))

    return () => {
      isActive = false
    }
  }, [queryClient, sourceQueryTargets])

  const resolvedSearchItems = useMemo(
    () => searchSources.map((source, index) => (
      applySourceLoaderMetadata(source, loaderMetadata[index])
    )),
    [loaderMetadata, searchSources],
  )

  const searchGroups = useMemo(
    () => groupSearchItems(resolvedSearchItems, boards),
    [boards, resolvedSearchItems],
  )

  return <SearchModalContent groups={searchGroups} onSelectItem={onSelectItem} />
}

export function SearchModalContent({
  groups,
  onSelectItem,
}: {
  groups: SearchGroup[]
  onSelectItem: (source: BoardSource, targetBoardId: string) => void
}): ReactNode {
  return (
    <DialogContent
      variant="themed"
      className="h-[min(32rem,calc(100vh-2rem))] w-full sm:max-w-xl"
      surfaceClassName="grid grid-rows-[auto_minmax(0,1fr)] gap-0"
    >
      <DialogHeader className="h-10 flex-row items-center gap-3 px-3 pr-12">
        <DialogTitle className="font-bold">Search cards</DialogTitle>
        <DialogDescription className="sr-only">
          Find and open cards from all boards.
        </DialogDescription>
        <kbd className="ml-auto rounded-md bg-background/25 px-1.5 py-0.5 font-sans text-[10px] font-medium text-foreground/45 ring-1 ring-foreground/10">
          {navigator.platform.includes("Mac") ? "⌘ K" : "Ctrl K"}
        </kbd>
      </DialogHeader>

      <SquircleBox
        radius="2xl"
        variant="modal-inner"
        className="min-h-0"
      >
        <Command className="size-full rounded-none bg-transparent p-0">
          <CommandInput
            autoFocus
            aria-label="Search cards"
            placeholder="Search by card, source, or board"
            wrapperClassName="p-0"
            inputGroupClassName="h-12 rounded-none border-0 border-b border-foreground/5 bg-transparent px-1 shadow-none transition-none has-[[data-slot=input-group-control]:focus-visible]:border-foreground/15 has-[[data-slot=input-group-control]:focus-visible]:ring-0"
            className="text-sm placeholder:text-foreground/40"
          />
          <CommandList className="min-h-0 max-h-none flex-1 p-2">
            <CommandEmpty className="flex h-full min-h-32 flex-col items-center justify-center gap-1 px-6 text-center">
              <span className="font-medium text-foreground">No cards found</span>
              <span className="text-xs text-muted-foreground">Try a card, source, or board name.</span>
            </CommandEmpty>
            {groups.map(group => (
              <CommandGroup
                key={group.id}
                heading={group.name}
                className="p-0 pb-2 last:pb-0 **:[[cmdk-group-heading]]:px-3 **:[[cmdk-group-heading]]:py-2"
              >
                {group.items.map((source) => {
                  const title = source.metadata.title || source.provider.title

                  return (
                    <CommandItem
                      key={source.id}
                      className="gap-3 rounded-xl px-3 py-2.5 data-[selected=true]:bg-(--search-item-active)"
                      style={{
                        "--search-item-active": `color-mix(in oklab, var(--color-${source.provider.color}-400) 18%, transparent)`,
                      } as React.CSSProperties}
                      value={source.id}
                      keywords={[
                        source.id,
                        source.provider.title,
                        source.metadata.title ?? "",
                        group.name,
                      ]}
                      onSelect={() => onSelectItem(source, group.targetBoardId)}
                    >
                      <SearchSourceIcon source={source} />
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {title}
                      </span>
                      {title !== source.provider.title && (
                        <span className="shrink-0 text-xs text-muted-foreground group-data-[selected=true]/command-item:text-foreground/55">
                          {source.provider.title}
                        </span>
                      )}
                      <kbd className="hidden shrink-0 rounded-md bg-foreground/5 px-1.5 py-0.5 font-sans text-[10px] text-foreground/45 group-data-[selected=true]/command-item:block">
                        ↵ Open
                      </kbd>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </SquircleBox>
    </DialogContent>
  )
}
