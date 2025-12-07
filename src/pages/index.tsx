import { createFileRoute } from "@tanstack/react-router"
import { Desk } from "@/components/desk"

function IndexComponent() {
  return (
    <Desk />
  )
}

export const Route = createFileRoute("/")({
  component: IndexComponent,
})
