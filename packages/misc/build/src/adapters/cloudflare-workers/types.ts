import type { GetEntryContentOptions } from "../../entry"
import type { Options } from "../../types"

/**
 * Cloudflare Workers adapter options
 */
export type CloudflareWorkersBuildOptions = Options
  & Pick<GetEntryContentOptions, "entryContentAfterHooks" | "entryContentDefaultExportHook">
