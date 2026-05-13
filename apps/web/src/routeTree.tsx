import { createRoute } from "@tanstack/react-router"
import { Route as rootRoute } from "@/pages/__root"
import { BoardIdComponent } from "@/pages/boards/$boardId"
import { IndexComponent } from "@/pages/index"

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: IndexComponent,
})

const boardsBoardIdRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/boards/$boardId",
  component: BoardIdComponent,
})

export const routeTree = rootRoute.addChildren([
  indexRoute,
  boardsBoardIdRoute,
])
