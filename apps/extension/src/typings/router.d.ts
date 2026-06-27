import type { createRouter } from "@tanstack/react-router"

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createRouter>
  }
}
