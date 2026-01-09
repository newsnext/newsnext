/**
 * This entry file is for Rollup plugin.
 *
 * @module
 */

import { BuildPlugin } from "./index"

/**
 * Rollup plugin
 *
 * @example
 * ```ts
 * // rollup.config.js
 * import Build from '@newsnext/build/rollup'
 *
 * export default {
 *   plugins: [Build()],
 * }
 * ```
 */
const rollup = BuildPlugin.rollup as typeof BuildPlugin.rollup
export default rollup
export { rollup as "module.exports" }
