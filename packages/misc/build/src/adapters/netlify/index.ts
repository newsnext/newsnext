import type { Adapter } from "../../types"
import type { NetlifyFunctionsBuildOptions } from "./types"

/**
 * Netlify Functions adapter for Hono applications
 *
 * @param options - Adapter configuration options
 * @returns Adapter configuration
 *
 * @example
 * ```ts
 * import { buildPlugin } from '@newsnext/build'
 * import netlifyAdapter from '@newsnext/build/adapters/netlify'
 *
 * export default {
 *   plugins: [buildPlugin({
 *     adapter: netlifyAdapter()
 *   })]
 * }
 * ```
 */
export default function netlifyAdapter(
  options?: NetlifyFunctionsBuildOptions,
): Adapter {
  return {
    name: "netlify-functions",
    entryContentBeforeHooks: [() => "import { handle } from \"hono/netlify\""],
    entryContentAfterHooks: [() => "export const config = { path: \"/*\", preferStatic: true }"],
    entryContentDefaultExportHook: appName => `export default handle(${appName})`,
  }
}
