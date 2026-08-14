import type { SourceItemTemplate } from "@newsnext/source/types"
import type { BoardFilter } from "@/lib/board"
import type { CardViewModel, NewsItem } from "@/typings/source"
import { createContext, use } from "react"

export interface BoardSourceItems {
  card: CardViewModel
  filter?: BoardFilter
  id: string
  items: NewsItem[]
  itemTemplate?: SourceItemTemplate
  isLoading: boolean
  updatedAt: number
}

export type ReportBoardSourceItems = (result: BoardSourceItems) => void

export const BoardItemsContext = createContext<Record<string, BoardSourceItems>>({})
export const BoardItemsReportContext = createContext<ReportBoardSourceItems | null>(null)

export function useBoardItems(): Record<string, BoardSourceItems> {
  return use(BoardItemsContext)
}

export function useReportBoardSourceItems(): ReportBoardSourceItems | null {
  return use(BoardItemsReportContext)
}
