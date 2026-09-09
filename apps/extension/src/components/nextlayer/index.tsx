import { LocalWidgetGrid } from "./local-widget-grid"

interface NextLayerProps {
  boardId: string
  onReady?: () => void
  viewReady: boolean
}

export function NextLayer({ boardId, onReady, viewReady }: NextLayerProps) {
  return (
    <>
      <h1 className="sr-only">Next Layer</h1>
      <LocalWidgetGrid
        boardId={boardId}
        onReady={onReady}
        viewReady={viewReady}
      />
    </>
  )
}
