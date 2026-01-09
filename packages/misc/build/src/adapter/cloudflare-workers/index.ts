import type { Adapter } from "../../core/adapter"
import type { Options } from "../../core/options"
import type { GetEntryContentOptions } from "../../entry"

export type CloudflareWorkersBuildOptions = Options
  & Pick<GetEntryContentOptions, "entryContentAfterHooks" | "entryContentDefaultExportHook">

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

const cloudflareWorkersAdapter = (options?: CloudflareWorkersBuildOptions): Adapter => {
  return {
    name: "cloudflare-workers",
    entryContentAfterHooks:
      options?.entryContentAfterHooks ?? defaultOptions.entryContentAfterHooks,
    entryContentDefaultExportHook:
      options?.entryContentDefaultExportHook
      ?? defaultOptions.entryContentDefaultExportHook,
  }
}

export default cloudflareWorkersAdapter
