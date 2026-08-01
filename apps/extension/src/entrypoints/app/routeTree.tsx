import { createRoute } from "@tanstack/react-router"
import { sourceDescriptorsQueryOptions } from "@/hooks/use-source-descriptors"
import { Route as rootRoute } from "@/pages/__root"
import { BoardIdComponent } from "@/pages/board/$boardId"
import { IndexComponent } from "@/pages/index"

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: IndexComponent,
})

const boardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/board/$boardId",
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(sourceDescriptorsQueryOptions),
  component: BoardIdComponent,
})

export const routeTree = rootRoute.addChildren([
  indexRoute,
  boardRoute,
])
