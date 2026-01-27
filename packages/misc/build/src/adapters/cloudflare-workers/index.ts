import type { Adapter } from "../../types"
import type { CloudflareWorkersBuildOptions } from "./types"

export const defaultOptions: CloudflareWorkersBuildOptions = {
  entryContentAfterHooks: [
    () => `
      const merged = {}
      const definedHandlers = new Set()
      for (const [file, app] of Object.entries(modules)) {
        for (const [key, handler] of Object.entries(app)) {
          if (key !== 'fetch') {
            if (definedHandlers.has(key)) {
              throw new Error(\`Handler "\${key}" is defined in multiple entry files. Please ensure each handler (except fetch) is defined only once.\`);
            }
            definedHandlers.add(key)
            merged[key] = handler
          }
        }
      }
    `,
  ],
  entryContentDefaultExportHook: appName =>
    `export default { ...merged, fetch: ${appName}.fetch }`,
}

/**
 * Cloudflare Workers adapter for Hono applications
 *
 * @param options - Adapter configuration options
 * @returns Adapter configuration
 *
 * @example
 * ```ts
 * import { buildPlugin } from '@newsnext/build'
 * import cloudflareWorkersAdapter from '@newsnext/build/adapters/cloudflare-workers'
 *
 * export default {
 *   plugins: [buildPlugin({
 *     adapter: cloudflareWorkersAdapter()
 *   })]
 * }
 * ```
 */
export default function cloudflareWorkersAdapter(options?: CloudflareWorkersBuildOptions): Adapter {
  return {
    name: "cloudflare-workers",
    entryContentAfterHooks:
      options?.entryContentAfterHooks ?? defaultOptions.entryContentAfterHooks,
    entryContentDefaultExportHook:
      options?.entryContentDefaultExportHook
      ?? defaultOptions.entryContentDefaultExportHook,
  }
}
