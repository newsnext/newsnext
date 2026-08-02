/* eslint-disable react-refresh/only-export-components */
import type { SettingsTabId } from "@/components/settings/modal-shell"
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
import { SettingsModalShell } from "@/components/settings/modal-shell"

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
  "Alert: Default": AlertDialogFixture,
  "Alert: Compact": CompactAlertDialogFixture,
}
