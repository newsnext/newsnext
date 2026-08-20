import { DemoGrid } from "./demo-grid"

interface NextLayerProps {
  boardId: string
}

export function NextLayer({ boardId }: NextLayerProps) {
  return (
    <>
      <h1 className="sr-only">Next Layer</h1>
      <DemoGrid boardId={boardId} />
    </>
  )
}
