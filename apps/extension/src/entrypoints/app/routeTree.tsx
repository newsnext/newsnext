import { createRoute } from "@tanstack/react-router"
import { Route as rootRoute } from "@/pages/__root"
import { BoardIdComponent } from "@/pages/board/$boardId"
import { IndexComponent } from "@/pages/index"

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: IndexComponent,
})

// Board renders immediately from Workspace + snapshots; Source descriptors
// resolve on demand per LiveCard so a large registry never blocks rendering.
const boardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/board/$boardId",
  component: BoardIdComponent,
})

export const routeTree = rootRoute.addChildren([
  indexRoute,
  boardRoute,
])
