"use client"

import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog"
import { Button } from "@newsnext/ui/components/button"
import {
  ModalDescription,
  ModalOverlay,
  ModalPopup,
  ModalTitle,
} from "@newsnext/ui/components/modal"
import { SquircleBox } from "@newsnext/ui/components/squircle"

import { cn } from "@newsnext/ui/lib/utils"
import * as React from "react"

function AlertDialog({ ...props }: AlertDialogPrimitive.Root.Props) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />
}

function AlertDialogTrigger({ ...props }: AlertDialogPrimitive.Trigger.Props) {
  return (
    <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
  )
}

function AlertDialogPortal({ ...props }: AlertDialogPrimitive.Portal.Props) {
  return (
    <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
  )
}

function AlertDialogOverlay({
  className,
  ...props
}: AlertDialogPrimitive.Backdrop.Props) {
  return (
    <AlertDialogPrimitive.Backdrop
      data-slot="alert-dialog-overlay"
      className={className}
      render={<ModalOverlay />}
      {...props}
    />
  )
}

function AlertDialogContent({
  className,
  children,
  size = "default",
  ...props
}: AlertDialogPrimitive.Popup.Props & {
  size?: "default" | "sm"
}) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Popup
        data-slot="alert-dialog-content"
        data-size={size}
        render={(
          <ModalPopup
            className={cn(
              "group/alert-dialog-content max-w-[calc(100%-2rem)] text-popover-foreground data-[size=sm]:max-w-xs data-[size=default]:sm:max-w-md",
              className,
            )}
          />
        )}
        {...props}
      >
        <SquircleBox radius="3xl" variant="modal-shell" className="relative grid ring-1 ring-foreground/5">
          {children}
        </SquircleBox>
      </AlertDialogPrimitive.Popup>
    </AlertDialogPortal>
  )
}

function AlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn(
        "grid min-h-10 grid-cols-[auto_minmax(0,1fr)] items-center gap-2 px-4 py-3 text-left [&:not(:has([data-slot=alert-dialog-media]))]:grid-cols-1",
        className,
      )}
      {...props}
    />
  )
}

function AlertDialogBody({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <SquircleBox
      radius="2xl"
      variant="modal-inner"
      data-slot="alert-dialog-body"
      className={cn("grid gap-6 p-6", className)}
      {...props}
    />
  )
}

function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 group-data-[size=sm]/alert-dialog-content:grid group-data-[size=sm]/alert-dialog-content:grid-cols-2 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  )
}

function AlertDialogMedia({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <SquircleBox
      radius="xl"
      data-slot="alert-dialog-media"
      className={cn(
        "inline-flex size-7 items-center justify-center bg-background/25 text-foreground/65 *:[svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  )
}

function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      render={(
        <ModalTitle
          className={cn(
            "text-base leading-none font-semibold group-has-data-[slot=alert-dialog-media]/alert-dialog-content:col-start-2",
            className,
          )}
        />
      )}
      {...props}
    />
  )
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      render={(
        <ModalDescription
          className={cn(
            "text-pretty *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
            className,
          )}
        />
      )}
      {...props}
    />
  )
}

function AlertDialogAction({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      data-slot="alert-dialog-action"
      className={className}
      {...props}
    />
  )
}

function AlertDialogCancel({
  className,
  variant = "outline",
  size = "default",
  ...props
}: AlertDialogPrimitive.Close.Props
  & Pick<React.ComponentProps<typeof Button>, "variant" | "size">) {
  return (
    <AlertDialogPrimitive.Close
      data-slot="alert-dialog-cancel"
      className={className}
      render={<Button variant={variant} size={size} />}
      {...props}
    />
  )
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogBody,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
}
