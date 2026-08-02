import { Button } from "@newsnext/ui/components/button"
import { cn } from "@newsnext/ui/lib/utils"
import { XIcon } from "@phosphor-icons/react"
import * as React from "react"

function ModalOverlay({ className, ...props }: React.ComponentProps<"div">): React.JSX.Element {
  return (
    <div
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/75 transition-opacity duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 data-starting-style:opacity-0 data-ending-style:opacity-0",
        className,
      )}
      {...props}
    />
  )
}

function ModalPopup({ className, ...props }: React.ComponentProps<"div">): React.JSX.Element {
  return (
    <div
      className={cn(
        "fixed top-1/2 left-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2 duration-100 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
        className,
      )}
      {...props}
    />
  )
}

function ModalCloseButton({ className, ...props }: React.ComponentProps<typeof Button>): React.JSX.Element {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className={cn("absolute top-4 right-4", className)}
      {...props}
    >
      <XIcon />
      <span className="sr-only">Close</span>
    </Button>
  )
}

function ModalTitle({ className, ...props }: React.ComponentProps<"h2">): React.JSX.Element {
  return <h2 className={cn("font-medium text-foreground", className)} {...props} />
}

function ModalDescription({ className, ...props }: React.ComponentProps<"p">): React.JSX.Element {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />
}

export {
  ModalCloseButton,
  ModalDescription,
  ModalOverlay,
  ModalPopup,
  ModalTitle,
}
