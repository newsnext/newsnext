import { atom } from "jotai"

export type BoardType = "hottest" | "timeline" | "realtime"

export const currentBoardAtom = atom<BoardType>("hottest")
