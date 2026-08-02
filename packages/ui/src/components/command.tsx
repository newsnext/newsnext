"use client"

import type { CommandInputProps as CommandInputPrimitiveProps } from "@newsnext/cmdk"
import {
  CommandEmpty as CommandEmptyPrimitive,
  CommandGroup as CommandGroupPrimitive,
  CommandInput as CommandInputPrimitive,
  CommandItem as CommandItemPrimitive,
  CommandList as CommandListPrimitive,
  CommandRoot,
} from "@newsnext/cmdk"
import {
  InputGroup,
  InputGroupAddon,
} from "@newsnext/ui/components/input-group"
import { cn } from "@newsnext/ui/lib/utils"
import { MagnifyingGlassIcon } from "@phosphor-icons/react"
import * as React from "react"

function Command({
  className,
  ...props
}: React.ComponentProps<typeof CommandRoot>) {
  return (
    <CommandRoot
      data-slot="command"
      className={cn(
        "flex size-full flex-col overflow-hidden rounded-3xl bg-popover p-1 text-popover-foreground",
        className,
      )}
      {...props}
    />
  )
}

interface CommandInputProps extends CommandInputPrimitiveProps {
  inputGroupClassName?: string
  wrapperClassName?: string
}

function CommandInput({
  className,
  inputGroupClassName,
  wrapperClassName,
  ...props
}: CommandInputProps) {
  return (
    <div data-slot="command-input-wrapper" className={cn("p-1 pb-0", wrapperClassName)}>
      <InputGroup className={cn("h-9 bg-input/30", inputGroupClassName)}>
        <CommandInputPrimitive
          data-slot="command-input"
          className={cn(
            "w-full text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          {...props}
        />
        <InputGroupAddon>
          <MagnifyingGlassIcon className="size-4 shrink-0 opacity-50" />
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}

function CommandList({
  className,
  ...props
}: React.ComponentProps<typeof CommandListPrimitive>) {
  return (
    <CommandListPrimitive
      data-slot="command-list"
      className={cn(
        "no-scrollbar max-h-72 scroll-py-1 overflow-x-hidden overflow-y-auto outline-none",
        className,
      )}
      {...props}
    />
  )
}

function CommandEmpty({
  className,
  ...props
}: React.ComponentProps<typeof CommandEmptyPrimitive>) {
  return (
    <CommandEmptyPrimitive
      data-slot="command-empty"
      className={cn("py-6 text-center text-sm", className)}
      {...props}
    />
  )
}

function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandGroupPrimitive>) {
  return (
    <CommandGroupPrimitive
      data-slot="command-group"
      className={cn(
        "overflow-hidden p-1 text-foreground **:[[cmdk-group-heading]]:px-3 **:[[cmdk-group-heading]]:py-2 **:[[cmdk-group-heading]]:text-xs **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:text-muted-foreground",
        className,
      )}
      {...props}
    />
  )
}

function CommandItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof CommandItemPrimitive>) {
  return (
    <CommandItemPrimitive
      data-slot="command-item"
      className={cn(
        "relative flex cursor-default items-center gap-2 rounded-lg px-3 py-2 text-sm outline-hidden select-none in-data-[slot=dialog-content]:rounded-2xl data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-muted data-[selected=true]:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-[selected=true]:*:[svg]:text-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </CommandItemPrimitive>
  )
}

export {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
}
