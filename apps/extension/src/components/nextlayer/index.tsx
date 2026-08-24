import { LocalWidgetGrid } from "./local-widget-grid"

interface NextLayerProps {
  boardId: string
  entranceReady: boolean
}

export function NextLayer({ boardId, entranceReady }: NextLayerProps) {
  return (
    <>
      <h1 className="sr-only">Next Layer</h1>
      <LocalWidgetGrid
        boardId={boardId}
        entranceReady={entranceReady}
      />
    </>
  )
}
