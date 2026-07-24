import { lazy } from "react"

export const TanStackDevtools
  = import.meta.env.DEV
    ? lazy(() =>
        Promise.all([
          import("@tanstack/react-query-devtools"),
          import("@tanstack/react-router-devtools"),
        ]).then(([reactQuery, router]) => ({
          default: () => (
            <>
              <reactQuery.ReactQueryDevtools buttonPosition="bottom-left" />
              <router.TanStackRouterDevtools position="bottom-right" />
            </>
          ),
        })),
      )
    : () => null
