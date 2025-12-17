import type { BoardType } from "@newsnext/shared/types"
import { atom } from "jotai"

export type { BoardType }

export const currentBoardAtom = atom<BoardType>("hottest")
