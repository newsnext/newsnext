import { createFileRoute } from "@tanstack/react-router"

function IndexComponent() {
  return (
    <div className="">
      <h1>Index</h1>
    </div>
  )
}

export const Route = createFileRoute("/")({
  component: IndexComponent,
})
