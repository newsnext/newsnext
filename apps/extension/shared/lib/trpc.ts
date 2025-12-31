import type { AppRouter } from "@newsnext/api/trpc"
import { createTRPCReact } from "@trpc/react-query"

export const trpc = createTRPCReact<AppRouter>()
