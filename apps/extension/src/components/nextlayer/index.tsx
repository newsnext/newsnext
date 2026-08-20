import { DemoGrid } from "./demo-grid"

interface NextLayerProps {
  boardId: string
}

export function NextLayer({ boardId }: NextLayerProps) {
  return (
    <main className="mx-auto w-full max-w-[104.5rem]">
      <h1 className="sr-only">Next Layer</h1>
      <DemoGrid boardId={boardId} />
    </main>
  )
}
