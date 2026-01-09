/**
 * This entry file is for Rspack plugin.
 *
 * @module
 */

import { BuildPlugin } from "./index"

/**
 * Rspack plugin
 *
 * @example
 * ```ts
 * // rspack.config.js
 * import Build from '@newsnext/build/rspack'
 *
 * module.exports = {
 *  plugins: [Build()],
 * }
 * ```
 */
const rspack = BuildPlugin.rspack as typeof BuildPlugin.rspack
export default rspack
export { rspack as "module.exports" }
