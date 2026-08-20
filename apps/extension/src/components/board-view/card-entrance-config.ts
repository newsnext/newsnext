import type { CSSProperties } from "react"

export const CARD_ENTRANCE_DURATION_SECONDS = 0.2
export const CARD_ENTRANCE_STAGGER_SECONDS = 0.06

type CardEntranceStyle = CSSProperties & {
  "--card-entrance-delay": string
  "--card-entrance-duration": string
}

export function getCardEntranceStyle(index: number): CardEntranceStyle {
  return {
    "--card-entrance-delay": `${index * CARD_ENTRANCE_STAGGER_SECONDS}s`,
    "--card-entrance-duration": `${CARD_ENTRANCE_DURATION_SECONDS}s`,
  }
}
