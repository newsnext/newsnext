import type { Router } from "@tanstack/react-router"
import type { routeTree } from "@/entrypoints/app/routeTree"

declare module "@tanstack/react-router" {
  interface Register {
    router: Router<typeof routeTree>
  }
}
