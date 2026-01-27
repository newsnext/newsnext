import type { Options } from "../../types"

/**
 * Bun adapter options
 */
export interface BunBuildOptions extends Options {
  staticRoot?: string | undefined
}
