import type { Adapter } from "../../core/adapter"
import type { Options } from "../../core/options"
import { serveStaticHook } from "../../entry/serve-static"

export type DenoBuildOptions = {
  staticRoot?: string | undefined
} & Options

const denoAdapter = (options?: DenoBuildOptions): Adapter => {
  return {
    name: "deno",
    entryContentBeforeHooks: [
      async (appName, hookOptions) => {
        let code = "import { serveStatic } from 'hono/deno'\n"
        code += serveStaticHook(appName, {
          filePaths: hookOptions?.staticPaths,
          root: options?.staticRoot,
        })
        return code
      },
    ],
  }
}

export default denoAdapter
