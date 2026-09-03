"use client"

import type * as React from "react"
import type {
  CommandItemRegistration,
  RankedCommandItems,
} from "./command-ranking"
import {
  createContext,
  use,
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useState,
} from "react"
import { rankCommandItems } from "./command-ranking"

/*
 * The command interaction model is adapted from cmdk 1.1.1.
 *
 * MIT License
 * Copyright (c) 2022 Paco Coursey
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

interface CommandContextValue extends RankedCommandItems {
  inputId: string
  listId: string
  search: string
  selectedId?: string
  registerItem: (item: CommandItemRegistration) => () => void
  selectItem: (id: string) => void
  setSearch: (search: string) => void
}

interface GroupContextValue {
  id: string
}

interface CommandRootProps extends React.ComponentPropsWithoutRef<"div"> {
  children?: React.ReactNode
  onValueChange?: (value: string | undefined) => void
}

interface CommandInputProps extends Omit<
  React.ComponentPropsWithoutRef<"input">,
  "defaultValue" | "onChange" | "type" | "value"
> {}

interface CommandListProps extends React.ComponentPropsWithoutRef<"div"> {
  label?: string
}

interface CommandGroupProps extends Omit<React.ComponentPropsWithoutRef<"div">, "value"> {
  heading: React.ReactNode
}

interface CommandItemProps extends Omit<React.ComponentPropsWithoutRef<"div">, "onSelect"> {
  value: string
  keywords?: string[]
  disabled?: boolean
  onSelect?: (value: string) => void
}

const CommandContext = createContext<CommandContextValue | undefined>(undefined)
const GroupContext = createContext<GroupContextValue | undefined>(undefined)

function useCommandContext(): CommandContextValue {
  const context = use(CommandContext)
  if (!context) {
    throw new Error("Command components must be rendered inside CommandRoot.")
  }
  return context
}

function CommandRoot({ children, onKeyDown, onValueChange, ...props }: CommandRootProps): React.JSX.Element {
  const inputId = useId()
  const listId = useId()
  const [items, setItems] = useState<Map<string, CommandItemRegistration>>(() => new Map())
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState<string>()
  const rankedItems = useMemo(() => rankCommandItems([...items.values()], search), [items, search])
  const activeSelectedId = selectedId && rankedItems.orderedEnabledIds.includes(selectedId)
    ? selectedId
    : rankedItems.orderedEnabledIds[0]
  const activeValue = activeSelectedId
    ? items.get(activeSelectedId)?.value
    : undefined

  const registerItem = useCallback((item: CommandItemRegistration) => {
    setItems((currentItems) => {
      const currentItem = currentItems.get(item.id)
      if (
        currentItem?.value === item.value
        && currentItem.disabled === item.disabled
        && currentItem.groupId === item.groupId
        && currentItem.keywords.join("\0") === item.keywords.join("\0")
      ) {
        return currentItems
      }

      const nextItems = new Map(currentItems)
      nextItems.set(item.id, item)
      return nextItems
    })

    return () => {
      setItems((currentItems) => {
        if (!currentItems.has(item.id)) {
          return currentItems
        }
        const nextItems = new Map(currentItems)
        nextItems.delete(item.id)
        return nextItems
      })
    }
  }, [])

  useLayoutEffect(() => {
    if (!activeSelectedId) {
      return
    }
    const item = document.getElementById(activeSelectedId)
    const group = item?.closest<HTMLElement>("[cmdk-group]")
    if (group?.querySelector("[cmdk-item]") === item) {
      group.querySelector("[cmdk-group-heading]")?.scrollIntoView({ block: "nearest" })
    }
    item?.scrollIntoView({ block: "nearest" })
  }, [activeSelectedId])

  useLayoutEffect(() => {
    onValueChange?.(activeValue)
  }, [activeValue, onValueChange])

  function moveSelection(change: 1 | -1): void {
    const { orderedEnabledIds } = rankedItems
    const currentIndex = activeSelectedId ? orderedEnabledIds.indexOf(activeSelectedId) : -1
    const nextIndex = Math.min(Math.max(currentIndex + change, 0), orderedEnabledIds.length - 1)
    setSelectedId(orderedEnabledIds[nextIndex])
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
    onKeyDown?.(event)
    if (event.defaultPrevented || event.nativeEvent.isComposing || event.keyCode === 229) {
      return
    }

    if (event.key === "ArrowDown" || (event.ctrlKey && (event.key === "n" || event.key === "j"))) {
      event.preventDefault()
      moveSelection(1)
    } else if (event.key === "ArrowUp" || (event.ctrlKey && (event.key === "p" || event.key === "k"))) {
      event.preventDefault()
      moveSelection(-1)
    } else if (event.key === "Home") {
      event.preventDefault()
      setSelectedId(rankedItems.orderedEnabledIds[0])
    } else if (event.key === "End") {
      event.preventDefault()
      setSelectedId(rankedItems.orderedEnabledIds.at(-1))
    } else if (event.key === "Enter" && activeSelectedId) {
      event.preventDefault()
      document.getElementById(activeSelectedId)?.click()
    }
  }

  const context = useMemo<CommandContextValue>(() => ({
    ...rankedItems,
    inputId,
    listId,
    registerItem,
    search,
    selectedId: activeSelectedId,
    selectItem: setSelectedId,
    setSearch,
  }), [activeSelectedId, inputId, listId, rankedItems, registerItem, search])

  return (
    <CommandContext value={context}>
      <div tabIndex={-1} cmdk-root="" onKeyDown={handleKeyDown} {...props}>
        {children}
      </div>
    </CommandContext>
  )
}

function CommandInput(props: CommandInputProps): React.JSX.Element {
  const { inputId, listId, search, selectedId, setSearch } = useCommandContext()
  return (
    <input
      {...props}
      id={inputId}
      type="text"
      role="combobox"
      cmdk-input=""
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      aria-autocomplete="list"
      aria-controls={listId}
      aria-expanded
      aria-activedescendant={selectedId}
      value={search}
      onChange={event => setSearch(event.target.value)}
    />
  )
}

function CommandList({ children, label = "Suggestions", ...props }: CommandListProps): React.JSX.Element {
  const { listId, selectedId } = useCommandContext()
  return (
    <div
      {...props}
      id={listId}
      cmdk-list=""
      role="listbox"
      tabIndex={-1}
      aria-label={label}
      aria-activedescendant={selectedId}
    >
      <div cmdk-list-sizer="" className="flex flex-col">
        {children}
      </div>
    </div>
  )
}

function CommandEmpty(props: React.ComponentPropsWithoutRef<"div">): React.JSX.Element | null {
  const { visibleIds } = useCommandContext()
  return visibleIds.size === 0
    ? <div {...props} cmdk-empty="" role="presentation" />
    : null
}

function CommandGroup({ children, heading, style, ...props }: CommandGroupProps): React.JSX.Element {
  const id = useId()
  const headingId = useId()
  const { groupOrder } = useCommandContext()
  const order = groupOrder.get(id)

  return (
    <div
      {...props}
      cmdk-group=""
      role="presentation"
      hidden={order === undefined}
      style={{ ...style, order }}
    >
      <div cmdk-group-heading="" aria-hidden id={headingId}>{heading}</div>
      <div cmdk-group-items="" role="group" aria-labelledby={headingId} className="flex flex-col">
        <GroupContext value={{ id }}>{children}</GroupContext>
      </div>
    </div>
  )
}

function CommandItem({
  children,
  disabled = false,
  keywords = [],
  onClick,
  onPointerMove,
  onSelect,
  style,
  value,
  ...props
}: CommandItemProps): React.JSX.Element | null {
  const id = useId()
  const group = use(GroupContext)
  const { itemOrder, registerItem, selectItem, selectedId, visibleIds } = useCommandContext()
  const keywordKey = keywords.join("\0")
  const normalizedValue = value.trim()

  useLayoutEffect(() => registerItem({
    id,
    value: normalizedValue,
    keywords: keywordKey ? keywordKey.split("\0").map(keyword => keyword.trim()) : [],
    groupId: group?.id,
    disabled,
  }), [disabled, group?.id, id, keywordKey, normalizedValue, registerItem])

  if (!visibleIds.has(id)) {
    return null
  }

  const selected = selectedId === id
  return (
    <div
      {...props}
      id={id}
      cmdk-item=""
      role="option"
      aria-disabled={disabled}
      aria-selected={selected}
      data-disabled={disabled}
      data-selected={selected}
      data-value={normalizedValue}
      style={{ ...style, order: itemOrder.get(id) }}
      onPointerMove={disabled
        ? undefined
        : (event) => {
            onPointerMove?.(event)
            if (!event.defaultPrevented) {
              selectItem(id)
            }
          }}
      onClick={disabled
        ? undefined
        : (event) => {
            onClick?.(event)
            if (!event.defaultPrevented) {
              selectItem(id)
              onSelect?.(normalizedValue)
            }
          }}
    >
      {children}
    </div>
  )
}

export {
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandRoot,
}
export type {
  CommandGroupProps,
  CommandInputProps,
  CommandItemProps,
  CommandListProps,
  CommandRootProps,
}
