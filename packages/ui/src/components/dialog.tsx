import type { SquircleRadius } from "@newsnext/ui/components/squircle"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { Button } from "@newsnext/ui/components/button"
import {
  ModalCloseButton,
  ModalDescription,
  ModalOverlay,
  ModalPopup,
  ModalTitle,
} from "@newsnext/ui/components/modal"
import { SquircleBox } from "@newsnext/ui/components/squircle"

import { cn } from "@newsnext/ui/lib/utils"
import * as React from "react"

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={className}
      render={<ModalOverlay />}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  radius = "3xl",
  showCloseButton = true,
  surfaceClassName,
  variant = "default",
  ...props
}: DialogPrimitive.Popup.Props & {
  radius?: SquircleRadius | number
  showCloseButton?: boolean
  surfaceClassName?: string
  variant?: "default" | "themed"
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        render={(
          <ModalPopup
            className={cn(
              "max-w-[calc(100%-2rem)] text-sm text-popover-foreground sm:max-w-md",
              className,
            )}
          />
        )}
        {...props}
      >
        <SquircleBox
          radius={radius}
          variant="modal-shell"
          data-dialog-variant={variant}
          className={cn(
            "relative grid size-full ring-1 ring-foreground/5",
            surfaceClassName,
          )}
        >
          {children}
          {showCloseButton && (
            <DialogPrimitive.Close
              data-slot="dialog-close"
              render={<ModalCloseButton />}
            />
          )}
        </SquircleBox>
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>
          Close
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      render={<ModalTitle className={cn("text-base leading-none", className)} />}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      render={(
        <ModalDescription
          className={cn(
            "*:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
            className,
          )}
        />
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
