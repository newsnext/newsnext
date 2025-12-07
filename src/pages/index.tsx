import { createFileRoute } from "@tanstack/react-router"
import { DraggableBoard } from "@/components/board/draggable-board"

function IndexComponent() {
  return (
    <DraggableBoard />
  )
}

export const Route = createFileRoute("/")({
  component: IndexComponent,
})
