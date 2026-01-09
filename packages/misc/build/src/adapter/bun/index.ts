import type { Adapter } from "../../core/adapter"
import type { Options } from "../../core/options"
import { serveStaticHook } from "../../entry/serve-static"

export type BunBuildOptions = {
  staticRoot?: string | undefined
} & Options

const bunAdapter = (options?: BunBuildOptions): Adapter => {
  return {
    name: "bun",
    entryContentBeforeHooks: [
      async (appName, hookOptions) => {
        let code = "import { serveStatic } from 'hono/bun'\n"
        code += serveStaticHook(appName, {
          filePaths: hookOptions?.staticPaths,
          root: options?.staticRoot,
        })
        return code
      },
    ],
  }
}

export default bunAdapter
