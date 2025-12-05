import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/boards/$boardId")({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/boards/$boardId"!</div>
}
