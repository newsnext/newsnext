import type { Options } from "../../types"
import type { GetEntryContentOptions } from "../../entry"

/**
 * Cloudflare Workers adapter options
 */
export type CloudflareWorkersBuildOptions = Options
  & Pick<GetEntryContentOptions, "entryContentAfterHooks" | "entryContentDefaultExportHook">
