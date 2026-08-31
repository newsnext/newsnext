import type { Hotkey } from "@tanstack/react-hotkeys"
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
import { useNavigate } from "@tanstack/react-router"
import { useAtomValue } from "jotai"
import { useMemo, useState } from "react"
import {
  createSourceQueryTarget,
  getSourceQueryOptions,
} from "@/hooks/source-query"
import { useI18n } from "@/hooks/use-i18n"
import { useSourceDescriptors } from "@/hooks/use-source-descriptors"
import { useSourceIcon } from "@/hooks/use-source-icon"
import { revealLiveCard } from "@/lib/board"
import { DEFAULT_SHORTCUT_SETTINGS, SHORTCUT_DEFINITIONS } from "@/lib/settings"
import {
  applySourceLoaderMetadata,
  buildLiveCards,
} from "@/lib/source"
import { boardsAtom, instancesAtom } from "@/store/board"
import { shortcutSettingsAtom } from "@/store/settings"
import { PhMagnifyingGlass } from "../icons/ph"
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

function SearchShortcutHint({
  keys,
  label,
}: {
  keys: readonly string[]
  label: string
}): ReactNode {
  return (
    <span className="flex items-center gap-1.5 text-foreground/45">
      <span className="flex gap-0.5">
        {keys.map(key => (
          <kbd
            key={key}
            className="flex h-5 min-w-5 items-center justify-center rounded-md bg-foreground/5 px-1.5 font-sans text-[10px] font-medium leading-none text-foreground/60"
          >
            {key}
          </kbd>
        ))}
      </span>
      {label}
    </span>
  )
}

export function SearchDialog(): ReactNode {
  const { t } = useI18n()
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

  async function handleSelectItem(liveCard: LiveCardViewModel, targetBoardId: string): Promise<void> {
    setOpen(false)
    await navigate({ to: "/board/$boardId", params: { boardId: targetBoardId } })
    revealLiveCard(liveCard.id)
  }

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
        {open && (
          <SearchDialogContent
            onSelectItem={handleSelectItem}
            searchShortcut={shortcuts.search}
          />
        )}
      </Dialog>
    </>
  )
}

function SearchDialogContent({
  onSelectItem,
  searchShortcut,
}: {
  onSelectItem: (liveCard: LiveCardViewModel, targetBoardId: string) => void
  searchShortcut: Hotkey | null
}): ReactNode {
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

  const sourceQueryTargets = useMemo(
    () => liveCards.map(liveCard => createSourceQueryTarget(
      liveCard.sourceId,
      liveCard,
      liveCard.paramsValue,
    )),
    [liveCards],
  )
  const sourceQueryOptions = useMemo(
    () => sourceQueryTargets.map(target => ({
      ...getSourceQueryOptions(target),
      enabled: false,
    })),
    [sourceQueryTargets],
  )
  const loaderMetadata = useQueries({
    queries: sourceQueryOptions,
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
    <SearchModalContent
      groups={searchGroups}
      onSelectItem={onSelectItem}
      searchShortcut={searchShortcut}
    />
  )
}

export function SearchModalContent({
  groups,
  onSelectItem,
  searchShortcut,
}: {
  groups: SearchGroup[]
  onSelectItem: (liveCard: LiveCardViewModel, targetBoardId: string) => void
  searchShortcut: Hotkey | null
}): ReactNode {
  const { t } = useI18n()
  return (
    <ContentDialogContent
      variant="themed"
      surfaceClassName="grid-rows-[minmax(0,1fr)_auto]"
    >
      <DialogTitle className="sr-only">{t("searchLiveCards")}</DialogTitle>
      <DialogDescription className="sr-only">
        {t("searchDescription")}
      </DialogDescription>

      <SquircleBox
        radius="2xl"
        variant="modal-inner"
        className="min-h-0"
      >
        <Command className="size-full rounded-none bg-transparent p-0">
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
                      className="gap-3 rounded-xl px-3 py-2.5 data-[selected=true]:bg-theme-400/18"
                      value={`${group.id}:${liveCard.id}`}
                      keywords={[
                        liveCard.id,
                        liveCard.provider.title,
                        liveCard.metadata.title ?? "",
                        group.name,
                      ]}
                      onSelect={() => onSelectItem(liveCard, group.id)}
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
      </SquircleBox>
      <footer
        aria-label={t("searchKeyboardShortcuts")}
        className="flex min-h-8 items-center justify-between px-2 pt-2 text-[11px]"
      >
        <span className="flex items-center gap-3">
          {searchShortcut && (
            <SearchShortcutHint
              keys={[formatForDisplay(searchShortcut)]}
              label={t("search")}
            />
          )}
          <SearchShortcutHint keys={["↑", "↓"]} label={t("navigate")} />
          <SearchShortcutHint keys={["↵"]} label={t("open")} />
        </span>
        <SearchShortcutHint keys={["Esc"]} label={t("close")} />
      </footer>
    </ContentDialogContent>
  )
}
