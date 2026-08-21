import { lazy } from "react"

export const TanStackDevtools
  = import.meta.env.DEV
    ? lazy(() =>
        Promise.all([
          import("@tanstack/react-devtools"),
          import("@tanstack/react-router-devtools"),
          import("@tanstack/react-query-devtools"),
          import("./background-devtools"),
        ]).then(([devtools, router, query, background]) => ({
          default: () => (
            <devtools.TanStackDevtools
              config={{
                defaultOpen: false,
                panelLocation: "bottom",
                position: "bottom-right",
                triggerMode: "fixed",
              }}
              plugins={[
                {
                  id: "newsnext-background",
                  name: "Background",
                  defaultOpen: true,
                  render: (_element, props) => (
                    <background.BackgroundDevtoolsPanel
                      devtoolsOpen={props.devtoolsOpen}
                      theme={props.theme}
                    />
                  ),
                },
                {
                  id: "tanstack-query",
                  name: "Query",
                  render: element => (
                    <query.ReactQueryDevtoolsPanel
                      shadowDOMTarget={getShadowRoot(element)}
                    />
                  ),
                },
                {
                  id: "tanstack-router",
                  name: "Router",
                  render: element => (
                    <router.TanStackRouterDevtoolsPanel
                      shadowDOMTarget={getShadowRoot(element)}
                    />
                  ),
                },
              ]}
            />
          ),
        })),
      )
    : () => null

function getShadowRoot(element: Element): ShadowRoot | undefined {
  const root = element.getRootNode()
  return root instanceof ShadowRoot ? root : undefined
}
