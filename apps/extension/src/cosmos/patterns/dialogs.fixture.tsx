/* eslint-disable react-refresh/only-export-components */
import type { ComponentProps } from "react"
import type { BoardDialogTarget } from "@/components/board-dialog"
import type { SettingsTabId } from "@/components/settings/modal-shell"
import type { Board, BoardCreateInput } from "@/lib/board"
import type { LiveCardViewModel } from "@/typings/source"
import { Button } from "@newsnext/ui/components/button"
import { Dialog } from "@newsnext/ui/components/dialog"
import { useState } from "react"
import { BoardDialog } from "@/components/board-dialog"
import { SearchModalContent } from "@/components/search"
import { SettingsModalShell } from "@/components/settings/modal-shell"

const BOARD_DIALOG_BOARDS: Board[] = [
  {
    defaultView: "now",
    id: "all",
    name: "All",
    color: "slate",
    sort: { mode: "createdAt", automaticMode: "createdAt", manualOrder: [] },
  },
  {
    defaultView: "next",
    id: "board-design",
    name: "Design signals",
    color: "purple",
    sort: { mode: "provider", automaticMode: "provider", manualOrder: [] },
  },
]

function createSearchSource({
  boardId,
  color,
  id,
  providerTitle,
  title,
}: {
  boardId: string | null
  color: LiveCardViewModel["provider"]["color"]
  id: string
  providerTitle: string
  title: string
}): LiveCardViewModel {
  return {
    id,
    sourceId: id.split("::")[0] ?? id,
    collectionId: boardId,
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
    targetBoardId: "all",
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

function BoardDialogFixture({ target }: { target: BoardDialogTarget }) {
  const [open, setOpen] = useState(true)
  const [lastAction, setLastAction] = useState<string>()

  function describeBoardAction(action: string, board: Board): void {
    setLastAction(`${action} “${board.name}” · ${board.sort.mode}`)
  }

  function describeCreateAction(input: BoardCreateInput): void {
    setLastAction(`Created “${input.name}” · ${input.sortMode}`)
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
          target={target}
          onClose={() => setOpen(false)}
          onCreate={describeCreateAction}
          onDelete={(boardId, deleteLiveCards) => setLastAction(
            `Deleted ${boardId}${deleteLiveCards ? " with cards" : ""}`,
          )}
          onUpdate={board => describeBoardAction("Updated", board)}
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
            searchShortcut="Mod+K"
          />
        )}
      </Dialog>
    </FixtureStage>
  )
}

export default {
  "Board create": CreateBoardDialogFixture,
  "Board edit": EditBoardDialogFixture,
  "Settings": SettingsModalFixture,
  "Search": SearchModalFixture,
}
