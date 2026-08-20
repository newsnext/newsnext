import { ThemeSelector } from "@newsnext/ui/components/theme-selector"
import { useAtomValue, useSetAtom } from "jotai"
import { getBoardColor } from "@/lib/board"
import { handleThemeSwitch } from "@/lib/utils/swith-theme"
import { boardsAtom, updateBoardAtom } from "@/store/board"
import { currentBoardIdAtom } from "@/store/settings"

export function ThemeFeature() {
  const boards = useAtomValue(boardsAtom)
  const currentBoardId = useAtomValue(currentBoardIdAtom)
  const updateBoard = useSetAtom(updateBoardAtom)
  const board = boards.find(candidate => candidate.id === currentBoardId)

  if (!board) return null

  return (
    <section
      aria-label="Board color"
      className="flex size-full items-center p-3 text-foreground"
      onClick={event => event.stopPropagation()}
    >
      <div className="size-full">
        <ThemeSelector
          value={getBoardColor(board)}
          onValueChange={(color) => {
            const previousColor = getBoardColor(board)
            handleThemeSwitch(color)
            void updateBoard({ ...board, color }).catch((error) => {
              handleThemeSwitch(previousColor)
              console.error("Failed to update Board color", error)
            })
          }}
        />
      </div>
    </section>
  )
}
