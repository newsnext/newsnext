import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/boards/custom")({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/boards/custom"!</div>
}
