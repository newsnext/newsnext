import { useState } from "react"
import { isMobile } from "react-device-detect"
import { MOCK_SOURCES } from "../card/mock-data"
import { DesktopBoard } from "./desktop-board"
import { MobileBoard } from "./mobile-board"

interface CardBoardProps {
  initialSourceIds?: string[]
  onSourceIdsChange?: (sourceIds: string[]) => void
  className?: string
  isScattered?: boolean
}

export function CardBoard({
  initialSourceIds = Object.keys(MOCK_SOURCES),
  onSourceIdsChange,
  className,
  isScattered,
}: CardBoardProps) {
  const [sourceIds, setSourceIds] = useState<string[]>(initialSourceIds)

  const handleSourceIdsChange = (newSourceIds: string[]) => {
    setSourceIds(newSourceIds)
    onSourceIdsChange?.(newSourceIds)
  }

  if (isMobile) {
    return <MobileBoard sourceIds={sourceIds} className={className} isScattered={isScattered} />
  }

  return (
    <DesktopBoard
      sourceIds={sourceIds}
      className={className}
      isScattered={isScattered}
      onSourceIdsChange={handleSourceIdsChange}
    />
  )
}
