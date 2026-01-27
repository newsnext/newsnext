import type { Adapter } from "../../types"
import type { BunBuildOptions } from "./types"
import { serveStaticHook } from "../../utils/serve-static"

/**
 * Bun adapter for Hono applications
 *
 * @param options - Adapter configuration options
 * @returns Adapter configuration
 *
 * @example
 * ```ts
 * import { buildPlugin } from '@newsnext/build'
 * import bunAdapter from '@newsnext/build/adapters/bun'
 *
 * export default {
 *   plugins: [buildPlugin({
 *     adapter: bunAdapter({ staticRoot: './' })
 *   })]
 * }
 * ```
 */
export default function bunAdapter(options?: BunBuildOptions): Adapter {
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
