import { DemoGrid } from "./demo-grid"

interface NextLayerProps {
  boardId: string
  entranceReady: boolean
}

export function NextLayer({ boardId, entranceReady }: NextLayerProps) {
  return (
    <>
      <h1 className="sr-only">Next Layer</h1>
      <DemoGrid
        boardId={boardId}
        entranceReady={entranceReady}
      />
    </>
  )
}
