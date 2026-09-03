import type { ReactNode } from "react"
import type { Board } from "@/lib/board"
import type { LiveCardViewModel } from "@/typings/source"
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
  ContentDialogContent,
  Dialog,
  DialogDescription,
  DialogTitle,
} from "@newsnext/ui/components/dialog"
import { SquircleBox } from "@newsnext/ui/components/squircle"
import { formatForDisplay, useHotkey } from "@tanstack/react-hotkeys"
import { useQueries } from "@tanstack/react-query"
import { useAtomValue } from "jotai"
import { useMemo, useState } from "react"
import {
  createInstanceQueryTarget,
  getSourceQueryOptions,
} from "@/hooks/source-query"
import { DndContext } from "@/hooks/use-dnd-context"
import { useI18n } from "@/hooks/use-i18n"
import { useSourceDescriptors } from "@/hooks/use-source-descriptors"
import { useSourceIcon } from "@/hooks/use-source-icon"
import { DEFAULT_SHORTCUT_SETTINGS, SHORTCUT_DEFINITIONS } from "@/lib/settings"
import {
  applySourceLoaderMetadata,
  buildLiveCards,
} from "@/lib/source"
import { cn } from "@/lib/utils"
import { boardsAtom, instancesAtom } from "@/store/board"
import { shortcutSettingsAtom } from "@/store/settings"
import { PhMagnifyingGlass } from "../icons/ph"
import { SortableLiveCard } from "../live-card/draggable-live-card"
import { SourceIcon } from "../live-card/source-icon"

interface SearchGroup {
  id: string
  name: string
  items: LiveCardViewModel[]
}

function groupSearchItems(
  liveCards: LiveCardViewModel[],
  boards: Board[],
): SearchGroup[] {
  const itemsByBoardId = new Map<string, LiveCardViewModel[]>()
  liveCards.forEach((liveCard) => {
    for (const board of boards) {
      if (board.instanceIds.includes(liveCard.id)) {
        const items = itemsByBoardId.get(board.id) ?? []
        items.push({ ...liveCard, boardId: board.id })
        itemsByBoardId.set(board.id, items)
      }
    }
  })

  return boards.flatMap((board) => {
    const items = itemsByBoardId.get(board.id)
    return items?.length
      ? [{ id: board.id, name: board.name, items }]
      : []
  })
}

function SearchLiveCardIcon({ liveCard }: { liveCard: LiveCardViewModel }): ReactNode {
  const icon = useSourceIcon(liveCard)

  return (
    <SourceIcon
      className="shrink-0 rounded-full"
      color={liveCard.provider.color}
      icon={icon}
      size="sm"
      title={liveCard.metadata.title || liveCard.provider.title}
    />
  )
}

export function SearchDialog(): ReactNode {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const shortcuts = useAtomValue(shortcutSettingsAtom)

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

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="island-pill size-10"
        title={shortcuts.search ? `${t("search")} (${formatForDisplay(shortcuts.search)})` : t("search")}
        onClick={() => setOpen(true)}
      >
        <PhMagnifyingGlass className="size-5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        {open && <SearchDialogContent />}
      </Dialog>
    </>
  )
}

function SearchDialogContent(): ReactNode {
  const boards = useAtomValue(boardsAtom)
  const instances = useAtomValue(instancesAtom)
  const { sources } = useSourceDescriptors()

  const liveCards = useMemo<LiveCardViewModel[]>(() => {
    if (!sources.length) {
      return []
    }

    return buildLiveCards({
      sources,
      instances,
      boardId: null,
    })
  }, [sources, instances])

  const instanceQueryTargets = useMemo(
    () => liveCards.map(liveCard => createInstanceQueryTarget(liveCard.id)),
    [liveCards],
  )
  const instanceQueryOptions = useMemo(
    () => instanceQueryTargets.map(target => ({
      ...getSourceQueryOptions(target),
      enabled: false,
    })),
    [instanceQueryTargets],
  )
  const loaderMetadata = useQueries({
    queries: instanceQueryOptions,
    combine: results => results.map(result => result.data?.result.metadata),
  })

  const resolvedLiveCards = useMemo(
    () => liveCards.map((liveCard, index) => (
      applySourceLoaderMetadata(liveCard, loaderMetadata[index])
    )),
    [liveCards, loaderMetadata],
  )

  const searchGroups = useMemo(
    () => groupSearchItems(resolvedLiveCards, boards),
    [boards, resolvedLiveCards],
  )

  return (
    <SearchModalContent groups={searchGroups} />
  )
}

export function SearchModalContent({
  groups,
}: {
  groups: SearchGroup[]
}): ReactNode {
  const { t } = useI18n()
  const [activeValue, setActiveValue] = useState<string>()
  const [isDragging, setIsDragging] = useState(false)
  const itemsByValue = useMemo(() => new Map<string, LiveCardViewModel>(
    groups.flatMap(group => group.items.map(liveCard => [
      `${group.id}:${liveCard.id}`,
      liveCard,
    ] as const)),
  ), [groups])
  const activeLiveCard = activeValue ? itemsByValue.get(activeValue) : undefined

  return (
    <ContentDialogContent
      className={cn(
        "h-129 sm:max-w-[51rem]",
        isDragging && "pointer-events-none opacity-0",
      )}
      overlayClassName={isDragging ? "pointer-events-none opacity-0" : undefined}
      surfaceClassName="p-0"
    >
      <DialogTitle className="sr-only">{t("searchLiveCards")}</DialogTitle>
      <DialogDescription className="sr-only">
        {t("searchDescription")}
      </DialogDescription>

      <SquircleBox
        radius="2xl"
        className="grid min-h-0 grid-cols-[25rem_26rem]"
      >
        <Command
          className="min-w-0 rounded-none bg-transparent p-0"
          onValueChange={setActiveValue}
        >
          <CommandInput
            autoFocus
            aria-label={t("searchLiveCards")}
            placeholder={t("searchPlaceholder")}
            wrapperClassName="p-0"
            inputGroupClassName="h-12 rounded-none border-0 border-b border-foreground/5 bg-transparent px-1 shadow-none transition-none has-[[data-slot=input-group-control]:focus-visible]:border-foreground/15 has-[[data-slot=input-group-control]:focus-visible]:ring-0"
            className="text-sm placeholder:text-foreground/40"
          />
          <CommandList className="min-h-0 max-h-none flex-1 p-2">
            <CommandEmpty className="flex h-full min-h-32 flex-col items-center justify-center gap-1 px-6 text-center">
              <span className="font-medium text-foreground">{t("noLiveCardsFound")}</span>
              <span className="text-xs text-muted-foreground">{t("trySearch")}</span>
            </CommandEmpty>
            {groups.map(group => (
              <CommandGroup
                key={group.id}
                heading={group.name}
                className="p-0 pb-2 last:pb-0 **:[[cmdk-group-heading]]:px-3 **:[[cmdk-group-heading]]:py-2"
              >
                {group.items.map((liveCard) => {
                  const title = liveCard.metadata.title || liveCard.provider.title

                  return (
                    <CommandItem
                      key={liveCard.id}
                      className="gap-3 rounded-xl px-3 py-2.5 hover:bg-muted"
                      value={`${group.id}:${liveCard.id}`}
                      keywords={[
                        liveCard.id,
                        liveCard.provider.title,
                        liveCard.metadata.title ?? "",
                        group.name,
                      ]}
                      onPointerMove={event => event.preventDefault()}
                    >
                      <SearchLiveCardIcon liveCard={liveCard} />
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {title}
                      </span>
                      {title !== liveCard.provider.title && (
                        <span className="shrink-0 text-xs text-muted-foreground group-data-[selected=true]/command-item:text-foreground/55">
                          {liveCard.provider.title}
                        </span>
                      )}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
        <aside
          aria-label={t("liveCard")}
          className="relative h-129 w-104 p-2 before:absolute before:inset-y-0 before:left-0 before:w-px before:bg-foreground/5"
        >
          {activeLiveCard && (
            <DndContext
              onDragStart={() => setIsDragging(true)}
              onDrop={() => setIsDragging(false)}
            >
              <SortableLiveCard
                key={activeLiveCard.id}
                eager
                source={activeLiveCard}
                className="overflow-hidden rounded-3xl"
              />
            </DndContext>
          )}
        </aside>
      </SquircleBox>
    </ContentDialogContent>
  )
}
