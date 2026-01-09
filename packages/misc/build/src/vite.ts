/**
 * This entry file is for Vite plugin.
 *
 * @module
 */

import { BuildPlugin } from "./index"

/**
 * Vite plugin
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import Build from '@newsnext/build/vite'
 *
 * export default defineConfig({
 *   plugins: [Build()],
 * })
 * ```
 */
const vite = BuildPlugin.vite as typeof BuildPlugin.vite
export default vite
export { vite as "module.exports" }
