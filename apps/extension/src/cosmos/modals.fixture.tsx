/* eslint-disable react-refresh/only-export-components */
import type { ComponentProps } from "react"
import type { BoardDialogTarget } from "@/components/board-dialog"
import type { SettingsTabId } from "@/components/settings/modal-shell"
import type { BoardSortMode, BoardSortPreference } from "@/lib/board-sorting"
import type { Board } from "@/lib/boards"
import type { BoardSource } from "@/typings/source"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogBody,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@newsnext/ui/components/alert-dialog"
import { Button } from "@newsnext/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@newsnext/ui/components/dialog"
import { Input } from "@newsnext/ui/components/input"
import {
  ModalCloseButton,
  ModalDescription,
  ModalOverlay,
  ModalPopup,
  ModalTitle,
} from "@newsnext/ui/components/modal"
import { SquircleBox } from "@newsnext/ui/components/squircle"
import { CircleAlert } from "lucide-react"
import { useState } from "react"
import { BoardDialog } from "@/components/board-dialog"
import { SearchModalContent } from "@/components/search"
import { SettingsModalShell } from "@/components/settings/modal-shell"

const BOARD_DIALOG_BOARDS: Board[] = [
  { id: "inbox", name: "All", color: "slate" },
  { id: "board-design", name: "Design signals", color: "violet" },
]

const BOARD_DIALOG_PREFERENCES: Record<string, BoardSortPreference> = {
  "board-design": {
    mode: "provider",
    automaticMode: "provider",
    manualOrder: [],
  },
}

function createSearchSource({
  boardId,
  color,
  id,
  providerTitle,
  title,
}: {
  boardId: string | null
  color: BoardSource["provider"]["color"]
  id: string
  providerTitle: string
  title: string
}): BoardSource {
  return {
    id,
    sourceId: id.split("::")[0] ?? id,
    boardId,
    provider: {
      title: providerTitle,
      category: "developer",
      color,
    },
    metadata: { title },
    capabilities: { network: [], cookies: [] },
    cache: { version: 1, maxAge: "5m" },
  }
}

const SEARCH_GROUPS = [
  {
    id: "board-ai",
    name: "AI",
    targetBoardId: "board-ai",
    items: [
      createSearchSource({
        id: "reddit:subreddit::cosmos-codex",
        boardId: "board-ai",
        title: "r/codex",
        providerTitle: "Reddit",
        color: "orange",
      }),
      createSearchSource({
        id: "rss:feed::cosmos-ai-hot",
        boardId: "board-ai",
        title: "AI HOT — All AI updates",
        providerTitle: "RSS",
        color: "orange",
      }),
      createSearchSource({
        id: "x:user::cosmos-tibo",
        boardId: "board-ai",
        title: "Tibo@thsottiaux",
        providerTitle: "X",
        color: "slate",
      }),
    ],
  },
  {
    id: "board-reading",
    name: "Reading",
    targetBoardId: "board-reading",
    items: [
      createSearchSource({
        id: "hackernews:top::cosmos-hn",
        boardId: "board-reading",
        title: "Hacker News",
        providerTitle: "Hacker News",
        color: "orange",
      }),
      createSearchSource({
        id: "github:trending::cosmos-github",
        boardId: "board-reading",
        title: "Trending repositories",
        providerTitle: "GitHub",
        color: "slate",
      }),
    ],
  },
  {
    id: "no-board",
    name: "No board",
    targetBoardId: "inbox",
    items: [
      createSearchSource({
        id: "rss:feed::cosmos-v2ex",
        boardId: null,
        title: "V2EX - Creative",
        providerTitle: "RSS",
        color: "orange",
      }),
    ],
  },
] satisfies ComponentProps<typeof SearchModalContent>["groups"]

function FixtureStage({ children }: React.PropsWithChildren) {
  return <main className="grid min-h-full place-items-center p-8">{children}</main>
}

function DialogFixture() {
  return (
    <FixtureStage>
      <Dialog defaultOpen>
        <DialogTrigger render={<Button variant="outline" />}>Open dialog</DialogTrigger>
        <DialogContent>
          <DialogHeader className="min-h-10 justify-center px-4 py-3 pr-12">
            <DialogTitle>Edit source</DialogTitle>
          </DialogHeader>
          <SquircleBox radius="2xl" variant="modal-inner" className="grid gap-6 p-6">
            <DialogDescription>
              Update the display name used throughout NewsNext.
            </DialogDescription>
            <Input aria-label="Source name" defaultValue="Design systems" />
            <DialogFooter showCloseButton>
              <Button>Save changes</Button>
            </DialogFooter>
          </SquircleBox>
        </DialogContent>
      </Dialog>
    </FixtureStage>
  )
}

function SharedModalPartsFixture() {
  return (
    <FixtureStage>
      <section className="relative isolate h-96 w-full max-w-2xl overflow-hidden rounded-3xl border bg-card">
        <ModalOverlay className="absolute rounded-3xl" data-open />
        <ModalPopup
          className="absolute max-w-sm text-popover-foreground"
          data-open
        >
          <SquircleBox radius="3xl" variant="modal-shell" className="relative ring-1 ring-foreground/5">
            <ModalCloseButton type="button" />
            <div className="px-4 py-3 pr-12">
              <ModalTitle className="text-base leading-none">Shared modal foundation</ModalTitle>
            </div>
            <SquircleBox radius="2xl" variant="modal-inner" className="grid gap-6 p-6">
              <ModalDescription>
                Shared overlay, motion, shell, inner surface, and close control.
              </ModalDescription>
              <div className="flex justify-end">
                <Button>Continue</Button>
              </div>
            </SquircleBox>
          </SquircleBox>
        </ModalPopup>
      </section>
    </FixtureStage>
  )
}

function BoardDialogFixture({ target }: { target: BoardDialogTarget }) {
  const [open, setOpen] = useState(true)
  const [lastAction, setLastAction] = useState<string>()

  function describeBoardAction(action: string, board: Board, sortMode: BoardSortMode): void {
    setLastAction(`${action} “${board.name}” · ${sortMode}`)
  }

  return (
    <FixtureStage>
      <div className="grid justify-items-center gap-3">
        <Button variant="outline" onClick={() => setOpen(true)}>
          Open board dialog
        </Button>
        {lastAction && <p className="text-sm text-muted-foreground">{lastAction}</p>}
      </div>
      {open && (
        <BoardDialog
          boards={BOARD_DIALOG_BOARDS}
          currentBoardId="board-design"
          preferences={BOARD_DIALOG_PREFERENCES}
          target={target}
          onClose={() => setOpen(false)}
          onCreate={(board, sortMode) => describeBoardAction("Created", board, sortMode)}
          onDelete={boardId => setLastAction(`Deleted ${boardId}`)}
          onUpdate={(board, sortMode) => describeBoardAction("Updated", board, sortMode)}
        />
      )}
    </FixtureStage>
  )
}

function CreateBoardDialogFixture() {
  return <BoardDialogFixture target={{ mode: "create" }} />
}

function EditBoardDialogFixture() {
  return <BoardDialogFixture target={{ mode: "edit", boardId: "board-design" }} />
}

function SettingsModalFixture() {
  const [open, setOpen] = useState(true)
  const [activeTab, setActiveTab] = useState<SettingsTabId>("appearance")

  return (
    <FixtureStage>
      <Button variant="outline" onClick={() => setOpen(true)}>Open settings</Button>
      <SettingsModalShell
        activeTab={activeTab}
        open={open}
        onOpenChange={setOpen}
        onTabChange={setActiveTab}
      />
    </FixtureStage>
  )
}

function SearchModalFixture() {
  const [open, setOpen] = useState(true)
  const [lastOpenedTitle, setLastOpenedTitle] = useState<string>()

  return (
    <FixtureStage>
      <div className="grid justify-items-center gap-3">
        <Button variant="outline" onClick={() => setOpen(true)}>
          Open search
        </Button>
        {lastOpenedTitle && (
          <p className="text-sm text-muted-foreground">
            Opened
            {lastOpenedTitle}
          </p>
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        {open && (
          <SearchModalContent
            groups={SEARCH_GROUPS}
            onSelectItem={(source) => {
              setLastOpenedTitle(source.metadata.title || source.provider.title)
              setOpen(false)
            }}
          />
        )}
      </Dialog>
    </FixtureStage>
  )
}

function AlertDialogFixture() {
  const [open, setOpen] = useState(true)

  return (
    <FixtureStage>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger render={<Button variant="destructive" />}>Delete source</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <CircleAlert />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete this source?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogBody>
            <AlertDialogDescription>
              This removes the source and its cached articles. This action cannot be undone.
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={() => setOpen(false)}>
                Delete source
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogBody>
        </AlertDialogContent>
      </AlertDialog>
    </FixtureStage>
  )
}

function CompactAlertDialogFixture() {
  const [open, setOpen] = useState(true)

  return (
    <FixtureStage>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger render={<Button variant="outline" />}>Reconnect source</AlertDialogTrigger>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia>
              <CircleAlert />
            </AlertDialogMedia>
            <AlertDialogTitle>Connection expired</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogBody>
            <AlertDialogDescription>
              Reconnect this source to continue receiving updates.
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel>Later</AlertDialogCancel>
              <AlertDialogAction onClick={() => setOpen(false)}>Reconnect</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogBody>
        </AlertDialogContent>
      </AlertDialog>
    </FixtureStage>
  )
}

export default {
  "Foundation: Shared parts": SharedModalPartsFixture,
  "Dialog: Default": DialogFixture,
  "Dialog: Board create": CreateBoardDialogFixture,
  "Dialog: Board edit": EditBoardDialogFixture,
  "Dialog: Settings": SettingsModalFixture,
  "Dialog: Search": SearchModalFixture,
  "Alert: Default": AlertDialogFixture,
  "Alert: Compact": CompactAlertDialogFixture,
}
