/**
 * This entry file is for Rolldown plugin.
 *
 * @module
 */

import { BuildPlugin } from "./index"

/**
 * Rolldown plugin
 *
 * @example
 * ```ts
 * // rolldown.config.js
 * import Build from '@newsnext/build/rolldown'
 *
 * export default {
 *   plugins: [Build()],
 * }
 * ```
 */
const rolldown = BuildPlugin.rolldown as typeof BuildPlugin.rolldown
export default rolldown
export { rolldown as "module.exports" }
