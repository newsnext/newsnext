import type { PlaygroundMountArgs } from "react-cosmos-ui/dist/playgroundConfig.js"
import { mountDomRenderer } from "react-cosmos-plugin-vite/dist/dom.js"
import playgroundUrl from "react-cosmos-ui/dist/playground.bundle.js?url"
import { browser } from "wxt/browser"
import { COSMOS_FIXTURES } from "@/cosmos/fixtures"

declare global {
  interface Window {
    mountPlayground?: (args: PlaygroundMountArgs) => Promise<void>
  }
}

async function mountRenderer(): Promise<void> {
  await import("@/styles/cosmos.css")

  mountDomRenderer({
    rendererConfig: {
      webSocketUrl: null,
      rendererUrl: null,
      containerQuerySelector: "#root",
    },
    moduleWrappers: {
      lazy: true,
      fixtures: Object.fromEntries(
        COSMOS_FIXTURES.map(fixture => [fixture.path, { getModule: fixture.load }]),
      ),
      decorators: {
        "src/cosmos.decorator.tsx": {
          getModule: () => import("@/cosmos.decorator"),
        },
      },
    },
  })
}

async function loadPlayground(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script")
    script.src = playgroundUrl
    script.addEventListener("load", () => resolve(), { once: true })
    script.addEventListener("error", () => reject(new Error("Failed to load React Cosmos UI")), { once: true })
    document.head.append(script)
  })

  if (!window.mountPlayground) {
    throw new Error("React Cosmos UI did not expose mountPlayground")
  }

  await window.mountPlayground({
    playgroundConfig: {
      core: {
        projectId: "@newsnext/extension",
        fixturesDir: "__fixtures__",
        fixtureFileSuffix: "fixture",
        devServerOn: false,
      },
      rendererCore: {
        fixtures: Object.fromEntries(
          COSMOS_FIXTURES.map(fixture => [fixture.path, fixture.rendererFixture]),
        ),
        rendererUrl: browser.runtime.getURL("/cosmos.html"),
      },
    },
    pluginConfigs: [],
  })
}

if (window.parent === window) {
  void loadPlayground()
} else {
  void mountRenderer()
}
