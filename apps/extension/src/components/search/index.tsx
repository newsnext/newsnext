import type { ReactNode } from "react"
import type { Board } from "@/lib/board"
import type { CollectionEntry } from "@/lib/collection"
import type { CardViewModel } from "@/typings/source"
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
  DialogTitle,
} from "@newsnext/ui/components/dialog"
import { SquircleBox } from "@newsnext/ui/components/squircle"
import { formatForDisplay, useHotkey } from "@tanstack/react-hotkeys"
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
import { ALL_BOARD_ID } from "@/lib/board"
import { DEFAULT_SHORTCUT_SETTINGS, SHORTCUT_DEFINITIONS } from "@/lib/settings"
import {
  applySourceLoaderMetadata,
  buildSourceCards,
  getSourceCard,
  readPersistedSourceCache,
} from "@/lib/source"
import { boardsAtom, collectionEntriesAtom, instancesAtom } from "@/store/board"
import { shortcutSettingsAtom } from "@/store/settings"
import { SourceIcon } from "../card/source-icon"
import { PhMagnifyingGlass } from "../icons/ph"

interface SearchGroup {
  id: string
  name: string
  items: CardViewModel[]
  targetBoardId: string
}

function groupSearchItems(
  searchSources: CardViewModel[],
  boards: Board[],
  collectionEntries: CollectionEntry[],
): SearchGroup[] {
  const itemsByBoardId = new Map<string, CardViewModel[]>()
  const knownBoardIds = new Set(
    boards.filter(board => board.id !== ALL_BOARD_ID).map(board => board.id),
  )
  const noBoardItems: CardViewModel[] = []
  const collectionIdsByInstance = new Map<string, string[]>()
  for (const entry of collectionEntries) {
    const collectionIds = collectionIdsByInstance.get(entry.instanceId) ?? []
    collectionIds.push(entry.collectionId)
    collectionIdsByInstance.set(entry.instanceId, collectionIds)
  }

  searchSources.forEach((source) => {
    const collectionIds = (collectionIdsByInstance.get(source.id) ?? [])
      .filter(collectionId => knownBoardIds.has(collectionId))
    if (collectionIds.length === 0) {
      noBoardItems.push(source)
      return
    }

    for (const collectionId of collectionIds) {
      const items = itemsByBoardId.get(collectionId) ?? []
      items.push({ ...source, collectionId })
      itemsByBoardId.set(collectionId, items)
    }
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

function SearchSourceIcon({ source }: { source: CardViewModel }): ReactNode {
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
  const shortcuts = useAtomValue(shortcutSettingsAtom)
  const navigate = useNavigate()

  useHotkey(
    shortcuts.search ?? DEFAULT_SHORTCUT_SETTINGS.search,
    () => setOpen(prev => !prev),
    {
      enabled: shortcuts.search !== null,
      meta: {
        name: SHORTCUT_DEFINITIONS.search.label,
        description: SHORTCUT_DEFINITIONS.search.description,
      },
      requireReset: true,
    },
  )

  async function handleSelectItem(source: CardViewModel, targetBoardId: string): Promise<void> {
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
        className="island-pill size-10"
        title={shortcuts.search ? `Search (${formatForDisplay(shortcuts.search)})` : "Search"}
        onClick={() => setOpen(true)}
      >
        <PhMagnifyingGlass className="size-5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        {open && (
          <SearchDialogContent
            onSelectItem={handleSelectItem}
          />
        )}
      </Dialog>
    </>
  )
}

function SearchDialogContent({
  onSelectItem,
}: {
  onSelectItem: (source: CardViewModel, targetBoardId: string) => void
}): ReactNode {
  const boards = useAtomValue(boardsAtom)
  const collectionEntries = useAtomValue(collectionEntriesAtom)
  const instances = useAtomValue(instancesAtom)
  const queryClient = useQueryClient()
  const { sources } = useSourceDescriptors()

  const searchSources = useMemo<CardViewModel[]>(() => {
    if (!sources.length) {
      return []
    }

    const cards = buildSourceCards({
      sources,
      sourceInstances: instances,
      collectionId: null,
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

      const cachedResult = await readPersistedSourceCache(target.sourceId, target.params)
      if (isActive && cachedResult) {
        queryClient.setQueryData(queryKey, cachedResult, { updatedAt: cachedResult.updatedAt })
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
    () => groupSearchItems(resolvedSearchItems, boards, collectionEntries),
    [boards, collectionEntries, resolvedSearchItems],
  )

  return (
    <SearchModalContent
      groups={searchGroups}
      onSelectItem={onSelectItem}
    />
  )
}

export function SearchModalContent({
  groups,
  onSelectItem,
}: {
  groups: SearchGroup[]
  onSelectItem: (source: CardViewModel, targetBoardId: string) => void
}): ReactNode {
  return (
    <DialogContent
      variant="themed"
      className="h-[min(32rem,calc(100vh-2rem))] w-full sm:max-w-xl"
      surfaceClassName="grid-rows-[minmax(0,1fr)]"
    >
      <DialogTitle className="sr-only">Search cards</DialogTitle>
      <DialogDescription className="sr-only">
        Find and open cards from all boards.
      </DialogDescription>

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
                      value={`${group.id}:${source.id}`}
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
