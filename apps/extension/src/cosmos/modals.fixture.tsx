/* eslint-disable react-refresh/only-export-components */
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
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
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@newsnext/ui/components/drawer"
import { Input } from "@newsnext/ui/components/input"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@newsnext/ui/components/sheet"
import { useState } from "react"

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

function BottomDrawerFixture() {
  return (
    <FixtureStage>
      <Drawer defaultOpen>
        <DrawerTrigger asChild>
          <Button variant="outline">Open drawer</Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Move to board</DrawerTitle>
            <DrawerDescription>Choose where this source should appear.</DrawerDescription>
          </DrawerHeader>
          <div className="grid gap-2 px-4">
            <Button variant="secondary">Daily reading</Button>
            <Button variant="ghost">Product research</Button>
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </FixtureStage>
  )
}

function RightSheetFixture() {
  return (
    <FixtureStage>
      <Sheet defaultOpen>
        <SheetTrigger render={<Button variant="outline" />}>Open sheet</SheetTrigger>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Source details</SheetTitle>
            <SheetDescription>Inspect and update source configuration.</SheetDescription>
          </SheetHeader>
          <div className="grid gap-3 px-6">
            <Input aria-label="Source URL" defaultValue="https://example.com/feed.xml" />
            <Input aria-label="Refresh interval" defaultValue="30 minutes" />
          </div>
          <SheetFooter>
            <Button>Save</Button>
            <SheetClose render={<Button variant="outline" />}>Cancel</SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </FixtureStage>
  )
}

export default {
  "Dialog": DialogFixture,
  "Alert dialog": AlertDialogFixture,
  "Bottom drawer": BottomDrawerFixture,
  "Right sheet": RightSheetFixture,
}
