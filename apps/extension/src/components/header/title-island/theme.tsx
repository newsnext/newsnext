import { ThemeSelector } from "@newsnext/ui/components/theme-selector"
import { useAtomValue, useSetAtom } from "jotai"
import { handleThemeSwitch } from "@/lib/utils/swith-theme"
import { currentBoardAtom, updateBoardAtom } from "@/store/board"

export function ThemeFeature() {
  const board = useAtomValue(currentBoardAtom)
  const updateBoard = useSetAtom(updateBoardAtom)

  if (!board) return null

  return (
    <section
      aria-label="Board color"
      className="flex size-full items-center p-3 text-foreground"
      onClick={event => event.stopPropagation()}
    >
      <div className="size-full">
        <ThemeSelector
          value={board.color}
          onValueChange={(color) => {
            const previousColor = board.color
            handleThemeSwitch(color)
            void updateBoard({
              ...board,
              color,
            }).catch((error) => {
              handleThemeSwitch(previousColor)
              console.error("Failed to update Board color", error)
            })
          }}
        />
      </div>
    </section>
  )
}
