import { LocalWidgetGrid } from "./local-widget-grid"

interface NextLayerProps {
  boardId: string
  viewReady: boolean
}

export function NextLayer({ boardId, viewReady }: NextLayerProps) {
  return (
    <>
      <h1 className="sr-only">Next Layer</h1>
      <LocalWidgetGrid
        boardId={boardId}
        viewReady={viewReady}
      />
    </>
  )
}
