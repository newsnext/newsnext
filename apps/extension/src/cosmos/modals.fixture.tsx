/* eslint-disable react-refresh/only-export-components */
import type { ComponentProps } from "react"
import type { SettingsTabId } from "@/components/settings/modal-shell"
import type { BoardSource } from "@/typings/source"
import {
  AlertDialog,
  AlertDialogAction,
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
import { SearchModalContent } from "@/components/search"
import { SettingsModalShell } from "@/components/settings/modal-shell"

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
          <DialogHeader>
            <DialogTitle>Edit source</DialogTitle>
            <DialogDescription>
              Update the display name used throughout NewsNext.
            </DialogDescription>
          </DialogHeader>
          <Input aria-label="Source name" defaultValue="Design systems" />
          <DialogFooter showCloseButton>
            <Button>Save changes</Button>
          </DialogFooter>
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
          className="absolute max-w-sm rounded-3xl bg-popover p-6 text-popover-foreground shadow-2xl"
          data-open
        >
          <ModalCloseButton type="button" />
          <div className="grid gap-2 pr-8">
            <ModalTitle className="text-lg">Shared modal foundation</ModalTitle>
            <ModalDescription>
              Overlay, popup, close control, title, and description are shared React components.
            </ModalDescription>
          </div>
          <div className="mt-6 flex justify-end">
            <Button>Continue</Button>
          </div>
        </ModalPopup>
      </section>
    </FixtureStage>
  )
}

function ThemedDialogFixture() {
  return (
    <FixtureStage>
      <Dialog defaultOpen>
        <DialogTrigger render={<Button variant="outline" />}>Open themed dialog</DialogTrigger>
        <DialogContent variant="themed" surfaceClassName="w-full max-w-lg">
          <DialogHeader className="px-4 py-3 pr-12">
            <DialogTitle>Edit board</DialogTitle>
            <DialogDescription>Preview the shared NewsNext modal surface treatment.</DialogDescription>
          </DialogHeader>
          <SquircleBox radius="2xl" variant="modal-inner" className="grid gap-4 p-6">
            <Input aria-label="Board name" defaultValue="Daily reading" />
            <DialogFooter>
              <Button variant="outline">Cancel</Button>
              <Button>Save changes</Button>
            </DialogFooter>
          </SquircleBox>
        </DialogContent>
      </Dialog>
    </FixtureStage>
  )
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
            <AlertDialogTitle>Delete this source?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the source and its cached articles. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => setOpen(false)}>
              Delete source
            </AlertDialogAction>
          </AlertDialogFooter>
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
            <AlertDialogDescription>
              Reconnect this source to continue receiving updates.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Later</AlertDialogCancel>
            <AlertDialogAction onClick={() => setOpen(false)}>Reconnect</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FixtureStage>
  )
}

export default {
  "Foundation: Shared parts": SharedModalPartsFixture,
  "Dialog: Default": DialogFixture,
  "Dialog: Themed": ThemedDialogFixture,
  "Dialog: Settings": SettingsModalFixture,
  "Dialog: Search": SearchModalFixture,
  "Alert: Default": AlertDialogFixture,
  "Alert: Compact": CompactAlertDialogFixture,
}
