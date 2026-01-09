import type { Adapter } from "../../core/adapter"
import type { Options } from "../../core/options"
import { serveStaticHook } from "../../entry/serve-static"

export type NodeBuildOptions = {
  staticRoot?: string | undefined
  port?: number | undefined
  /**
   * Enable graceful shutdown on SIGINT and SIGTERM signals.
   * Set to a number to specify the timeout in milliseconds before forcing shutdown.
   * Set to 0 to wait indefinitely for connections to close.
   * Leave undefined to disable graceful shutdown.
   * @default undefined
   */
  shutdownTimeoutMs?: number | undefined
} & Options

const nodeAdapter = (options?: NodeBuildOptions): Adapter => {
  const port = options?.port ?? 3000
  const shutdownTimeoutMs = options?.shutdownTimeoutMs

  return {
    name: "node",
    entryContentBeforeHooks: [
      async (appName, hookOptions) => {
        let code = "import { serveStatic } from '@hono/node-server/serve-static'\n"
        code += serveStaticHook(appName, {
          filePaths: hookOptions?.staticPaths,
          root: options?.staticRoot,
        })
        return code
      },
    ],
    entryContentAfterHooks: [
      async (appName) => {
        let code = "import { serve } from '@hono/node-server'\n"
        if (shutdownTimeoutMs !== undefined) {
          code += `const server = serve({ fetch: ${appName}.fetch, port: ${port.toString()} })\n`
          code += "const gracefulShutdown = () => {\n"
          code += "  server.close(() => process.exit(0))\n"
          if (shutdownTimeoutMs > 0) {
            code += `  setTimeout(() => process.exit(1), ${shutdownTimeoutMs}).unref()\n`
          }
          code += "}\n"

          code += "process.on('SIGINT', gracefulShutdown)\n"

          code += "process.on('SIGTERM', gracefulShutdown)"
        } else {
          code += `serve({ fetch: ${appName}.fetch, port: ${port.toString()} })`
        }
        return code
      },
    ],
  }
}

export default nodeAdapter
