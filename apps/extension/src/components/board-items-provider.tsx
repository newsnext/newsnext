import type { ReactNode } from "react"
import type { BoardSourceItems } from "./board-items-context"
import { useCallback, useState } from "react"
import {
  BoardItemsContext,
  BoardItemsReportContext,
} from "./board-items-context"

export function BoardItemsProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [sourceItems, setSourceItems] = useState<Record<string, BoardSourceItems>>({})

  const reportSourceItems = useCallback((result: BoardSourceItems): void => {
    setSourceItems((current) => {
      const previous = current[result.id]
      if (previous?.card === result.card
        && previous.filter === result.filter
        && previous.items === result.items
        && previous.itemTemplate === result.itemTemplate
        && previous.isLoading === result.isLoading
        && previous.updatedAt === result.updatedAt) {
        return current
      }

      return { ...current, [result.id]: result }
    })
  }, [])

  return (
    <BoardItemsReportContext value={reportSourceItems}>
      <BoardItemsContext value={sourceItems}>
        {children}
      </BoardItemsContext>
    </BoardItemsReportContext>
  )
}
